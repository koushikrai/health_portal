"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class SlotRepository {
    static async findById(id) {
        return prisma_1.default.slotRequest.findUnique({
            where: { id },
            include: {
                test: true,
                allocations: {
                    include: { vendor: true }
                }
            }
        });
    }
    static async list() {
        return prisma_1.default.slotRequest.findMany({
            include: {
                test: true,
                allocations: {
                    include: { vendor: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async listOrderByIdDesc() {
        return prisma_1.default.slotRequest.findMany({
            include: {
                test: true,
                allocations: {
                    include: { vendor: true }
                }
            },
            orderBy: { id: 'desc' }
        });
    }
    static async listAllIds() {
        return prisma_1.default.slotRequest.findMany({
            select: { id: true }
        });
    }
    static async create(data) {
        return prisma_1.default.slotRequest.create({
            data,
            include: {
                test: true,
                allocations: {
                    include: { vendor: true }
                }
            }
        });
    }
    static async update(id, data) {
        return prisma_1.default.slotRequest.update({
            where: { id },
            data,
            include: {
                test: true,
                allocations: {
                    include: { vendor: true }
                }
            }
        });
    }
    static async resetAllocationsForSlot(slotRequestId) {
        return prisma_1.default.slotAllocation.updateMany({
            where: { slotRequestId },
            data: { allocatedSlots: 0 }
        });
    }
    static async createAllocation(slotRequestId, vendorId, allocatedSlots) {
        return prisma_1.default.slotAllocation.create({
            data: {
                slotRequestId,
                vendorId,
                allocatedSlots
            }
        });
    }
    static async upsertAllocation(slotRequestId, vendorId, allocatedSlots) {
        return prisma_1.default.slotAllocation.upsert({
            where: {
                slotRequestId_vendorId: {
                    slotRequestId,
                    vendorId
                }
            },
            update: { allocatedSlots },
            create: {
                slotRequestId,
                vendorId,
                allocatedSlots
            }
        });
    }
    static async delete(id) {
        return prisma_1.default.slotRequest.delete({ where: { id } });
    }
    static async count() {
        return prisma_1.default.slotRequest.count();
    }
}
exports.SlotRepository = SlotRepository;
