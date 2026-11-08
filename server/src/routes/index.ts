import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { DashboardController } from '../controllers/dashboardController';
import { EmployeeController } from '../controllers/employeeController';
import { MastersController } from '../controllers/mastersController';
import { RequestsController } from '../controllers/requestsController';
import { ReportsController, uploadReportsMulter } from '../controllers/reportsController';
import { InvoicesController } from '../controllers/invoicesController';
import { AuditController } from '../controllers/auditController';
import { AdminController } from '../controllers/adminController';
import { SlotsController } from '../controllers/slotsController';
import { authenticate, requireRole } from '../middlewares/auth';
import { validateBody } from '../middlewares/validate';
import {
  loginSchema,
  switchRoleSchema,
  createRequestSchema,
  bulkCreateRequestsSchema,
  batchAssignSchema,
  scheduleAppointmentSchema,
  rejectRequestSchema,
  updateRequestSchema,
  submitReportResultSchema,
  submitInvoiceSchema,
  clearInvoiceSchema,
  rejectInvoiceSchema,
  createUserSchema,
  updateUserSchema,
  createClinicSchema,
  updateClinicSchema,
  createContractSchema,
  addContractRateSchema,
  updateSettingsSchema,
  createSlotRequestSchema,
  allocateSlotsSchema,
  assignSingleSlotSchema,
  assignBulkSlotSchema
} from '../validators/schemas';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// 0. System Telemetry & 3-Tier Health Check
// ==========================================
router.get('/health', DashboardController.getHealth);

// ==========================================
// 1. Authentication & Session Endpoints
// ==========================================
router.post('/auth/login', validateBody(loginSchema), AuthController.login);
router.get('/auth/me', authenticate, AuthController.me);
router.post('/auth/switch-role', authenticate, requireRole([Role.ADMIN]), validateBody(switchRoleSchema), AuthController.switchRole);

// ==========================================
// 2. Dashboard & KPI Analytics
// ==========================================
router.get(
  '/dashboard/metrics',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE]),
  DashboardController.getMetrics
);

// ==========================================
// 3. Employee Master & Eligibility
// ==========================================
router.get(
  '/employees/search',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE]),
  EmployeeController.search
);
router.get(
  '/employees/:id',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE]),
  EmployeeController.getById
);
router.get(
  '/employees/:id/eligibility',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  EmployeeController.checkEligibility
);

// ==========================================
// 4. Reference & Master Data
// ==========================================
router.get('/masters/departments', authenticate, MastersController.getDepartments);
router.get('/masters/tests', authenticate, MastersController.getTests);
router.get('/masters/clinics', authenticate, MastersController.getClinics);
router.get(
  '/masters/rates',
  authenticate,
  requireRole([Role.CENTRAL, Role.FINANCE]),
  MastersController.getRates
);

// ==========================================
// 5. Medical Clearance Requests & Triage
// ==========================================
router.get('/requests', authenticate, RequestsController.list);
router.get('/requests/batches', authenticate, RequestsController.listBatches);
router.post(
  '/requests',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  validateBody(createRequestSchema),
  RequestsController.create
);
router.post(
  '/requests/bulk',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  validateBody(bulkCreateRequestsSchema),
  RequestsController.bulkCreate
);
router.patch(
  '/requests/batch-assign',
  authenticate,
  requireRole([Role.CENTRAL]),
  validateBody(batchAssignSchema),
  RequestsController.batchAssign
);
router.patch(
  '/requests/:id/schedule',
  authenticate,
  requireRole([Role.CLINIC, Role.CENTRAL, Role.HR, Role.REQUESTER]),
  validateBody(scheduleAppointmentSchema),
  RequestsController.scheduleAppointment
);
router.patch(
  '/requests/:id/cancel',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  RequestsController.cancel
);
router.patch(
  '/requests/:id/reject',
  authenticate,
  requireRole([Role.CENTRAL]),
  validateBody(rejectRequestSchema),
  RequestsController.reject
);
router.patch(
  '/requests/:id',
  authenticate,
  requireRole([Role.CLINIC, Role.CENTRAL]),
  validateBody(updateRequestSchema),
  RequestsController.update
);

// ==========================================
// 6. Reports & Medical Fitness Certificates
// ==========================================
router.get('/reports', authenticate, ReportsController.list);
router.get(
  '/clearance/workforce',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE, Role.ADMIN]),
  ReportsController.getWorkforceClearance
);
router.post(
  '/reports',
  authenticate,
  requireRole([Role.CLINIC]),
  validateBody(submitReportResultSchema),
  ReportsController.submitResult
);
router.post(
  '/reports/bulk-upload',
  authenticate,
  requireRole([Role.CLINIC]),
  uploadReportsMulter.array('files', 150),
  ReportsController.bulkUploadPdf
);
router.get('/reports/:id/certificate', authenticate, ReportsController.getCertificate);
router.get('/reports/:id/file', authenticate, ReportsController.downloadReportFile);

// ==========================================
// 7. Finance Invoicing & 3-Way Match
// ==========================================
router.get(
  '/invoices',
  authenticate,
  requireRole([Role.CLINIC, Role.FINANCE]),
  InvoicesController.list
);
router.post(
  '/invoices',
  authenticate,
  requireRole([Role.CLINIC]),
  validateBody(submitInvoiceSchema),
  InvoicesController.submit
);
router.get(
  '/invoices/:id/audit',
  authenticate,
  requireRole([Role.FINANCE]),
  InvoicesController.audit
);
router.post(
  '/invoices/:id/clear',
  authenticate,
  requireRole([Role.FINANCE]),
  validateBody(clearInvoiceSchema),
  InvoicesController.clear
);
router.post(
  '/invoices/:id/reject',
  authenticate,
  requireRole([Role.FINANCE]),
  validateBody(rejectInvoiceSchema),
  InvoicesController.reject
);

// ==========================================
// 8. Security & System Audit Trail
// ==========================================
router.get(
  '/audit-logs',
  authenticate,
  requireRole([Role.HR, Role.CENTRAL, Role.FINANCE, Role.ADMIN]),
  AuditController.list
);

// ==========================================
// 9. Master Administration & Governance
// ==========================================
router.get('/admin/overview', authenticate, requireRole([Role.ADMIN]), AdminController.getSystemOverview);
router.get('/admin/users', authenticate, requireRole([Role.ADMIN]), AdminController.listUsers);
router.post('/admin/users', authenticate, requireRole([Role.ADMIN]), validateBody(createUserSchema), AdminController.createUser);
router.patch('/admin/users/:id', authenticate, requireRole([Role.ADMIN]), validateBody(updateUserSchema), AdminController.updateUser);
router.delete('/admin/users/:id', authenticate, requireRole([Role.ADMIN]), AdminController.deleteUser);

router.post('/admin/clinics', authenticate, requireRole([Role.ADMIN, Role.CENTRAL]), validateBody(createClinicSchema), AdminController.createClinic);
router.patch('/admin/clinics/:id', authenticate, requireRole([Role.ADMIN, Role.CENTRAL]), validateBody(updateClinicSchema), AdminController.updateClinic);
router.delete('/admin/clinics/:id', authenticate, requireRole([Role.ADMIN]), AdminController.deleteClinic);

router.post('/admin/contracts', authenticate, requireRole([Role.ADMIN, Role.CENTRAL, Role.FINANCE]), validateBody(createContractSchema), AdminController.createContract);
router.post('/admin/rates', authenticate, requireRole([Role.ADMIN, Role.CENTRAL, Role.FINANCE]), validateBody(addContractRateSchema), AdminController.addContractRate);
router.delete('/admin/rates/:id', authenticate, requireRole([Role.ADMIN]), AdminController.deleteContractRate);

router.get('/admin/settings', authenticate, requireRole([Role.ADMIN]), AdminController.getSettings);
router.patch('/admin/settings', authenticate, requireRole([Role.ADMIN]), validateBody(updateSettingsSchema), AdminController.updateSettings);
router.post('/admin/slots/:id/expire', authenticate, requireRole([Role.ADMIN]), AdminController.expireSlot);
router.post('/admin/slots/:id/restore', authenticate, requireRole([Role.ADMIN]), AdminController.restoreSlot);

// ==========================================
// 10. Medical Slot Portal & Advance Pre-Booking
// ==========================================
router.get(
  '/slots/queue',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE]),
  SlotsController.listQueue
);
router.post(
  '/slots/request',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  validateBody(createSlotRequestSchema),
  SlotsController.createRequest
);
router.post(
  '/slots/:id/allocate',
  authenticate,
  requireRole([Role.CENTRAL, Role.HR]),
  validateBody(allocateSlotsSchema),
  SlotsController.allocateSlots
);
router.get(
  '/slots/by-clinic',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE]),
  SlotsController.listByClinic
);
router.get(
  '/slots/price-comparison',
  authenticate,
  requireRole([Role.CENTRAL, Role.FINANCE]),
  SlotsController.priceComparison
);

// Slot Employee Assignments (Single & Bulk Allocation for HR & Central Team)
router.get(
  '/slots/:id/assignments',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL, Role.FINANCE]),
  SlotsController.listAssignments
);
router.post(
  '/slots/:id/assign-single',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  validateBody(assignSingleSlotSchema),
  SlotsController.assignSingle
);
router.post(
  '/slots/:id/assign-bulk',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  validateBody(assignBulkSlotSchema),
  SlotsController.assignBulk
);
router.delete(
  '/slots/:id/assignments/:requestId',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  SlotsController.unassignEmployee
);

export default router;
