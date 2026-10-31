"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const prisma_1 = __importDefault(require("../prisma"));
class AuditController {
    static async list(req, res) {
        try {
            const limit = Math.min(Number(req.query.limit) || 100, 200);
            const logs = await prisma_1.default.auditLog.findMany({
                take: limit,
                orderBy: { timestamp: 'desc' }
            });
            return res.json({ logs });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.AuditController = AuditController;
