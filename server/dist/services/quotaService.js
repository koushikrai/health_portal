"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotaService = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class QuotaService {
    static async getClinicCapacity(vendorId) {
        const now = new Date();
        // Find active slot window
        const activeSlot = await prisma_1.default.clinicSlot.findFirst({
            where: {
                vendorId,
                startDate: { lte: now },
                endDate: { gte: now }
            },
            orderBy: { createdAt: 'desc' }
        });
        const totalCapacity = activeSlot ? activeSlot.totalCapacity : 50;
        // Count open/scheduled requests assigned to this clinic
        const assignedCount = await prisma_1.default.medicalRequest.count({
            where: {
                vendorId,
                status: { in: ['SUBMITTED', 'SCHEDULED'] }
            }
        });
        const availableSlots = Math.max(0, totalCapacity - assignedCount);
        return {
            vendorId,
            totalCapacity,
            assignedCount,
            availableSlots,
            utilizationPercent: totalCapacity > 0 ? Math.round((assignedCount / totalCapacity) * 100) : 0,
            hasCapacity: availableSlots > 0
        };
    }
    static async getAllClinicsCapacity() {
        const clinics = await prisma_1.default.vendor.findMany({
            where: { isActive: true }
        });
        const capacities = await Promise.all(clinics.map(c => this.getClinicCapacity(c.id)));
        return capacities;
    }
}
exports.QuotaService = QuotaService;
