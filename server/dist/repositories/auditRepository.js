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
        const logs = await prisma_1.default.auditLog.findMany({
            take: Math.min(limit, 200),
            orderBy: { timestamp: 'desc' }
        });
        const userEntityIds = Array.from(new Set(logs
            .filter(l => l.entityType === 'User' && l.entityId)
            .map(l => l.entityId)));
        let userMap = {};
        if (userEntityIds.length > 0) {
            const users = await prisma_1.default.user.findMany({
                where: { id: { in: userEntityIds } },
                select: { id: true, name: true, username: true }
            });
            userMap = users.reduce((acc, u) => {
                acc[u.id] = { name: u.name, username: u.username };
                return acc;
            }, {});
        }
        return logs.map(l => ({
            ...l,
            targetName: l.entityType === 'User' && l.entityId && userMap[l.entityId]
                ? userMap[l.entityId].name || userMap[l.entityId].username
                : undefined
        }));
    }
    static async count() {
        return prisma_1.default.auditLog.count();
    }
}
exports.AuditRepository = AuditRepository;
