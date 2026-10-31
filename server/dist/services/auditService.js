"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class AuditService {
    static async log(params) {
        try {
            return await prisma_1.default.auditLog.create({
                data: {
                    userId: params.userId,
                    actorName: params.actorName,
                    role: params.role,
                    action: params.action,
                    entityType: params.entityType,
                    entityId: params.entityId,
                    details: params.details
                }
            });
        }
        catch (e) {
            console.error('AuditLog failed:', e);
        }
    }
}
exports.AuditService = AuditService;
