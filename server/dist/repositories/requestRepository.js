"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const client_1 = require("@prisma/client");
class RequestRepository {
    static async findById(id) {
        return prisma_1.default.medicalRequest.findUnique({
            where: { id },
            include: {
                employee: true,
                test: true,
                vendor: true,
                report: true
            }
        });
    }
    static async findManyByIds(ids) {
        return prisma_1.default.medicalRequest.findMany({
            where: { id: { in: ids } }
        });
    }
    static async findBillableCompleted(ids, vendorId) {
        return prisma_1.default.medicalRequest.findMany({
            where: {
                id: { in: ids },
                vendorId,
                status: client_1.RequestStatus.COMPLETED
            },
            include: { test: true }
        });
    }
    static async findLatestActiveForEmployee(employeeId) {
        return prisma_1.default.medicalRequest.findFirst({
            where: {
                employeeId,
                status: { in: [client_1.RequestStatus.WAITING, client_1.RequestStatus.SUBMITTED, client_1.RequestStatus.SCHEDULED] }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async findLatestForEmployee(employeeId) {
        return prisma_1.default.medicalRequest.findFirst({
            where: { employeeId },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async findAllWithDetails() {
        return prisma_1.default.medicalRequest.findMany({
            include: {
                employee: true,
                test: true,
                vendor: true,
                report: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async findRequestsWithClientFields() {
        return prisma_1.default.medicalRequest.findMany({
            select: { department: true, test: { select: { name: true } }, note: true }
        });
    }
    static async groupByTestId() {
        return prisma_1.default.medicalRequest.groupBy({
            by: ['testId'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } }
        });
    }
    static async findRequestsForSlotIds(slotReqIds) {
        if (slotReqIds.length === 0)
            return [];
        return prisma_1.default.medicalRequest.findMany({
            where: {
                OR: [
                    ...slotReqIds.map(id => ({ id: { startsWith: `${id}-` } })),
                    ...slotReqIds.map(id => ({ note: { contains: id } }))
                ]
            },
            select: {
                id: true,
                vendorId: true,
                note: true
            }
        });
    }
    static async findRequestsForSlot(slotId, includeDetails = false) {
        return prisma_1.default.medicalRequest.findMany({
            where: {
                OR: [
                    { id: { startsWith: `${slotId}-` } },
                    { note: { contains: slotId } }
                ]
            },
            include: includeDetails ? {
                employee: true,
                vendor: true,
                test: true,
                report: true
            } : undefined,
            orderBy: { createdAt: 'desc' }
        });
    }
    static async list(params) {
        const { status, vendorId, search } = params;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (vendorId && vendorId !== 'ALL') {
            if (vendorId === 'UNASSIGNED' || vendorId === 'NONE') {
                where.vendorId = null;
            }
            else {
                where.vendorId = vendorId;
            }
        }
        if (search && search.trim()) {
            const q = search.trim();
            where.OR = [
                { id: { contains: q, mode: 'insensitive' } },
                { employee: { name: { contains: q, mode: 'insensitive' } } },
                { employee: { employeeNo: { contains: q, mode: 'insensitive' } } },
                { employee: { iqamaId: { contains: q, mode: 'insensitive' } } },
                { department: { contains: q, mode: 'insensitive' } },
                { vendor: { name: { contains: q, mode: 'insensitive' } } },
                { vendor: { code: { contains: q, mode: 'insensitive' } } }
            ];
        }
        return prisma_1.default.medicalRequest.findMany({
            where,
            include: {
                employee: true,
                test: true,
                vendor: true,
                report: true,
                invoiceItems: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async create(data) {
        return prisma_1.default.medicalRequest.create({
            data,
            include: { employee: true, test: true, vendor: true }
        });
    }
    static async update(id, data) {
        return prisma_1.default.medicalRequest.update({
            where: { id },
            data,
            include: { employee: true, test: true, vendor: true, report: true }
        });
    }
    static async updateMany(ids, data) {
        return prisma_1.default.medicalRequest.updateMany({
            where: { id: { in: ids } },
            data
        });
    }
    static async deleteById(id) {
        return prisma_1.default.medicalRequest.delete({
            where: { id }
        });
    }
    static async count(where) {
        return prisma_1.default.medicalRequest.count({ where });
    }
    static async getNextRequestId() {
        const allReqs = await prisma_1.default.medicalRequest.findMany({
            where: { id: { startsWith: 'MR-2026-' } },
            select: { id: true }
        });
        let maxNum = 140;
        for (const r of allReqs) {
            const parts = r.id.split('-');
            if (parts.length === 3) {
                const n = parseInt(parts[2], 10);
                if (!isNaN(n) && n > maxNum) {
                    maxNum = n;
                }
            }
        }
        return `MR-2026-${String(maxNum + 1).padStart(4, '0')}`;
    }
}
exports.RequestRepository = RequestRepository;
