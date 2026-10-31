import { Request, Response } from 'express';
import prisma from '../prisma';
import { RequestStatus } from '@prisma/client';
import { AuditService } from '../services/auditService';

export class RequestsController {
  static async list(req: Request, res: Response) {
    try {
      const status = req.query.status as string;
      const vendorId = req.query.vendorId as string;
      const search = (req.query.search as string || '').trim();

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status as RequestStatus;
      }
      
      // Role-based vendor isolation:
      // If user is a CLINIC, strictly constrain to their assigned vendorId
      if (req.user?.role === 'CLINIC' && req.user.vendorId) {
        where.vendorId = req.user.vendorId;
      } else if (vendorId) {
        where.vendorId = vendorId;
      }

      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { employee: { name: { contains: search, mode: 'insensitive' } } },
          { employee: { employeeNo: { contains: search, mode: 'insensitive' } } },
          { employee: { iqamaId: { contains: search, mode: 'insensitive' } } },
          { department: { contains: search, mode: 'insensitive' } }
        ];
      }

      const requests = await prisma.medicalRequest.findMany({
        where,
        include: {
          employee: true,
          test: true,
          vendor: true,
          report: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return res.json({ requests });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { employeeId, testId, needByDate, note } = req.body;
      if (!employeeId || !testId) {
        return res.status(400).json({ error: 'employeeId and testId are required' });
      }

      const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
      if (!emp) return res.status(404).json({ error: 'Employee not found' });

      // Generate sequence request ID
      const count = await prisma.medicalRequest.count();
      const requestId = `MR-2026-${String(count + 141).padStart(4, '0')}`;

      const request = await prisma.medicalRequest.create({
        data: {
          id: requestId,
          employeeId,
          testId,
          department: emp.division || emp.department || 'PMTA',
          status: RequestStatus.WAITING,
          needByDate: needByDate ? new Date(needByDate) : null,
          note: note || '',
          createdById: req.user?.id
        },
        include: { employee: true, test: true }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Requester',
        role: req.user?.role || 'REQUESTER',
        action: 'CREATE_REQUEST',
        entityType: 'MedicalRequest',
        entityId: request.id,
        details: `Created medical request ${request.id} for employee ${emp.name} (${request.test.name})`
      });

      return res.status(201).json({ request });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async bulkCreate(req: Request, res: Response) {
    try {
      const { requests } = req.body; // array of { employeeNo, testId, needByDate, note }
      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({ error: 'Array of requests required' });
      }

      let count = await prisma.medicalRequest.count();
      const createdList = [];

      for (const item of requests) {
        const emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeNo: String(item.employeeNo) },
              { iqamaId: String(item.employeeNo) },
              { id: String(item.employeeNo) }
            ]
          }
        });

        if (emp) {
          count++;
          const reqId = `MR-2026-${String(count + 141).padStart(4, '0')}`;
          const r = await prisma.medicalRequest.create({
            data: {
              id: reqId,
              employeeId: emp.id,
              testId: item.testId || '5004959',
              department: emp.division || emp.department || 'PMTA',
              status: RequestStatus.WAITING,
              needByDate: item.needByDate ? new Date(item.needByDate) : null,
              note: item.note || 'Bulk upload request',
              createdById: req.user?.id
            }
          });
          createdList.push(r);
        }
      }

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Requester',
        role: req.user?.role || 'REQUESTER',
        action: 'BULK_CREATE_REQUEST',
        entityType: 'MedicalRequest',
        details: `Bulk created ${createdList.length} clearance requests`
      });

      return res.json({ count: createdList.length, created: createdList });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async batchAssign(req: Request, res: Response) {
    try {
      const { requestIds, vendorId } = req.body;
      if (!Array.isArray(requestIds) || !vendorId) {
        return res.status(400).json({ error: 'requestIds array and vendorId are required' });
      }

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return res.status(404).json({ error: 'Clinic vendor not found' });

      // Find active clinic slot
      const activeSlot = await prisma.clinicSlot.findFirst({
        where: { vendorId },
        orderBy: { createdAt: 'desc' }
      });

      await prisma.medicalRequest.updateMany({
        where: { id: { in: requestIds } },
        data: {
          vendorId,
          slotId: activeSlot?.id,
          status: RequestStatus.SUBMITTED
        }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Central Team',
        role: req.user?.role || 'CENTRAL',
        action: 'BATCH_ASSIGN_CLINIC',
        entityType: 'MedicalRequest',
        details: `Assigned ${requestIds.length} requests (${requestIds.join(', ')}) to clinic ${vendor.name}`
      });

      return res.json({ message: `Successfully assigned ${requestIds.length} requests to ${vendor.name}` });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async scheduleAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { apptDate } = req.body;
      if (!apptDate) return res.status(400).json({ error: 'apptDate required' });

      const existing = await prisma.medicalRequest.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Request not found' });

      // Guardrail: Clinic can only schedule appointments for their assigned facility
      if (req.user?.role === 'CLINIC' && req.user.vendorId && existing.vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: You can only schedule appointments for requests assigned to your medical center' });
      }

      const request = await prisma.medicalRequest.update({
        where: { id },
        data: {
          apptDate: new Date(apptDate),
          status: RequestStatus.SCHEDULED
        },
        include: { employee: true }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Clinic',
        role: req.user?.role || 'CLINIC',
        action: 'SCHEDULE_APPOINTMENT',
        entityType: 'MedicalRequest',
        entityId: id,
        details: `Scheduled medical exam for ${request.employee.name} on ${apptDate}`
      });

      return res.json({ request });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const request = await prisma.medicalRequest.update({
        where: { id },
        data: { status: RequestStatus.CANCELLED }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'User',
        role: req.user?.role || 'REQUESTER',
        action: 'CANCEL_REQUEST',
        entityType: 'MedicalRequest',
        entityId: id,
        details: `Cancelled medical request ${id}`
      });

      return res.json({ request });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async reject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const request = await prisma.medicalRequest.update({
        where: { id },
        data: {
          status: RequestStatus.REJECTED,
          note: reason ? `Rejected: ${reason}` : 'Rejected by Central Team'
        }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Central Team',
        role: req.user?.role || 'CENTRAL',
        action: 'REJECT_REQUEST',
        entityType: 'MedicalRequest',
        entityId: id,
        details: `Rejected request ${id}. Reason: ${reason || 'N/A'}`
      });

      return res.json({ request });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
