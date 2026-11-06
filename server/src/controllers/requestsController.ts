import { Request, Response } from 'express';
import prisma from '../prisma';
import { RequestStatus } from '@prisma/client';
import { AuditService } from '../services/auditService';

async function getNextRequestId(): Promise<string> {
  const allReqs = await prisma.medicalRequest.findMany({
    where: { id: { startsWith: 'MR-2026-' } },
    select: { id: true }
  });
  let maxNum = 140;
  for (const r of allReqs) {
    const parts = r.id.split('-');
    if (parts.length === 3) {
      const n = parseInt(parts[2], 10);
      if (!isNaN(n) && n > maxNum) {
        maxNum = n;
      }
    }
  }
  return `MR-2026-${String(maxNum + 1).padStart(4, '0')}`;
}

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
      
      // Vendor filtering:
      // CLINIC role is strictly locked to its own assigned vendor facility.
      if (req.user?.role === 'CLINIC') {
        where.vendorId = req.user.vendorId || '__NO_VENDOR__';
      } else if (vendorId && vendorId !== 'ALL') {
        if (vendorId === 'UNASSIGNED' || vendorId === 'NONE') {
          where.vendorId = null;
        } else {
          where.vendorId = vendorId;
        }
      }

      if (search) {
        where.OR = [
          { id: { contains: search, mode: 'insensitive' } },
          { employee: { name: { contains: search, mode: 'insensitive' } } },
          { employee: { employeeNo: { contains: search, mode: 'insensitive' } } },
          { employee: { iqamaId: { contains: search, mode: 'insensitive' } } },
          { department: { contains: search, mode: 'insensitive' } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
          { vendor: { code: { contains: search, mode: 'insensitive' } } }
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
      const { employeeId, employeeName, department, testId, needByDate, note, batchId } = req.body;
      if (!employeeId || !testId) {
        return res.status(400).json({ error: 'employeeId and testId are required' });
      }

      let emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { id: employeeId },
            { employeeNo: employeeId },
            { iqamaId: employeeId }
          ]
        }
      });

      if (!emp && employeeName) {
        emp = await prisma.employee.create({
          data: {
            id: `EMP-${employeeId}`,
            employeeNo: employeeId,
            name: employeeName,
            department: department || 'LOGISTIC',
            status: 'Active'
          }
        });
      }

      if (!emp) return res.status(404).json({ error: 'Employee not found. Please provide employeeName to create new record.' });

      let createdRequest: any = null;
      let attempts = 0;
      while (!createdRequest && attempts < 5) {
        attempts++;
        let requestId = await getNextRequestId();
        if (batchId) {
          const batchCount = await prisma.medicalRequest.count({
            where: { id: { startsWith: `${batchId}-` } }
          });
          requestId = `${batchId}-${String(batchCount + attempts).padStart(2, '0')}`;
        }

        try {
          createdRequest = await prisma.medicalRequest.create({
            data: {
              id: requestId,
              employeeId: emp.id,
              testId,
              department: department || emp.division || emp.department || 'PMTA',
              status: RequestStatus.WAITING,
              needByDate: needByDate ? new Date(needByDate) : null,
              note: typeof note === 'object' ? JSON.stringify(note) : (note || ''),
              createdById: req.user?.id
            },
            include: { employee: true, test: true }
          });
        } catch (err: any) {
          if (err.code === 'P2002' && attempts < 5) {
            continue;
          }
          throw err;
        }
      }

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Requester',
        role: req.user?.role || 'REQUESTER',
        action: 'CREATE_REQUEST',
        entityType: 'MedicalRequest',
        entityId: createdRequest.id,
        details: `Created medical request ${createdRequest.id} for employee ${emp.name} (${createdRequest.test.name})`
      });

      return res.status(201).json({ request: createdRequest });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async bulkCreate(req: Request, res: Response) {
    try {
      const { requests, batchName, fileName, plant } = req.body;
      if (!Array.isArray(requests) || requests.length === 0) {
        return res.status(400).json({ error: 'Array of requests required' });
      }

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const batchId = `BULK-${dateStr}-${uniqueSuffix}`;
      const effectiveBatchName = batchName || (fileName ? `Upload: ${fileName}` : `Bulk Batch ${batchId}`);

      const createdList: any[] = [];
      const skipped: Array<{ row: number; employeeNo: string; reason: string }> = [];
      let rowIdx = 1;

      for (const item of requests) {
        const empIdentifier = String(item.employeeNo || '').trim();
        if (!empIdentifier) {
          skipped.push({ row: rowIdx, employeeNo: '', reason: 'Missing employee number / Iqama ID' });
          rowIdx++;
          continue;
        }

        let emp = await prisma.employee.findFirst({
          where: {
            OR: [
              { employeeNo: empIdentifier },
              { iqamaId: empIdentifier },
              { id: empIdentifier }
            ]
          }
        });

        if (!emp && item.name) {
          emp = await prisma.employee.create({
            data: {
              id: `EMP-${empIdentifier}`,
              employeeNo: empIdentifier,
              name: item.name,
              department: item.department || 'LOGISTIC',
              division: plant || 'ECC Facility',
              iqamaId: empIdentifier.length === 10 ? empIdentifier : undefined,
              status: 'Active'
            }
          });
        }

        if (!emp) {
          skipped.push({ row: rowIdx, employeeNo: empIdentifier, reason: 'Employee not found in registry' });
          rowIdx++;
          continue;
        }

        const reqId = `${batchId}-${String(createdList.length + 1).padStart(2, '0')}`;
        const notePayload = JSON.stringify({
          batchId,
          batchName: effectiveBatchName,
          fileName: fileName || null,
          plant: plant || emp.division || 'Main Complex',
          rowNote: item.note || 'Bulk upload request'
        });

        const r = await prisma.medicalRequest.create({
          data: {
            id: reqId,
            employeeId: emp.id,
            testId: item.testId || '5004959',
            department: item.department || emp.division || emp.department || 'PMTA',
            status: RequestStatus.WAITING,
            needByDate: item.needByDate ? new Date(item.needByDate) : null,
            note: notePayload,
            createdById: req.user?.id
          },
          include: { employee: true, test: true }
        });
        createdList.push(r);
        rowIdx++;
      }

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Requester',
        role: req.user?.role || 'REQUESTER',
        action: 'BULK_CREATE_REQUEST',
        entityType: 'MedicalRequest',
        details: `Bulk created ${createdList.length} clearance requests for batch ${effectiveBatchName} (${batchId})`
      });

      return res.json({
        count: createdList.length,
        batchId,
        batchName: effectiveBatchName,
        created: createdList,
        skipped
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async listBatches(req: Request, res: Response) {
    try {
      const allRequests = await prisma.medicalRequest.findMany({
        include: {
          employee: true,
          test: true,
          vendor: true,
          report: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const batchMap: Record<string, any> = {};

      for (const r of allRequests) {
        let meta: any = {};
        if (r.note) {
          try {
            meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note;
          } catch (_) {}
        }

        let bId = meta.batchId;
        if (!bId) {
          if (r.id.startsWith('REQ-2026-0104')) bId = 'REQ-2026-0104';
          else if (r.id.startsWith('REQ-2026-0101')) bId = 'REQ-2026-0101';
          else if (r.id.startsWith('REQ-2026-0102')) bId = 'REQ-2026-0102';
          else if (r.id.startsWith('REQ-2026-0103')) bId = 'REQ-2026-0103';
          else if (r.id.startsWith('BULK-')) bId = r.id.split('-').slice(0, 3).join('-');
          else continue;
        }

        if (!batchMap[bId]) {
          let defaultTitle = meta.batchName || r.test.name;
          let plant = meta.plant || r.employee.division || r.department || 'Main Complex';
          if (bId === 'REQ-2026-0104') {
            defaultTitle = 'Yanpet medical test';
            plant = 'Yanpet Plant';
          } else if (bId === 'REQ-2026-0101') {
            defaultTitle = 'Sadara medical test';
            plant = 'Complex South';
          } else if (bId === 'REQ-2026-0102') {
            defaultTitle = 'SABIC medical screening with TSH';
            plant = 'Jubail Site';
          } else if (bId === 'REQ-2026-0103') {
            defaultTitle = 'General medical fitness';
            plant = 'Logistics Wing';
          }

          batchMap[bId] = {
            id: bId,
            title: defaultTitle,
            plant,
            uploadedAt: r.createdAt,
            fileName: meta.fileName || null,
            totalEmployees: 0,
            doneCount: 0,
            pendingCount: 0,
            assignedCount: 0,
            employees: []
          };
        }

        const b = batchMap[bId];
        b.totalEmployees++;
        const isDone = r.status === RequestStatus.COMPLETED || Boolean(r.report);
        if (isDone) {
          b.doneCount++;
        } else {
          b.pendingCount++;
        }
        if (r.vendorId) {
          b.assignedCount++;
        }

        b.employees.push({
          id: r.id,
          employeeId: r.employee.id,
          employeeNo: r.employee.employeeNo,
          employeeName: r.employee.name,
          iqamaId: r.employee.iqamaId,
          department: r.department || r.employee.department,
          testName: r.test.name,
          status: r.status,
          isDone,
          assignedClinic: r.vendor ? r.vendor.name : null,
          assignedClinicCode: r.vendor ? r.vendor.code : null,
          apptDate: r.apptDate,
          reportId: r.report ? r.report.id : null,
          reportFileUrl: r.report ? r.report.fileUrl : null
        });
      }

      const batches = Object.values(batchMap).sort((a: any, b: any) => 
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      );

      return res.json({ batches });
    } catch (e: any) {
      console.error('List batches error:', e);
      return res.status(500).json({ error: e.message });
    }
  }

  static async batchAssign(req: Request, res: Response) {
    try {
      const { requestIds, vendorId, apptDate } = req.body;
      if (!Array.isArray(requestIds) || !vendorId) {
        return res.status(400).json({ error: 'requestIds array and vendorId are required' });
      }

      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return res.status(404).json({ error: 'Clinic vendor not found' });

      const existingRequests = await prisma.medicalRequest.findMany({
        where: { id: { in: requestIds } }
      });

      const foundIds = existingRequests.map(r => r.id);
      const notFound = requestIds.filter(id => !foundIds.includes(id));
      if (foundIds.length === 0) {
        return res.status(400).json({ error: 'None of the provided request IDs exist', notFound });
      }

      // Filter out completed requests
      const assignable = existingRequests.filter(r => r.status !== RequestStatus.COMPLETED);
      const assignableIds = assignable.map(r => r.id);

      // Find active clinic slot
      const activeSlot = await prisma.clinicSlot.findFirst({
        where: { vendorId },
        orderBy: { createdAt: 'desc' }
      });

      const updateData: any = {
        vendorId,
        slotId: activeSlot?.id,
        status: apptDate ? RequestStatus.SCHEDULED : RequestStatus.SUBMITTED
      };
      if (apptDate) {
        updateData.apptDate = new Date(apptDate);
      }

      await prisma.medicalRequest.updateMany({
        where: { id: { in: assignableIds } },
        data: updateData
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Central Team',
        role: req.user?.role || 'CENTRAL',
        action: apptDate ? 'BATCH_ASSIGN_AND_SCHEDULE' : 'BATCH_ASSIGN_CLINIC',
        entityType: 'MedicalRequest',
        details: `Assigned ${assignableIds.length} requests (${assignableIds.join(', ')}) to clinic ${vendor.name}${apptDate ? ` scheduled for ${apptDate}` : ''}`
      });

      return res.json({
        message: `Successfully assigned ${assignableIds.length} requests to ${vendor.name}${apptDate ? ` on ${new Date(apptDate).toLocaleDateString()}` : ''}`,
        assignedCount: assignableIds.length,
        notFound
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async scheduleAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { apptDate, note } = req.body;
      if (!apptDate) return res.status(400).json({ error: 'apptDate required' });

      const existing = await prisma.medicalRequest.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Request not found' });

      // Guardrail: clinic users cannot schedule for other clinics
      if (req.user?.role === 'CLINIC' && existing.vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: Cannot schedule appointments for another clinic' });
      }

      // Ensure request is assigned to a clinic vendor
      if (!existing.vendorId) {
        return res.status(400).json({ error: 'Request must be assigned to a clinic facility before scheduling' });
      }

      const updatePayload: any = {
        apptDate: new Date(apptDate),
        status: RequestStatus.SCHEDULED
      };
      if (note) {
        updatePayload.note = note;
      }

      const request = await prisma.medicalRequest.update({
        where: { id },
        data: updatePayload,
        include: { employee: true, vendor: true, test: true }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Medical Coordinator',
        role: req.user?.role || 'CENTRAL',
        action: 'SCHEDULE_APPOINTMENT',
        entityType: 'MedicalRequest',
        entityId: id,
        details: `Scheduled medical exam for ${request.employee.name} on ${new Date(apptDate).toLocaleDateString()}`
      });

      return res.json({ request });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const existing = await prisma.medicalRequest.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Request not found' });

      if (existing.status === RequestStatus.COMPLETED) {
        return res.status(409).json({ error: 'Cannot cancel an already completed clearance request' });
      }

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

      const existing = await prisma.medicalRequest.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Request not found' });

      if (existing.status === RequestStatus.COMPLETED) {
        return res.status(409).json({ error: 'Cannot reject an already completed clearance request' });
      }

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

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { note, apptDate, status, department, vendorId } = req.body;

      const existing = await prisma.medicalRequest.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: 'Request not found' });

      // Guardrail: clinic role cannot update request of another clinic
      if (req.user?.role === 'CLINIC' && existing.vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: Cannot update requests for another clinic' });
      }

      const updateData: any = {};
      if (note !== undefined) updateData.note = typeof note === 'object' ? JSON.stringify(note) : String(note);
      if (apptDate !== undefined) updateData.apptDate = apptDate ? new Date(apptDate) : null;
      if (department !== undefined) updateData.department = department;
      if (vendorId !== undefined) {
        updateData.vendorId = vendorId === null || vendorId === '' ? null : vendorId;
        if (!vendorId) {
          updateData.slotId = null;
          if (existing.status !== RequestStatus.COMPLETED) {
            updateData.status = RequestStatus.WAITING;
          }
        } else if (existing.status === RequestStatus.WAITING) {
          updateData.status = RequestStatus.SUBMITTED;
        }
      }

      if (status !== undefined) {
        const validStatuses = Object.values(RequestStatus);
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ error: `Invalid status '${status}'. Allowed: ${validStatuses.join(', ')}` });
        }
        if (existing.status === RequestStatus.COMPLETED && status !== RequestStatus.COMPLETED) {
          return res.status(409).json({ error: 'Cannot alter status of an already completed clearance request' });
        }
        updateData.status = status;
      }

      const request = await prisma.medicalRequest.update({
        where: { id },
        data: updateData,
        include: {
          employee: true,
          test: true,
          vendor: true,
          report: true
        }
      });

      return res.json({ request });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
