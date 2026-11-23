"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class ReportRepository {
    static async findByIdOrRequestId(id) {
        return prisma_1.default.medicalReport.findFirst({
            where: {
                OR: [{ id }, { requestId: id }]
            },
            include: {
                employee: true,
                test: true,
                vendor: true,
                request: true
            }
        });
    }
    static async findByRequestId(requestId) {
        return prisma_1.default.medicalReport.findUnique({
            where: { requestId }
        });
    }
    static async list(params) {
        const { result, vendorId, search } = params;
        const where = {};
        if (result && result !== 'ALL') {
            where.result = result;
        }
        if (vendorId && vendorId !== 'ALL') {
            where.vendorId = vendorId;
        }
        if (search && search.trim()) {
            const q = search.trim();
            where.OR = [
                { id: { contains: q, mode: 'insensitive' } },
                { employee: { name: { contains: q, mode: 'insensitive' } } },
                { employee: { employeeNo: { contains: q, mode: 'insensitive' } } },
                { employee: { iqamaId: { contains: q, mode: 'insensitive' } } },
                { test: { name: { contains: q, mode: 'insensitive' } } }
            ];
        }
        return prisma_1.default.medicalReport.findMany({
            where,
            include: {
                employee: true,
                test: true,
                vendor: true,
                request: true
            },
            orderBy: { testDate: 'desc' }
        });
    }
    static async upsert(requestId, createData, updateData) {
        return prisma_1.default.medicalReport.upsert({
            where: { requestId },
            update: updateData,
            create: createData,
            include: { employee: true, test: true, vendor: true }
        });
    }
    static async count(where) {
        return prisma_1.default.medicalReport.count({ where });
    }
}
exports.ReportRepository = ReportRepository;
