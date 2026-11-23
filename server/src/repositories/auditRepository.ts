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
    const logs = await prisma.auditLog.findMany({
      take: Math.min(limit, 200),
      orderBy: { timestamp: 'desc' }
    });

    const userEntityIds = Array.from(
      new Set(
        logs
          .filter(l => l.entityType === 'User' && l.entityId)
          .map(l => l.entityId as string)
      )
    );

    let userMap: Record<string, { name: string; username: string }> = {};
    if (userEntityIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userEntityIds } },
        select: { id: true, name: true, username: true }
      });
      userMap = users.reduce((acc, u) => {
        acc[u.id] = { name: u.name, username: u.username };
        return acc;
      }, {} as Record<string, { name: string; username: string }>);
    }

    return logs.map(l => ({
      ...l,
      targetName: l.entityType === 'User' && l.entityId && userMap[l.entityId]
        ? userMap[l.entityId].name || userMap[l.entityId].username
        : undefined
    }));
  }

  static async count() {
    return prisma.auditLog.count();
  }
}
