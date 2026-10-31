import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { DashboardController } from '../controllers/dashboardController';
import { EmployeeController } from '../controllers/employeeController';
import { MastersController } from '../controllers/mastersController';
import { RequestsController } from '../controllers/requestsController';
import { ReportsController } from '../controllers/reportsController';
import { InvoicesController } from '../controllers/invoicesController';
import { AuditController } from '../controllers/auditController';
import { AdminController } from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/auth';
import { Role } from '@prisma/client';

const router = Router();

// ==========================================
// 1. Authentication & Session Endpoints
// ==========================================
router.post('/auth/login', AuthController.login);
router.get('/auth/me', authenticate, AuthController.me);
router.post('/auth/switch-role', AuthController.switchRole);

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
router.get('/employees/search', authenticate, EmployeeController.search);
router.get('/employees/:id', authenticate, EmployeeController.getById);
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
router.get('/masters/rates', authenticate, MastersController.getRates);

// ==========================================
// 5. Medical Clearance Requests & Triage
// ==========================================
router.get('/requests', authenticate, RequestsController.list);
router.post(
  '/requests',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  RequestsController.create
);
router.post(
  '/requests/bulk',
  authenticate,
  requireRole([Role.HR, Role.REQUESTER, Role.CENTRAL]),
  RequestsController.bulkCreate
);
router.patch(
  '/requests/batch-assign',
  authenticate,
  requireRole([Role.CENTRAL]),
  RequestsController.batchAssign
);
router.patch(
  '/requests/:id/schedule',
  authenticate,
  requireRole([Role.CLINIC]),
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
  RequestsController.reject
);

// ==========================================
// 6. Reports & Medical Fitness Certificates
// ==========================================
router.get('/reports', authenticate, ReportsController.list);
router.post(
  '/reports',
  authenticate,
  requireRole([Role.CLINIC]),
  ReportsController.submitResult
);
router.get('/reports/:id/certificate', authenticate, ReportsController.getCertificate);

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
  InvoicesController.clear
);
router.post(
  '/invoices/:id/reject',
  authenticate,
  requireRole([Role.FINANCE]),
  InvoicesController.reject
);

// ==========================================
// 8. Security & System Audit Trail
// ==========================================
router.get(
  '/audit-logs',
  authenticate,
  requireRole([Role.HR, Role.CENTRAL, Role.FINANCE]),
  AuditController.list
);

// ==========================================
// 9. Master Administration & Governance
// ==========================================
router.get('/admin/overview', authenticate, requireRole([Role.ADMIN]), AdminController.getSystemOverview);
router.get('/admin/users', authenticate, requireRole([Role.ADMIN]), AdminController.listUsers);
router.post('/admin/users', authenticate, requireRole([Role.ADMIN]), AdminController.createUser);
router.patch('/admin/users/:id', authenticate, requireRole([Role.ADMIN]), AdminController.updateUser);
router.delete('/admin/users/:id', authenticate, requireRole([Role.ADMIN]), AdminController.deleteUser);

router.post('/admin/clinics', authenticate, requireRole([Role.ADMIN]), AdminController.createClinic);
router.patch('/admin/clinics/:id', authenticate, requireRole([Role.ADMIN]), AdminController.updateClinic);

router.post('/admin/contracts', authenticate, requireRole([Role.ADMIN]), AdminController.createContract);
router.post('/admin/rates', authenticate, requireRole([Role.ADMIN]), AdminController.addContractRate);
router.delete('/admin/rates/:id', authenticate, requireRole([Role.ADMIN]), AdminController.deleteContractRate);

export default router;
