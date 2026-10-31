"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoicesController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const client_1 = require("@prisma/client");
const invoiceService_1 = require("../services/invoiceService");
const auditService_1 = require("../services/auditService");
class InvoicesController {
    static async list(req, res) {
        try {
            const { status, vendorId } = req.query;
            const where = {};
            if (status && status !== 'ALL') {
                where.status = status;
            }
            // Vendor isolation: Clinics can only query their own invoices
            if (req.user?.role === 'CLINIC' && req.user.vendorId) {
                where.vendorId = req.user.vendorId;
            }
            else if (vendorId) {
                where.vendorId = vendorId;
            }
            const invoices = await prisma_1.default.invoice.findMany({
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
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async submit(req, res) {
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
            const requests = await prisma_1.default.medicalRequest.findMany({
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
            const contract = await prisma_1.default.contract.findFirst({
                where: { vendorId: effectiveVendorId },
                include: { rates: true },
                orderBy: { createdAt: 'desc' }
            });
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
            const invCount = await prisma_1.default.invoice.count();
            const invId = `INV-${String(invCount + 31).padStart(4, '0')}`;
            const invoice = await prisma_1.default.invoice.create({
                data: {
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
                },
                include: { vendor: true, lineItems: true }
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
            const invoice = await prisma_1.default.invoice.update({
                where: { id },
                data: {
                    status: client_1.InvoiceStatus.CLEARED,
                    sesReference: sesReference || `SES-${Math.floor(10000 + Math.random() * 90000)}`,
                    reviewNotes: reviewNotes || '3-Way Match Verified & Approved for Payment',
                    reviewedAt: new Date(),
                    reviewedById: req.user?.id
                },
                include: { vendor: true }
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
            const invoice = await prisma_1.default.invoice.update({
                where: { id },
                data: {
                    status: client_1.InvoiceStatus.REJECTED,
                    reviewNotes: reason || 'Price rate variance detected in 3-way match',
                    reviewedAt: new Date(),
                    reviewedById: req.user?.id
                },
                include: { vendor: true }
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
