import { Request, Response } from 'express';
import prisma from '../prisma';
import { ReportResult, RequestStatus } from '@prisma/client';
import { AuditService } from '../services/auditService';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Disk storage for uploaded PDF reports
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/reports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}_${Date.now()}${ext}`);
  }
});

export const uploadReportsMulter = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are supported'));
    }
  }
});

export class ReportsController {
  static async list(req: Request, res: Response) {
    try {
      const { search, result } = req.query;
      const where: any = {};

      if (result && result !== 'ALL') {
        where.result = result as ReportResult;
      }

      if (req.user?.role === 'CLINIC') {
        where.vendorId = req.user.vendorId || '__NO_VENDOR__';
      } else if (req.query.vendorId && req.query.vendorId !== 'ALL') {
        where.vendorId = req.query.vendorId as string;
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

      // Guardrail: Ensure clinic account can only submit for its own clinic
      if (req.user?.role === 'CLINIC' && request.vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: Cannot submit medical report for another clinic' });
      }

      const tDate = testDate ? new Date(testDate) : new Date();
      
      // Calculate validity expiration date
      let validUntil: Date | null = null;
      if (request.test.validityMonths > 0) {
        validUntil = new Date(tDate);
        validUntil.setMonth(validUntil.getMonth() + request.test.validityMonths);
      }

      const repCount = await prisma.medicalReport.count();

      const formattedRemarks = doctorName
        ? `[Examining Physician: ${doctorName}] ${remarks || ''}`
        : (remarks || '');

      // Upsert Report (handles both initial generation and subsequent updates/re-certification)
      const existingReport = await prisma.medicalReport.findUnique({ where: { requestId } });
      const repId = existingReport?.id || `REP-${String(repCount + 81).padStart(4, '0')}`;

      const report = await prisma.medicalReport.upsert({
        where: { requestId },
        update: {
          result: result as ReportResult,
          testDate: tDate,
          validUntil,
          remarks: formattedRemarks,
          fileUrl: fileUrl || ''
        },
        create: {
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

      // Guardrail: Clinic user can only view reports issued by their assigned clinic
      if (req.user?.role === 'CLINIC' && report.vendorId !== req.user.vendorId) {
        return res.status(403).json({ error: 'Forbidden: Cannot view certificate issued by another clinic' });
      }

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
        qrVerificationCode: `https://ecc.medclear.sa/verify/${report.id}`,
        fileUrl: report.fileUrl
      };

      return res.json({ certificate: cert });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  static async bulkUploadPdf(req: Request, res: Response) {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        return res.status(400).json({ error: 'No PDF files uploaded. Please upload a folder or select PDF files.' });
      }

      const { vendorId, testId, testDate, validityMonths } = req.body;
      const clinicVendorId = (req.user?.role === 'CLINIC' && req.user.vendorId) ? req.user.vendorId : (vendorId || 'V1');
      const issueDate = testDate ? new Date(testDate) : new Date();
      const months = Number(validityMonths || 24);

      let validUntil = new Date(issueDate);
      validUntil.setMonth(validUntil.getMonth() + months);

      // Verify or resolve MedicalTest
      let targetTestId = testId;
      if (!targetTestId) {
        const firstTest = await prisma.medicalTest.findFirst({ where: { validityMonths: { gt: 0 } } });
        targetTestId = firstTest?.id || '5004972';
      }

      // Verify vendor exists
      const vendorRecord = await prisma.vendor.findUnique({ where: { id: clinicVendorId } });
      const clinicName = vendorRecord?.name || 'Accredited Medical Center';

      const matched: any[] = [];
      const unmatched: any[] = [];

      for (const file of files) {
        let request: any = null;
        let employee: any = null;
        let iqamaCandidate = (req.body.iqamaId && files.length === 1) ? String(req.body.iqamaId).trim() : '';

        // Direct candidate match if single upload passes explicit requestId
        if (req.body.requestId && files.length === 1) {
          request = await prisma.medicalRequest.findUnique({
            where: { id: String(req.body.requestId) },
            include: { employee: true, test: true }
          });
          if (request) {
            employee = request.employee;
            if (!iqamaCandidate) iqamaCandidate = employee.iqamaId || employee.employeeNo;
          }
        }

        // Otherwise extract candidate Iqama number from filename or explicit employee identifier
        if (!employee) {
          const ext = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, ext);
          const tenDigitMatch = baseName.match(/\b\d{10}\b/);
          if (!iqamaCandidate) {
            iqamaCandidate = tenDigitMatch ? tenDigitMatch[0] : baseName.trim();
          }

          // Search for matching employee by iqamaId or employeeNo
          employee = await prisma.employee.findFirst({
            where: {
              OR: [
                { iqamaId: iqamaCandidate },
                { employeeNo: iqamaCandidate },
                { id: iqamaCandidate }
              ]
            }
          });

          if (!employee) {
            unmatched.push({
              fileName: file.originalname,
              extractedIqama: iqamaCandidate,
              reason: `No employee registered with Iqama or Badge ID "${iqamaCandidate}"`
            });
            continue;
          }
        }

        // Find or create a MedicalRequest for this employee if not already identified
        if (!request) {
          request = await prisma.medicalRequest.findFirst({
            where: {
              employeeId: employee.id,
              status: { in: [RequestStatus.WAITING, RequestStatus.SUBMITTED, RequestStatus.SCHEDULED] }
            },
            orderBy: { createdAt: 'desc' }
          });

          if (!request) {
            // Fallback: check if there is an existing request for this employee
            request = await prisma.medicalRequest.findFirst({
              where: { employeeId: employee.id },
              orderBy: { createdAt: 'desc' }
            });
          }

          if (!request) {
            const reqCount = await prisma.medicalRequest.count();
            request = await prisma.medicalRequest.create({
              data: {
                id: `MR-2026-${String(reqCount + 100).padStart(4, '0')}`,
                employeeId: employee.id,
                testId: targetTestId,
                vendorId: clinicVendorId,
                status: RequestStatus.COMPLETED
              }
            });
          }
        }

        const repCount = await prisma.medicalReport.count();
        const repId = `REP-${String(repCount + 100).padStart(4, '0')}`;
        const relativeUrl = `/uploads/reports/${file.filename}`;

        // Upsert MedicalReport
        const report = await prisma.medicalReport.upsert({
          where: { requestId: request.id },
          update: {
            vendorId: clinicVendorId,
            testId: targetTestId,
            testDate: issueDate,
            validUntil,
            fileUrl: relativeUrl,
            result: ReportResult.FIT,
            remarks: `Official PDF Certificate Uploaded [Iqama: ${employee.iqamaId || iqamaCandidate}]`
          },
          create: {
            id: repId,
            requestId: request.id,
            employeeId: employee.id,
            vendorId: clinicVendorId,
            testId: targetTestId,
            testDate: issueDate,
            validUntil,
            fileUrl: relativeUrl,
            result: ReportResult.FIT,
            remarks: `Official PDF Certificate Uploaded [Iqama: ${employee.iqamaId || iqamaCandidate}]`
          },
          include: { employee: true, test: true, vendor: true }
        });

        // Mark request as completed
        await prisma.medicalRequest.update({
          where: { id: request.id },
          data: { status: RequestStatus.COMPLETED }
        });

        matched.push({
          reportId: report.id,
          employeeName: employee.name,
          employeeNo: employee.employeeNo,
          iqamaId: employee.iqamaId || iqamaCandidate,
          reportName: report.test.name,
          issueDate: report.testDate.toISOString().slice(0, 10),
          expiryDate: report.validUntil ? report.validUntil.toISOString().slice(0, 10) : null,
          clinicName: report.vendor.name,
          fileUrl: relativeUrl,
          fileName: file.originalname
        });
      }

      await AuditService.log({
        userId: req.user?.id,
        actorName: req.user?.name || 'Clinic',
        role: req.user?.role || 'CLINIC',
        action: 'BULK_UPLOAD_PDF',
        entityType: 'MedicalReport',
        entityId: clinicVendorId,
        details: `Bulk uploaded ${files.length} PDFs: ${matched.length} matched and recorded, ${unmatched.length} unmatched.`
      });

      return res.json({
        success: true,
        totalFiles: files.length,
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        clinicName,
        matched,
        unmatched
      });
    } catch (e: any) {
      console.error('Bulk upload error:', e);
      return res.status(500).json({ error: e.message || 'Failed to process bulk PDF upload' });
    }
  }

  static async getWorkforceClearance(req: Request, res: Response) {
    try {
      const search = (req.query.search as string || '').toLowerCase().trim();
      const department = req.query.department as string;
      const statusFilter = req.query.status as string;
      const batchFilter = req.query.batchId as string;

      const employees = await prisma.employee.findMany({
        where: {
          OR: [
            { employeeNo: { startsWith: 'E102' } },
            { employeeNo: { startsWith: 'E103' } }
          ]
        },
        include: {
          reports: {
            include: {
              test: true,
              vendor: true
            },
            orderBy: { testDate: 'desc' }
          },
          requests: {
            include: {
              test: true,
              vendor: true,
              report: true
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { employeeNo: 'asc' }
      });

      const now = new Date('2026-11-06T00:00:00.000Z');

      const shortNameMap: Record<string, string> = {
        '5004956': 'Iqama',
        '5004970': 'Pre-employment,',
        '5004985': 'Pre-employment,',
        '5004959': 'SABIC',
        '5004972': 'Yanpet',
        '5004958': "Ma'aden",
        '5004966': 'Driving',
        '5004979': 'Hadeed',
        '5004963': 'Saipem',
        '5004973': 'Yansab',
        '5004978': 'Amiral',
        '5004974': 'Bahrain',
        '5004975': 'CPP',
        '5004977': 'SAFCO',
        '5004981': 'SATORP',
        '5004984': 'Food',
        '5004955': 'Sadara',
        '5004961': 'Aramco',
        '5004964': 'PetroKemya',
        '5004976': 'Sharq'
      };

      const formatDisplayDate = (d?: Date | null) => {
        if (!d) return '—';
        const dateObj = new Date(d);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        return `${day} ${month} ${year}`;
      };

      // Map each employee with their cards, batch metadata, and compliance status
      const allRows = employees.map(emp => {
        // Resolve batch metadata from employee's requests
        let employeeBatchId = 'BATCH-CORE';
        let employeeBatchName = 'Enterprise Workforce Roster';
        let employeePlant = emp.division || emp.department || 'Main Complex';
        let employeeAssignedClinic: string | null = null;
        let employeeProtocol = 'Periodic Clearance';
        let employeeRequestedDate = '02 Nov 2026';
        let employeeRequestStatus = 'COMPLETED';

        for (const req of emp.requests) {
          let meta: any = {};
          if (req.note) {
            try {
              meta = typeof req.note === 'string' ? JSON.parse(req.note) : req.note;
            } catch (_) {}
          }
          let b = meta.batchId;
          if (!b) {
            if (req.id.startsWith('REQ-2026-0104')) b = 'REQ-2026-0104';
            else if (req.id.startsWith('REQ-2026-0101')) b = 'REQ-2026-0101';
            else if (req.id.startsWith('REQ-2026-0102')) b = 'REQ-2026-0102';
            else if (req.id.startsWith('REQ-2026-0103')) b = 'REQ-2026-0103';
            else if (req.id.startsWith('BULK-')) b = req.id.split('-').slice(0, 3).join('-');
          }
          if (b && b !== 'BATCH-2026-CLEARANCE-ROSTER') {
            employeeBatchId = b;
            employeeBatchName = meta.batchName || (
              b === 'REQ-2026-0104' ? 'Yanpet medical test' :
              b === 'REQ-2026-0101' ? 'Sadara medical test' :
              b === 'REQ-2026-0102' ? 'SABIC medical screening with TSH' :
              b === 'REQ-2026-0103' ? 'General medical fitness' :
              (meta.fileName ? `Bulk Upload: ${meta.fileName}` : `Batch ${b}`)
            );
            employeePlant = meta.plant || (
              b === 'REQ-2026-0104' ? 'Yanpet Plant' :
              b === 'REQ-2026-0101' ? 'Complex South' :
              b === 'REQ-2026-0102' ? 'Jubail Site' :
              b === 'REQ-2026-0103' ? 'Logistics Wing' : 'Main Industrial Complex'
            );
            employeeProtocol = meta.protocolType || (
              b === 'REQ-2026-0104' ? 'Periodic Clearance' :
              b === 'REQ-2026-0101' ? 'Annual Comprehensive' :
              b === 'REQ-2026-0102' ? 'Endocrine & Fitness Panel' :
              b === 'REQ-2026-0103' ? 'Contractor Onboarding' : 'Roster Clearance'
            );
            if (req.vendor?.name) {
              employeeAssignedClinic = req.vendor.name;
            } else if (b === 'REQ-2026-0104') {
              employeeAssignedClinic = 'Badr Al Khaleej Polyclinic Co.';
            } else if (b === 'REQ-2026-0101') {
              employeeAssignedClinic = 'Badr Al Khaleej Polyclinic Co.';
            } else if (b === 'REQ-2026-0102') {
              employeeAssignedClinic = 'Gulf Asian Medical Centre';
            } else if (b === 'REQ-2026-0103') {
              employeeAssignedClinic = 'Dina Medical Center';
            }
            if (req.createdAt) {
              employeeRequestedDate = formatDisplayDate(req.createdAt);
            }
            employeeRequestStatus = req.status;
            break;
          }
        }

        let cards = emp.reports.map(rep => {
          const validUntil = rep.validUntil ? new Date(rep.validUntil) : null;
          let daysLeft = 0;
          let cardStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' = 'VALID';

          if (validUntil) {
            const diffMs = validUntil.getTime() - now.getTime();
            daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (daysLeft < 0) {
              cardStatus = 'EXPIRED';
            } else if (daysLeft <= 60) {
              cardStatus = 'EXPIRING_SOON';
            } else {
              cardStatus = 'VALID';
            }
          }

          const shortName = shortNameMap[rep.testId] || rep.test.name.split(' ')[0];

          return {
            id: rep.id,
            testId: rep.testId,
            name: rep.test.name,
            shortName,
            validity: `${rep.test.validityMonths || 12} months`,
            issued: formatDisplayDate(rep.testDate),
            validUntil: formatDisplayDate(rep.validUntil),
            daysLeft,
            status: cardStatus,
            clinicName: rep.vendor?.name || employeeAssignedClinic || 'Accredited Medical Center',
            fileUrl: rep.fileUrl,
            result: rep.result
          };
        });

        // Fallback: If no reports yet, synthesize card from employee's primary request
        if (cards.length === 0 && emp.requests.length > 0) {
          const primaryReq = emp.requests[0];
          const shortName = shortNameMap[primaryReq.testId] || (primaryReq.test?.name ? primaryReq.test.name.split(' ')[0] : 'Fitness');
          cards.push({
            id: primaryReq.id,
            testId: primaryReq.testId,
            name: primaryReq.test?.name || 'Occupational Medical Examination',
            shortName,
            validity: `${primaryReq.test?.validityMonths || 12} months`,
            issued: primaryReq.apptDate ? formatDisplayDate(primaryReq.apptDate) : 'Dispatched',
            validUntil: 'Pending Clinic Submission',
            daysLeft: 30,
            status: 'EXPIRING_SOON',
            clinicName: primaryReq.vendor?.name || employeeAssignedClinic || 'Accredited Medical Center',
            fileUrl: primaryReq.report?.fileUrl || '',
            result: primaryReq.report?.result || 'PENDING'
          });
        }

        let overall: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' = 'VALID';
        if (cards.some(c => c.status === 'EXPIRED')) {
          overall = 'EXPIRED';
        } else if (cards.some(c => c.status === 'EXPIRING_SOON')) {
          overall = 'EXPIRING_SOON';
        }

        return {
          id: emp.employeeNo,
          employeeId: emp.id,
          name: emp.name,
          dept: emp.department || 'LOGISTIC',
          iqamaId: emp.iqamaId,
          batchId: employeeBatchId,
          batchName: employeeBatchName,
          plant: employeePlant,
          protocolType: employeeProtocol,
          requestedDate: employeeRequestedDate,
          assignedClinic: employeeAssignedClinic || 'Accredited Medical Center',
          requestStatus: employeeRequestStatus,
          medicalCards: cards,
          overall
        };
      });

      // Filter to the 70 employees from E10200 to E10269 for the baseline Master Roster
      const candidateMasterRows = allRows.filter(r => {
        const num = parseInt(r.id.replace(/\D/g, ''), 10);
        return num >= 10200 && num <= 10269;
      });

      // Assemble list of all Batches
      const batchDefs = [
        {
          id: 'REQ-2026-0104',
          name: 'Yanpet medical test',
          plant: 'Yanpet Plant',
          protocolType: 'Periodic Clearance',
          requestedDate: '02 Nov 2026',
          assignedClinic: 'Badr Al Khaleej Polyclinic Co.'
        },
        {
          id: 'REQ-2026-0101',
          name: 'Sadara medical test',
          plant: 'Complex South',
          protocolType: 'Annual Comprehensive',
          requestedDate: '28 Oct 2026',
          assignedClinic: 'Badr Al Khaleej Polyclinic Co.'
        },
        {
          id: 'REQ-2026-0102',
          name: 'SABIC medical screening with TSH',
          plant: 'Jubail Site',
          protocolType: 'Endocrine & Fitness Panel',
          requestedDate: '30 Oct 2026',
          assignedClinic: 'Gulf Asian Medical Centre'
        },
        {
          id: 'REQ-2026-0103',
          name: 'General medical fitness',
          plant: 'Logistics Wing',
          protocolType: 'Contractor Onboarding',
          requestedDate: '01 Nov 2026',
          assignedClinic: 'Dina Medical Center'
        }
      ];

      // Add dynamic bulk batches
      const seenBatchIds = new Set(batchDefs.map(b => b.id));
      allRows.forEach(r => {
        if (r.batchId && (r.batchId.startsWith('BULK-') || !seenBatchIds.has(r.batchId))) {
          if (!seenBatchIds.has(r.batchId) && r.batchId !== 'BATCH-CORE') {
            seenBatchIds.add(r.batchId);
            batchDefs.push({
              id: r.batchId,
              name: r.batchName,
              plant: r.plant,
              protocolType: r.protocolType || 'Bulk Intake Batch',
              requestedDate: r.requestedDate || 'Recent',
              assignedClinic: r.assignedClinic || 'Accredited Medical Center'
            });
          }
        }
      });

      // Compute statistics for each batch
      const batches = batchDefs.map(b => {
        const batchEmployees = allRows.filter(r => r.batchId === b.id);
        const total = batchEmployees.length;
        const valid = batchEmployees.filter(r => r.overall === 'VALID').length;
        const expiringSoon = batchEmployees.filter(r => r.overall === 'EXPIRING_SOON').length;
        const expired = batchEmployees.filter(r => r.overall === 'EXPIRED').length;
        // Done count: employees who have completed medical cards with valid fitness
        const done = valid;
        const pending = total - done;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

        return {
          id: b.id,
          name: b.name,
          plant: b.plant,
          protocolType: b.protocolType,
          requestedDate: b.requestedDate,
          assignedClinic: b.assignedClinic,
          totalEmployees: total,
          doneCount: done,
          pendingCount: pending,
          validCount: valid,
          expiringSoonCount: expiringSoon,
          expiredCount: expired,
          completionRate,
          employees: batchEmployees
        };
      });

      // Determine effective rows based on batchId parameter
      let effectiveRows = candidateMasterRows;
      if (batchFilter && batchFilter !== 'ALL') {
        const batchSpecific = allRows.filter(r => r.batchId === batchFilter);
        effectiveRows = batchSpecific.length > 0 ? batchSpecific : candidateMasterRows;
      }

      const kpis = {
        totalEmployees: effectiveRows.length,
        allCardsValid: effectiveRows.filter(r => r.overall === 'VALID').length,
        expiringWithin60: effectiveRows.filter(r => r.overall === 'EXPIRING_SOON').length,
        hasExpiredCard: effectiveRows.filter(r => r.overall === 'EXPIRED').length
      };

      const departments = Array.from(new Set(allRows.map(r => r.dept).filter(Boolean)));

      let filtered = effectiveRows;
      if (search) {
        filtered = filtered.filter(r =>
          r.name.toLowerCase().includes(search) ||
          r.id.toLowerCase().includes(search) ||
          (r.iqamaId && r.iqamaId.includes(search)) ||
          (r.batchName && r.batchName.toLowerCase().includes(search)) ||
          (r.batchId && r.batchId.toLowerCase().includes(search))
        );
      }
      if (department && department !== 'ALL') {
        filtered = filtered.filter(r => r.dept === department);
      }
      if (statusFilter && statusFilter !== 'ALL') {
        filtered = filtered.filter(r => r.overall === statusFilter);
      }

      return res.json({
        kpis,
        departments,
        batches,
        employees: filtered,
        totalShown: filtered.length
      });
    } catch (e: any) {
      console.error('Workforce clearance error:', e);
      return res.status(500).json({ error: e.message });
    }
  }
}
