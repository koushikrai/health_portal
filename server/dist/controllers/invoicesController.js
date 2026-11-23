"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesController = void 0;
const client_1 = require("@prisma/client");
const invoiceService_1 = require("../services/invoiceService");
const auditService_1 = require("../services/auditService");
const invoiceRepository_1 = require("../repositories/invoiceRepository");
const requestRepository_1 = require("../repositories/requestRepository");
const masterRepository_1 = require("../repositories/masterRepository");
class InvoicesController {
    static async list(req, res) {
        try {
            const { status, vendorId } = req.query;
            const effectiveVendorId = req.user?.role === 'CLINIC'
                ? (req.user.vendorId || '__NO_VENDOR__')
                : vendorId;
            const invoices = await invoiceRepository_1.InvoiceRepository.list({
                status: status,
                vendorId: effectiveVendorId
            });
            return res.json({ invoices });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async submit(req, res) {
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
            const requests = await requestRepository_1.RequestRepository.findBillableCompleted(requestIds, effectiveVendorId);
            if (requests.length === 0) {
                return res.status(400).json({ error: 'No billable completed requests found' });
            }
            // Fetch active contract rates via Data Tier
            const contract = await masterRepository_1.MasterRepository.findLatestContractByVendor(effectiveVendorId);
            const rateMap = {};
            if (contract) {
                for (const r of contract.rates)
                    rateMap[r.testId] = Number(r.rate);
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
            const invCount = await invoiceRepository_1.InvoiceRepository.count();
            const invId = `INV-${String(invCount + 31).padStart(4, '0')}`;
            const invoice = await invoiceRepository_1.InvoiceRepository.create({
                id: invId,
                invoiceNo,
                vendorId: effectiveVendorId,
                invoiceDate: new Date(),
                subtotal,
                vatAmount,
                totalAmount,
                status: client_1.InvoiceStatus.SUBMITTED,
                fileUrl: fileUrl || `${invoiceNo}.pdf`,
                lineItems: {
                    create: lineData
                }
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Clinic',
                role: req.user?.role || 'CLINIC',
                action: 'SUBMIT_INVOICE',
                entityType: 'Invoice',
                entityId: invoice.id,
                details: `Clinic submitted invoice ${invoiceNo} (SAR ${totalAmount}) for ${requests.length} tests.`
            });
            return res.status(201).json({ invoice });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async audit(req, res) {
        try {
            const { id } = req.params;
            const auditResult = await invoiceService_1.InvoiceService.auditInvoice(id);
            return res.json(auditResult);
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async clear(req, res) {
        try {
            const { id } = req.params;
            const { sesReference, reviewNotes } = req.body;
            const invoice = await invoiceRepository_1.InvoiceRepository.update(id, {
                status: client_1.InvoiceStatus.CLEARED,
                sesReference: sesReference ? String(sesReference).trim() : `SES-${id.replace(/[^0-9]/g, '') || Date.now()}`,
                reviewNotes: reviewNotes || '3-Way Match Verified & Approved for Payment',
                reviewedAt: new Date(),
                reviewedById: req.user?.id
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Finance Controller',
                role: req.user?.role || 'FINANCE',
                action: 'CLEAR_INVOICE',
                entityType: 'Invoice',
                entityId: invoice.id,
                details: `Finance cleared invoice ${invoice.invoiceNo} (SES: ${invoice.sesReference}) for SAR ${invoice.totalAmount}`
            });
            return res.json({ invoice });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async reject(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const invoice = await invoiceRepository_1.InvoiceRepository.update(id, {
                status: client_1.InvoiceStatus.REJECTED,
                reviewNotes: reason || 'Price rate variance detected in 3-way match',
                reviewedAt: new Date(),
                reviewedById: req.user?.id
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Finance Controller',
                role: req.user?.role || 'FINANCE',
                action: 'REJECT_INVOICE',
                entityType: 'Invoice',
                entityId: invoice.id,
                details: `Finance rejected invoice ${invoice.invoiceNo}. Reason: ${reason || 'N/A'}`
            });
            return res.json({ invoice });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.InvoicesController = InvoicesController;
