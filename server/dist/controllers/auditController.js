"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditController = void 0;
const auditRepository_1 = require("../repositories/auditRepository");
class AuditController {
    static async list(req, res) {
        try {
            const limit = Math.min(Number(req.query.limit) || 100, 200);
            const logs = await auditRepository_1.AuditRepository.list(limit);
            return res.json({ logs });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
}
exports.AuditController = AuditController;
