import { Role } from '@prisma/client';
import { AuditRepository, AuditLogData } from '../repositories/auditRepository';

export class AuditService {
  static async log(params: AuditLogData) {
    try {
      return await AuditRepository.create(params);
    } catch (e) {
      console.error('[AuditService Error]:', e);
    }
  }
}
