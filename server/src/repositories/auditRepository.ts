import prisma from '../prisma';
import { Role } from '@prisma/client';

export interface AuditLogData {
  userId?: string;
  actorName: string;
  role: Role;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
}

export class AuditRepository {
  static async create(data: AuditLogData) {
    return prisma.auditLog.create({
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

  static async list(limit: number = 100) {
    return prisma.auditLog.findMany({
      take: Math.min(limit, 200),
      orderBy: { timestamp: 'desc' }
    });
  }

  static async count() {
    return prisma.auditLog.count();
  }
}
