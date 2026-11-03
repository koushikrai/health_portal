"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsController = exports.uploadReportsMulter = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const client_1 = require("@prisma/client");
const auditService_1 = require("../services/auditService");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Disk storage for uploaded PDF reports
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const dir = path_1.default.join(__dirname, '../../uploads/reports');
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || '.pdf';
        const base = path_1.default.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
        cb(null, `${base}_${Date.now()}${ext}`);
    }
});
exports.uploadReportsMulter = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF files are supported'));
        }
    }
});
class ReportsController {
    static async list(req, res) {
        try {
            const { search, result } = req.query;
            const where = {};
            if (result && result !== 'ALL') {
                where.result = result;
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
            const reports = await prisma_1.default.medicalReport.findMany({
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
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async submitResult(req, res) {
        try {
            const { requestId, result, testDate, remarks, fileUrl, doctorName } = req.body;
            if (!requestId || !result) {
                return res.status(400).json({ error: 'requestId and result required' });
            }
            const request = await prisma_1.default.medicalRequest.findUnique({
                where: { id: requestId },
                include: { test: true, employee: true }
            });
            if (!request)
                return res.status(404).json({ error: 'Request not found' });
            if (!request.vendorId)
                return res.status(400).json({ error: 'Request must be assigned to a clinic vendor before result entry' });
            // Guardrail: Ensure request has an assigned clinic vendor
            if (!request.vendorId) {
                return res.status(400).json({ error: 'Request must be assigned to a clinic vendor before result entry' });
            }
            const tDate = testDate ? new Date(testDate) : new Date();
            // Calculate validity expiration date
            let validUntil = null;
            if (request.test.validityMonths > 0) {
                validUntil = new Date(tDate);
                validUntil.setMonth(validUntil.getMonth() + request.test.validityMonths);
            }
            const repCount = await prisma_1.default.medicalReport.count();
            const formattedRemarks = doctorName
                ? `[Examining Physician: ${doctorName}] ${remarks || ''}`
                : (remarks || '');
            // Upsert Report (handles both initial generation and subsequent updates/re-certification)
            const existingReport = await prisma_1.default.medicalReport.findUnique({ where: { requestId } });
            const repId = existingReport?.id || `REP-${String(repCount + 81).padStart(4, '0')}`;
            const report = await prisma_1.default.medicalReport.upsert({
                where: { requestId },
                update: {
                    result: result,
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
                    result: result,
                    testDate: tDate,
                    validUntil,
                    remarks: formattedRemarks,
                    fileUrl: fileUrl || ''
                },
                include: { employee: true, test: true, vendor: true }
            });
            // Update Request status to COMPLETED
            await prisma_1.default.medicalRequest.update({
                where: { id: requestId },
                data: { status: client_1.RequestStatus.COMPLETED }
            });
            await auditService_1.AuditService.log({
                userId: req.user?.id,
                actorName: req.user?.name || 'Clinic',
                role: req.user?.role || 'CLINIC',
                action: 'SUBMIT_REPORT',
                entityType: 'MedicalReport',
                entityId: report.id,
                details: `Submitted test result ${result} for ${request.employee.name} (${request.test.name}). Certificate ${report.id} generated.`
            });
            return res.status(201).json({ report });
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async getCertificate(req, res) {
        try {
            const { id } = req.params;
            const report = await prisma_1.default.medicalReport.findFirst({
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
            if (!report)
                return res.status(404).json({ error: 'Medical report not found' });
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
        }
        catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }
    static async bulkUploadPdf(req, res) {
        try {
            const files = req.files || [];
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
                const firstTest = await prisma_1.default.medicalTest.findFirst({ where: { validityMonths: { gt: 0 } } });
                targetTestId = firstTest?.id || '5004972';
            }
            // Verify vendor exists
            const vendorRecord = await prisma_1.default.vendor.findUnique({ where: { id: clinicVendorId } });
            const clinicName = vendorRecord?.name || 'Accredited Medical Center';
            const matched = [];
            const unmatched = [];
            for (const file of files) {
                // Extract candidate Iqama number from filename (e.g. "2490184822.pdf" or "Iqama_2490184822.pdf")
                const ext = path_1.default.extname(file.originalname);
                const baseName = path_1.default.basename(file.originalname, ext);
                const tenDigitMatch = baseName.match(/\b\d{10}\b/);
                const iqamaCandidate = tenDigitMatch ? tenDigitMatch[0] : baseName.trim();
                // Search for matching employee by iqamaId or employeeNo
                const employee = await prisma_1.default.employee.findFirst({
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
                // Find or create a MedicalRequest for this employee
                let request = await prisma_1.default.medicalRequest.findFirst({
                    where: {
                        employeeId: employee.id,
                        status: { in: [client_1.RequestStatus.WAITING, client_1.RequestStatus.SUBMITTED, client_1.RequestStatus.SCHEDULED] }
                    },
                    orderBy: { createdAt: 'desc' }
                });
                if (!request) {
                    const reqCount = await prisma_1.default.medicalRequest.count();
                    request = await prisma_1.default.medicalRequest.create({
                        data: {
                            id: `MR-2026-${String(reqCount + 100).padStart(4, '0')}`,
                            employeeId: employee.id,
                            testId: targetTestId,
                            vendorId: clinicVendorId,
                            status: client_1.RequestStatus.COMPLETED
                        }
                    });
                }
                const repCount = await prisma_1.default.medicalReport.count();
                const repId = `REP-${String(repCount + 100).padStart(4, '0')}`;
                const relativeUrl = `/uploads/reports/${file.filename}`;
                // Upsert MedicalReport
                const report = await prisma_1.default.medicalReport.upsert({
                    where: { requestId: request.id },
                    update: {
                        vendorId: clinicVendorId,
                        testId: targetTestId,
                        testDate: issueDate,
                        validUntil,
                        fileUrl: relativeUrl,
                        result: client_1.ReportResult.FIT,
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
                        result: client_1.ReportResult.FIT,
                        remarks: `Official PDF Certificate Uploaded [Iqama: ${employee.iqamaId || iqamaCandidate}]`
                    },
                    include: { employee: true, test: true, vendor: true }
                });
                // Mark request as completed
                await prisma_1.default.medicalRequest.update({
                    where: { id: request.id },
                    data: { status: client_1.RequestStatus.COMPLETED }
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
            await auditService_1.AuditService.log({
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
        }
        catch (e) {
            console.error('Bulk upload error:', e);
            return res.status(500).json({ error: e.message || 'Failed to process bulk PDF upload' });
        }
    }
}
exports.ReportsController = ReportsController;
