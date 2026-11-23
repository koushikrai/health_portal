"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class UserRepository {
    static async findById(id) {
        return prisma_1.default.user.findUnique({
            where: { id },
            include: { vendor: true }
        });
    }
    static async findByUsername(username) {
        return prisma_1.default.user.findUnique({
            where: { username: username.toLowerCase() },
            include: { vendor: true }
        });
    }
    static async findFirstByRole(role, vendorId) {
        const where = { role, isActive: true };
        if (vendorId)
            where.vendorId = vendorId;
        let user = await prisma_1.default.user.findFirst({ where, include: { vendor: true } });
        if (!user) {
            user = await prisma_1.default.user.findFirst({ where: { role }, include: { vendor: true } });
        }
        return user;
    }
    static async listAll() {
        return prisma_1.default.user.findMany({
            include: { vendor: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async listAllWithCounts() {
        return prisma_1.default.user.findMany({
            include: {
                vendor: true,
                _count: {
                    select: { requests: true, auditLogs: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
    static async create(data) {
        return prisma_1.default.user.create({
            data: {
                ...data,
                username: data.username.toLowerCase().trim()
            },
            include: { vendor: true }
        });
    }
    static async update(id, data) {
        return prisma_1.default.user.update({
            where: { id },
            data,
            include: { vendor: true }
        });
    }
    static async delete(id) {
        return prisma_1.default.user.delete({ where: { id } });
    }
    static async count(where) {
        return prisma_1.default.user.count({ where });
    }
    static async groupByRole() {
        return prisma_1.default.user.groupBy({
            by: ['role'],
            _count: { id: true }
        });
    }
}
exports.UserRepository = UserRepository;
