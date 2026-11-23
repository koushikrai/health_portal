import { Request, Response } from 'express';
import { MasterRepository } from '../repositories/masterRepository';

export class MastersController {
  static async getDepartments(req: Request, res: Response) {
    try {
      const departments = await MasterRepository.getDepartments();
      return res.json({ departments });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getTests(req: Request, res: Response) {
    try {
      const tests = await MasterRepository.getTestsWithRates('id');
      return res.json({ tests });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getClinics(req: Request, res: Response) {
    try {
      const clinics = await MasterRepository.getClinicsWithContractsAndLatestSlot();
      return res.json({ clinics });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getRates(req: Request, res: Response) {
    try {
      const rates = await MasterRepository.getRatesWithContractAndTest();
      return res.json({ rates });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
