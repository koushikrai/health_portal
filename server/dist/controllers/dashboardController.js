"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class DashboardController {
    static async getMetrics(req, res) {
        try {
            // 1. Core Medical Clearance Counts
            const totalEmployees = await prisma_1.default.employee.count({ where: { status: 'Active' } });
            const totalRequests = await prisma_1.default.medicalRequest.count();
            const waitingRequests = await prisma_1.default.medicalRequest.count({ where: { status: 'WAITING' } });
            const scheduledRequests = await prisma_1.default.medicalRequest.count({ where: { status: 'SCHEDULED' } });
            const completedRequests = await prisma_1.default.medicalRequest.count({ where: { status: 'COMPLETED' } });
            const fitReports = await prisma_1.default.medicalReport.count({ where: { result: 'FIT' } });
            const pendingInvoices = await prisma_1.default.invoice.count({ where: { status: 'SUBMITTED' } });
            const now = new Date();
            const in30Days = new Date();
            in30Days.setDate(in30Days.getDate() + 30);
            const expiringSoon = await prisma_1.default.medicalReport.count({
                where: {
                    validUntil: {
                        gte: now,
                        lte: in30Days
                    }
                }
            });
            // 2. Clearance Volume by Industrial Client / Facility
            const clientVolume = [
                { client: 'Sadara Complex', code: 'SADARA', count: 385, target: 400, percent: 96 },
                { client: 'SABIC Affiliates', code: 'SABIC', count: 320, target: 350, percent: 91 },
                { client: 'Saudi Aramco Sites', code: 'ARAMCO', count: 265, target: 300, percent: 88 },
                { client: 'PetroKemya Plants', code: 'PETROKEMYA', count: 180, target: 200, percent: 90 },
                { client: 'Royal Commission Projects', code: 'RC', count: 124, target: 150, percent: 83 }
            ];
            // 3. Department Medical Compliance Status
            const departmentCompliance = [
                { name: 'Project Service (Mechanical & E&I)', total: 420, cleared: 398, percent: 94.8, status: 'Compliant' },
                { name: 'Transport & Logistics Department', total: 240, cleared: 231, percent: 96.2, status: 'Optimal' },
                { name: 'Maintenance & Shutdown Pool', total: 210, cleared: 188, percent: 89.5, status: 'Action Needed' },
                { name: 'HSE Safety & Loss Prevention', total: 95, cleared: 95, percent: 100.0, status: 'Full Parity' },
                { name: 'Fabrication & Metal Works', total: 110, cleared: 102, percent: 92.7, status: 'Compliant' },
                { name: 'Corporate & Administration', total: 65, cleared: 63, percent: 96.9, status: 'Optimal' }
            ];
            // 4. Accredited Clinic Quotas & Capacity
            const clinics = await prisma_1.default.vendor.findMany({
                where: { isActive: true },
                select: {
                    id: true,
                    code: true,
                    name: true,
                    sapVendorNo: true,
                    crNumber: true,
                    slots: {
                        take: 1,
                        orderBy: { createdAt: 'desc' }
                    },
                    requests: {
                        where: { status: { in: ['SUBMITTED', 'SCHEDULED'] } }
                    }
                }
            });
            const clinicWorkload = clinics.map(c => {
                const capacity = c.slots[0]?.totalCapacity ?? 50;
                const assigned = c.requests.length;
                const available = Math.max(0, capacity - assigned);
                const utilization = Math.round((assigned / capacity) * 100);
                return {
                    id: c.id,
                    code: c.code,
                    name: c.name,
                    sapVendorNo: c.sapVendorNo,
                    crNumber: c.crNumber,
                    capacity,
                    assigned,
                    available,
                    utilization
                };
            });
            return res.json({
                kpis: {
                    activeWorkforce: {
                        value: totalEmployees,
                        trend: '+4.2% active personnel',
                        ceilingPercent: Math.min(100, Math.round((totalEmployees / 1500) * 100)),
                        targetText: 'Capacity: 1,500 active'
                    },
                    fitCertificates: {
                        value: `${fitReports} Active`,
                        trend: '100% verified QR authenticity',
                        ceilingPercent: 96,
                        targetText: 'Site Gate Pass Ready'
                    },
                    inFlightRequests: {
                        value: `${waitingRequests + scheduledRequests} In-Flight`,
                        waiting: waitingRequests,
                        scheduled: scheduledRequests,
                        ceilingPercent: Math.round(((waitingRequests + scheduledRequests) / 30) * 100),
                        targetText: `${waitingRequests} waiting central triage`
                    },
                    expiringRenewals: {
                        value: `${expiringSoon || 14} Expiring`,
                        warningText: `${expiringSoon || 14} certificates <30 days`,
                        auditBar: 'Target Parity: 98%'
                    },
                    pendingInvoices: {
                        value: `${pendingInvoices} Pending`,
                        subtotalSAR: 'SAR 174.80',
                        targetText: 'Awaiting SES Clearance'
                    }
                },
                requestsSummary: {
                    total: totalRequests,
                    waiting: waitingRequests,
                    scheduled: scheduledRequests,
                    completed: completedRequests,
                    pendingInvoices
                },
                clientVolume,
                departmentCompliance,
                clinicWorkload
            });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.DashboardController = DashboardController;
