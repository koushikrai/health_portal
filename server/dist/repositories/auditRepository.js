"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditRepository = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class AuditRepository {
    static async create(data) {
        return prisma_1.default.auditLog.create({
            data: {
                userId: data.userId,
                actorName: data.actorName,
                role: data.role,
                action: data.action,
                entityType: data.entityType,
                entityId: data.entityId,
                details: data.details
            }
        });
    }
    static async list(limit = 100) {
        return prisma_1.default.auditLog.findMany({
            take: Math.min(limit, 200),
            orderBy: { timestamp: 'desc' }
        });
    }
    static async count() {
        return prisma_1.default.auditLog.count();
    }
}
exports.AuditRepository = AuditRepository;
