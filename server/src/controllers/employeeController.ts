import { Request, Response } from 'express';
import prisma from '../prisma';
import { EligibilityService } from '../services/eligibilityService';

export class EmployeeController {
  static async search(req: Request, res: Response) {
    try {
      const q = (req.query.q as string || '').trim();
      const limit = Math.min(Number(req.query.limit) || 20, 50);

      let whereClause: any = {};
      if (q) {
        whereClause = {
          OR: [
            { employeeNo: { contains: q, mode: 'insensitive' } },
            { iqamaId: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { department: { contains: q, mode: 'insensitive' } },
            { position: { contains: q, mode: 'insensitive' } }
          ]
        };
      }

      const employees = await prisma.employee.findMany({
        where: whereClause,
        take: limit,
        orderBy: { employeeNo: 'asc' }
      });

      return res.json({ employees });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { id },
            { employeeNo: id },
            { iqamaId: id }
          ]
        },
        include: {
          requests: {
            include: { test: true, vendor: true, report: true },
            orderBy: { createdAt: 'desc' }
          },
          reports: {
            include: { test: true, vendor: true },
            orderBy: { testDate: 'desc' }
          }
        }
      });

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      return res.json({ employee });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async checkEligibility(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const testId = req.query.testId as string;

      if (!testId) {
        return res.status(400).json({ error: 'Query param testId is required' });
      }

      const employee = await prisma.employee.findFirst({
        where: {
          OR: [{ id }, { employeeNo: id }]
        }
      });

      if (!employee) {
        return res.status(404).json({ error: 'Employee not found' });
      }

      const eligibility = await EligibilityService.check(employee.id, testId);
      return res.json({ employee, eligibility });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
