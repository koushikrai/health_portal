import { Request, Response } from 'express';
import prisma from '../prisma';
import { InvoiceStatus } from '@prisma/client';
import { InvoiceService } from '../services/invoiceService';
import { AuditService } from '../services/auditService';

export class InvoicesController {
  static async list(req: Request, res: Response) {
    try {
      const { status, vendorId } = req.query;
      const where: any = {};

      if (status && status !== 'ALL') {
        where.status = status as InvoiceStatus;
      }
      // Vendor isolation: Clinics can only query their own invoices
      if (req.user?.role === 'CLINIC' && req.user.vendorId) {
        where.vendorId = req.user.vendorId;
      } else if (vendorId) {
        where.vendorId = vendorId as string;
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          vendor: true,
          lineItems: {
            include: {
              request: {
                include: { employee: true, test: true }
              }
            }
          }
        },
        orderBy: { invoiceDate: 'desc' }
      });

      return res.json({ invoices });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async submit(req: Request, res: Response) {
    try {
      const { invoiceNo, vendorId, requestIds, fileUrl } = req.body;
      if (!invoiceNo || !vendorId || !Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ error: 'invoiceNo, vendorId, and requestIds array required' });
      }

      // Guardrail: Clinics can only submit invoices for their own facility
      const effectiveVendorId = (req.user?.role === 'CLINIC' && req.user.vendorId) ? req.user.vendorId : vendorId;
      if (req.user?.role === 'CLINIC' && req.user.vendorId && vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: You can only submit invoices for your assigned medical center' });
      }

      // Fetch completed requests
      const requests = await prisma.medicalRequest.findMany({
        where: {
          id: { in: requestIds },
          vendorId: effectiveVendorId,
          status: 'COMPLETED'
        },
        include: { test: true }
      });

      if (requests.length === 0) {
        return res.status(400).json({ error: 'No billable completed requests found' });
      }

      // Fetch active contract rates
      const contract = await prisma.contract.findFirst({
        where: { vendorId: effectiveVendorId },
        include: { rates: true },
        orderBy: { createdAt: 'desc' }
      });

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

      const invCount = await prisma.invoice.count();
      const invId = `INV-${String(invCount + 31).padStart(4, '0')}`;

      const invoice = await prisma.invoice.create({
        data: {
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
        },
        include: { vendor: true, lineItems: true }
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

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CLEARED,
          sesReference: sesReference || `SES-${Math.floor(10000 + Math.random() * 90000)}`,
          reviewNotes: reviewNotes || '3-Way Match Verified & Approved for Payment',
          reviewedAt: new Date(),
          reviewedById: req.user?.id
        },
        include: { vendor: true }
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

      const invoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.REJECTED,
          reviewNotes: reason || 'Price rate variance detected in 3-way match',
          reviewedAt: new Date(),
          reviewedById: req.user?.id
        },
        include: { vendor: true }
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
