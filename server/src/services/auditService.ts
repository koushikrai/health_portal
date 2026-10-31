import { Role } from '@prisma/client';
import prisma from '../prisma';

export class AuditService {
  static async log(params: {
    userId?: string;
    actorName: string;
    role: Role;
    action: string;
    entityType: string;
    entityId?: string;
    details: string;
  }) {
    try {
      return await prisma.auditLog.create({
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
    } catch (e) {
      console.error('AuditLog failed:', e);
    }
  }
}
