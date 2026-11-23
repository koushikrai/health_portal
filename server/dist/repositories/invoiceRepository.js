"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class InvoiceRepository {
    static async findById(id) {
        return prisma_1.default.invoice.findUnique({
            where: { id },
            include: {
                vendor: true,
                lineItems: {
                    include: {
                        request: {
                            include: { employee: true, test: true, report: true }
                        }
                    }
                }
            }
        });
    }
    static async list(params) {
        const { status, vendorId } = params;
        const where = {};
        if (status && status !== 'ALL') {
            where.status = status;
        }
        if (vendorId && vendorId !== 'ALL') {
            where.vendorId = vendorId;
        }
        return prisma_1.default.invoice.findMany({
            where,
            include: {
                vendor: true,
                lineItems: {
                    include: {
                        request: {
                            include: { employee: true, test: true, report: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async create(data) {
        return prisma_1.default.invoice.create({
            data,
            include: {
                vendor: true,
                lineItems: { include: { request: true } }
            }
        });
    }
    static async update(id, data) {
        return prisma_1.default.invoice.update({
            where: { id },
            data,
            include: { vendor: true }
        });
    }
    static async count(where) {
        return prisma_1.default.invoice.count({ where });
    }
    static async aggregateSum(where) {
        return prisma_1.default.invoice.aggregate({
            where,
            _sum: { totalAmount: true }
        });
    }
}
exports.InvoiceRepository = InvoiceRepository;
