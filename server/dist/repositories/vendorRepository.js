"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendorRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class VendorRepository {
    static async findById(id) {
        return prisma_1.default.vendor.findUnique({
            where: { id },
            include: {
                contracts: { include: { rates: { include: { test: true } } } },
                slots: true
            }
        });
    }
    static async findByCode(code) {
        return prisma_1.default.vendor.findFirst({
            where: { code }
        });
    }
    static async listAll() {
        return prisma_1.default.vendor.findMany({
            orderBy: { code: 'asc' }
        });
    }
    static async listAllIds() {
        return prisma_1.default.vendor.findMany({
            select: { id: true }
        });
    }
    static async listActive() {
        return prisma_1.default.vendor.findMany({
            where: { isActive: true },
            include: {
                contracts: {
                    include: {
                        rates: { include: { test: true } }
                    }
                }
            },
            orderBy: { code: 'asc' }
        });
    }
    static async listActiveWithSlotAllocations() {
        return prisma_1.default.vendor.findMany({
            where: { isActive: true },
            include: {
                slotAllocations: {
                    include: {
                        slotRequest: {
                            include: { test: true }
                        }
                    }
                }
            },
            orderBy: { code: 'asc' }
        });
    }
    static async listWithSlotsAndRequests() {
        return prisma_1.default.vendor.findMany({
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
    }
    static async create(data) {
        return prisma_1.default.vendor.create({ data });
    }
    static async update(id, data) {
        return prisma_1.default.vendor.update({
            where: { id },
            data
        });
    }
    static async delete(id) {
        await prisma_1.default.contractRate.deleteMany({ where: { contract: { vendorId: id } } });
        await prisma_1.default.contract.deleteMany({ where: { vendorId: id } });
        await prisma_1.default.slotAllocation.deleteMany({ where: { vendorId: id } });
        await prisma_1.default.clinicSlot.deleteMany({ where: { vendorId: id } });
        return prisma_1.default.vendor.delete({ where: { id } });
    }
    static async count(where) {
        return prisma_1.default.vendor.count({ where });
    }
}
exports.VendorRepository = VendorRepository;
