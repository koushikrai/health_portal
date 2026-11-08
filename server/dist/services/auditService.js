"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const auditRepository_1 = require("../repositories/auditRepository");
class AuditService {
    static async log(params) {
        try {
            return await auditRepository_1.AuditRepository.create(params);
        }
        catch (e) {
            console.error('[AuditService Error]:', e);
        }
    }
}
exports.AuditService = AuditService;
