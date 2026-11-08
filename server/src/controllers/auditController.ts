import { Request, Response } from 'express';
import { AuditRepository } from '../repositories/auditRepository';

export class AuditController {
  static async list(req: Request, res: Response) {
    try {
      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const logs = await AuditRepository.list(limit);
      return res.json({ logs });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
