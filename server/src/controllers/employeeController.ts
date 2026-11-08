import { Request, Response } from 'express';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { EligibilityService } from '../services/eligibilityService';

export class EmployeeController {
  static async search(req: Request, res: Response) {
    try {
      const q = (req.query.q as string || '').trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
      const offset = Math.max(Number(req.query.offset) || 0, 0);

      const employees = await EmployeeRepository.search(q, limit, offset);
      return res.json({ employees });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const employee = await EmployeeRepository.findByIdOrBadge(id);

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

      const employee = await EmployeeRepository.findByIdOrBadge(id);

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
