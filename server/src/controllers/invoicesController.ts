import { Request, Response } from 'express';
import { InvoiceStatus } from '@prisma/client';
import { InvoiceService } from '../services/invoiceService';
import { AuditService } from '../services/auditService';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { RequestRepository } from '../repositories/requestRepository';
import { MasterRepository } from '../repositories/masterRepository';

export class InvoicesController {
  static async list(req: Request, res: Response) {
    try {
      const { status, vendorId } = req.query;
      const effectiveVendorId = req.user?.role === 'CLINIC'
        ? (req.user.vendorId || '__NO_VENDOR__')
        : (vendorId as string);

      const invoices = await InvoiceRepository.list({
        status: status as string,
        vendorId: effectiveVendorId
      });

      return res.json({ invoices });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const { invoiceNo: bodyInvoiceNo, invoiceNumber, vendorId, requestIds, fileUrl } = req.body;
      const invoiceNo = bodyInvoiceNo || invoiceNumber;
      if (!invoiceNo || !vendorId || !Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ error: 'invoiceNo, vendorId, and requestIds array required' });
      }

      // Facility vendor ID guardrail
      let effectiveVendorId = vendorId;
      if (req.user?.role === 'CLINIC') {
        if (req.user.vendorId && vendorId && vendorId !== req.user.vendorId) {
          return res.status(403).json({ error: 'Forbidden: Cannot submit invoice for another clinic' });
        }
        effectiveVendorId = req.user.vendorId || vendorId;
      }

      // Fetch completed requests via Data Tier
      const requests = await RequestRepository.findBillableCompleted(requestIds, effectiveVendorId);

      if (requests.length === 0) {
        return res.status(400).json({ error: 'No billable completed requests found' });
      }

      // Fetch active contract rates via Data Tier
      const contract = await MasterRepository.findLatestContractByVendor(effectiveVendorId);

      const rateMap: Record<string, number> = {};
      if (contract) {
        for (const r of contract.rates) rateMap[r.testId] = Number(r.rate);
      }

      let subtotal = 0;
      const lineData = requests.map(r => {
        const rate = rateMap[r.testId] || 100.0;
        subtotal += rate;
        return {
          requestId: r.id,
          contractRate: rate,
          billedRate: rate
        };
      });

      const vatAmount = Number((subtotal * 0.15).toFixed(2));
      const totalAmount = Number((subtotal + vatAmount).toFixed(2));

      const invCount = await InvoiceRepository.count();
      const invId = `INV-${String(invCount + 31).padStart(4, '0')}`;

      const invoice = await InvoiceRepository.create({
        id: invId,
        invoiceNo,
        vendorId: effectiveVendorId,
        invoiceDate: new Date(),
        subtotal,
        vatAmount,
        totalAmount,
        status: InvoiceStatus.SUBMITTED,
        fileUrl: fileUrl || `${invoiceNo}.pdf`,
        lineItems: {
          create: lineData
        }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Clinic',
        role: req.user?.role || 'CLINIC',
        action: 'SUBMIT_INVOICE',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: `Clinic submitted invoice ${invoiceNo} (SAR ${totalAmount}) for ${requests.length} tests.`
      });

      return res.status(201).json({ invoice });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async audit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const auditResult = await InvoiceService.auditInvoice(id);
      return res.json(auditResult);
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async clear(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { sesReference, reviewNotes } = req.body;

      const invoice = await InvoiceRepository.update(id, {
        status: InvoiceStatus.CLEARED,
        sesReference: sesReference ? String(sesReference).trim() : `SES-${id.replace(/[^0-9]/g, '') || Date.now()}`,
        reviewNotes: reviewNotes || '3-Way Match Verified & Approved for Payment',
        reviewedAt: new Date(),
        reviewedById: req.user?.id
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Finance Controller',
        role: req.user?.role || 'FINANCE',
        action: 'CLEAR_INVOICE',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: `Finance cleared invoice ${invoice.invoiceNo} (SES: ${invoice.sesReference}) for SAR ${invoice.totalAmount}`
      });

      return res.json({ invoice });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const invoice = await InvoiceRepository.update(id, {
        status: InvoiceStatus.REJECTED,
        reviewNotes: reason || 'Price rate variance detected in 3-way match',
        reviewedAt: new Date(),
        reviewedById: req.user?.id
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Finance Controller',
        role: req.user?.role || 'FINANCE',
        action: 'REJECT_INVOICE',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: `Finance rejected invoice ${invoice.invoiceNo}. Reason: ${reason || 'N/A'}`
      });

      return res.json({ invoice });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
