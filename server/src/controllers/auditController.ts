import { Request, Response } from 'express';
import prisma from '../prisma';

export class AuditController {
  static async list(req: Request, res: Response) {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const logs = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { timestamp: 'desc' }
      });
      return res.json({ logs });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
