import { Request, Response } from 'express';
import prisma from '../prisma';
import { ReportResult, RequestStatus } from '@prisma/client';
import { AuditService } from '../services/auditService';

export class ReportsController {
  static async list(req: Request, res: Response) {
    try {
      const { search, result } = req.query;
      const where: any = {};

      if (result && result !== 'ALL') {
        where.result = result as ReportResult;
      }

      if (search) {
        const s = String(search).trim();
        where.OR = [
          { id: { contains: s, mode: 'insensitive' } },
          { employee: { name: { contains: s, mode: 'insensitive' } } },
          { employee: { employeeNo: { contains: s, mode: 'insensitive' } } },
          { employee: { iqamaId: { contains: s, mode: 'insensitive' } } },
          { test: { name: { contains: s, mode: 'insensitive' } } }
        ];
      }

      const reports = await prisma.medicalReport.findMany({
        where,
        include: {
          employee: true,
          test: true,
          vendor: true,
          request: true
        },
        orderBy: { testDate: 'desc' }
      });

      return res.json({ reports });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async submitResult(req: Request, res: Response) {
    try {
      const { requestId, result, testDate, remarks, fileUrl, doctorName } = req.body;
      if (!requestId || !result) {
        return res.status(400).json({ error: 'requestId and result required' });
      }

      const request = await prisma.medicalRequest.findUnique({
        where: { id: requestId },
        include: { test: true, employee: true }
      });

      if (!request) return res.status(404).json({ error: 'Request not found' });
      if (!request.vendorId) return res.status(400).json({ error: 'Request must be assigned to a clinic vendor before result entry' });

      // Guardrail: Clinic can only enter medical examination outcomes for requests assigned to their facility
      if (req.user?.role === 'CLINIC' && req.user.vendorId && request.vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: You can only submit examination results for requests assigned to your medical center' });
      }

      const tDate = testDate ? new Date(testDate) : new Date();
      
      // Calculate validity expiration date
      let validUntil: Date | null = null;
      if (request.test.validityMonths > 0) {
        validUntil = new Date(tDate);
        validUntil.setMonth(validUntil.getMonth() + request.test.validityMonths);
      }

      const repCount = await prisma.medicalReport.count();
      const repId = `REP-${String(repCount + 81).padStart(4, '0')}`;

      const formattedRemarks = doctorName
        ? `[Examining Physician: ${doctorName}] ${remarks || ''}`
        : (remarks || '');

      // Create Report
      const report = await prisma.medicalReport.create({
        data: {
          id: repId,
          requestId,
          employeeId: request.employeeId,
          testId: request.testId,
          vendorId: request.vendorId,
          result: result as ReportResult,
          testDate: tDate,
          validUntil,
          remarks: formattedRemarks,
          fileUrl: fileUrl || ''
        },
        include: { employee: true, test: true, vendor: true }
      });

      // Update Request status to COMPLETED
      await prisma.medicalRequest.update({
        where: { id: requestId },
        data: { status: RequestStatus.COMPLETED }
      });

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Clinic',
        role: req.user?.role || 'CLINIC',
        action: 'SUBMIT_REPORT',
        entityType: 'MedicalReport',
        entityId: report.id,
        details: `Submitted test result ${result} for ${request.employee.name} (${request.test.name}). Certificate ${report.id} generated.`
      });

      return res.status(201).json({ report });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async getCertificate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const report = await prisma.medicalReport.findFirst({
        where: {
          OR: [{ id }, { requestId: id }]
        },
        include: {
          employee: true,
          test: true,
          vendor: true,
          request: true
        }
      });

      if (!report) return res.status(404).json({ error: 'Medical report not found' });

      let physician = 'Dr. Tariq Al-Ghamdi, MD (Occupational Medicine)';
      let cleanRemarks = report.remarks || 'Clinically fit for deployment.';
      if (report.remarks && report.remarks.includes('[Examining Physician:')) {
        const match = report.remarks.match(/\[Examining Physician:\s*([^\]]+)\]/);
        if (match && match[1]) {
          physician = match[1].trim();
          cleanRemarks = report.remarks.replace(/\[Examining Physician:[^\]]+\]\s*/, '').trim() || 'Clinically fit for deployment.';
        }
      }

      // Build official certificate metadata
      const cert = {
        certificateNo: report.id,
        requestId: report.requestId,
        employeeName: report.employee.name,
        employeeNo: report.employee.employeeNo,
        iqamaId: report.employee.iqamaId,
        nationality: report.employee.nationality || 'SAUDI ARABIA',
        division: report.employee.division,
        department: report.employee.department,
        position: report.employee.position,
        clinicName: report.vendor.name,
        clinicCode: report.vendor.code,
        sapVendorNo: report.vendor.sapVendorNo,
        testName: report.test.name,
        sapMaterialCode: report.test.id,
        result: report.result,
        testDate: report.testDate,
        validUntil: report.validUntil,
        remarks: cleanRemarks,
        examiningPhysician: physician,
        qrVerificationCode: `https://ecc.medclear.sa/verify/${report.id}`
      };

      return res.json({ certificate: cert });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
