import { Request, Response } from 'express';
import prisma from '../prisma';

export class MastersController {
  static async getDepartments(req: Request, res: Response) {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { code: 'asc' }
      });
      return res.json({ departments });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getTests(req: Request, res: Response) {
    try {
      const tests = await prisma.medicalTest.findMany({
        include: {
          rates: {
            include: {
              contract: {
                include: { vendor: true }
              }
            }
          }
        },
        orderBy: { id: 'asc' }
      });
      return res.json({ tests });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getClinics(req: Request, res: Response) {
    try {
      const clinics = await prisma.vendor.findMany({
        include: {
          contracts: {
            include: {
              rates: {
                include: { test: true }
              }
            }
          },
          slots: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { code: 'asc' }
      });
      return res.json({ clinics });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getRates(req: Request, res: Response) {
    try {
      const rates = await prisma.contractRate.findMany({
        include: {
          contract: {
            include: { vendor: true }
          },
          test: true
        },
        orderBy: [
          { contract: { vendor: { code: 'asc' } } },
          { testId: 'asc' }
        ]
      });
      return res.json({ rates });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
