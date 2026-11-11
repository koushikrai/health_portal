"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const dashboardController_1 = require("../controllers/dashboardController");
const employeeController_1 = require("../controllers/employeeController");
const mastersController_1 = require("../controllers/mastersController");
const requestsController_1 = require("../controllers/requestsController");
const reportsController_1 = require("../controllers/reportsController");
const invoicesController_1 = require("../controllers/invoicesController");
const auditController_1 = require("../controllers/auditController");
const adminController_1 = require("../controllers/adminController");
const slotsController_1 = require("../controllers/slotsController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const schemas_1 = require("../validators/schemas");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// ==========================================
// 0. System Telemetry & 3-Tier Health Check
// ==========================================
router.get('/health', dashboardController_1.DashboardController.getHealth);
// ==========================================
// 1. Authentication & Session Endpoints
// ==========================================
router.post('/auth/login', (0, validate_1.validateBody)(schemas_1.loginSchema), authController_1.AuthController.login);
router.get('/auth/me', auth_1.authenticate, authController_1.AuthController.me);
router.post('/auth/switch-role', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), (0, validate_1.validateBody)(schemas_1.switchRoleSchema), authController_1.AuthController.switchRole);
// ==========================================
// 2. Dashboard & KPI Analytics
// ==========================================
router.get('/dashboard/metrics', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), dashboardController_1.DashboardController.getMetrics);
// ==========================================
// 3. Employee Master & Eligibility
// ==========================================
router.get('/employees/search', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), employeeController_1.EmployeeController.search);
router.get('/employees/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), employeeController_1.EmployeeController.getById);
router.get('/employees/:id/eligibility', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), employeeController_1.EmployeeController.checkEligibility);
// ==========================================
// 4. Reference & Master Data
// ==========================================
router.get('/masters/departments', auth_1.authenticate, mastersController_1.MastersController.getDepartments);
router.get('/masters/tests', auth_1.authenticate, mastersController_1.MastersController.getTests);
router.get('/masters/clinics', auth_1.authenticate, mastersController_1.MastersController.getClinics);
router.get('/masters/rates', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL, client_1.Role.FINANCE]), mastersController_1.MastersController.getRates);
// ==========================================
// 5. Medical Clearance Requests & Triage
// ==========================================
router.get('/requests', auth_1.authenticate, requestsController_1.RequestsController.list);
router.get('/requests/batches', auth_1.authenticate, requestsController_1.RequestsController.listBatches);
router.post('/requests', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.createRequestSchema), requestsController_1.RequestsController.create);
router.post('/requests/bulk', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.bulkCreateRequestsSchema), requestsController_1.RequestsController.bulkCreate);
router.patch('/requests/batch-assign', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL, client_1.Role.ADMIN]), (0, validate_1.validateBody)(schemas_1.batchAssignSchema), requestsController_1.RequestsController.batchAssign);
router.patch('/requests/:id/schedule', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC, client_1.Role.CENTRAL, client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.ADMIN]), (0, validate_1.validateBody)(schemas_1.scheduleAppointmentSchema), requestsController_1.RequestsController.scheduleAppointment);
router.patch('/requests/:id/cancel', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.ADMIN]), requestsController_1.RequestsController.cancel);
router.patch('/requests/:id/reject', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.rejectRequestSchema), requestsController_1.RequestsController.reject);
router.patch('/requests/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.updateRequestSchema), requestsController_1.RequestsController.update);
// ==========================================
// 6. Reports & Medical Fitness Certificates
// ==========================================
router.get('/reports', auth_1.authenticate, reportsController_1.ReportsController.list);
router.get('/clearance/workforce', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE, client_1.Role.ADMIN]), reportsController_1.ReportsController.getWorkforceClearance);
router.post('/reports', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC]), (0, validate_1.validateBody)(schemas_1.submitReportResultSchema), reportsController_1.ReportsController.submitResult);
router.post('/reports/bulk-upload', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC]), reportsController_1.uploadReportsMulter.array('files', 150), reportsController_1.ReportsController.bulkUploadPdf);
router.get('/reports/:id/certificate', auth_1.authenticate, reportsController_1.ReportsController.getCertificate);
router.get('/reports/:id/file', auth_1.authenticate, reportsController_1.ReportsController.downloadReportFile);
// ==========================================
// 7. Finance Invoicing & 3-Way Match
// ==========================================
router.get('/invoices', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC, client_1.Role.FINANCE]), invoicesController_1.InvoicesController.list);
router.post('/invoices', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC]), (0, validate_1.validateBody)(schemas_1.submitInvoiceSchema), invoicesController_1.InvoicesController.submit);
router.get('/invoices/:id/audit', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.FINANCE]), invoicesController_1.InvoicesController.audit);
router.post('/invoices/:id/clear', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.FINANCE]), (0, validate_1.validateBody)(schemas_1.clearInvoiceSchema), invoicesController_1.InvoicesController.clear);
router.post('/invoices/:id/reject', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.FINANCE]), (0, validate_1.validateBody)(schemas_1.rejectInvoiceSchema), invoicesController_1.InvoicesController.reject);
// ==========================================
// 8. Security & System Audit Trail
// ==========================================
router.get('/audit-logs', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.CENTRAL, client_1.Role.FINANCE, client_1.Role.ADMIN]), auditController_1.AuditController.list);
// ==========================================
// 9. Master Administration & Governance
// ==========================================
router.get('/admin/overview', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.getSystemOverview);
router.get('/admin/users', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.listUsers);
router.post('/admin/users', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), (0, validate_1.validateBody)(schemas_1.createUserSchema), adminController_1.AdminController.createUser);
router.patch('/admin/users/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), (0, validate_1.validateBody)(schemas_1.updateUserSchema), adminController_1.AdminController.updateUser);
router.delete('/admin/users/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.deleteUser);
router.post('/admin/clinics', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.createClinicSchema), adminController_1.AdminController.createClinic);
router.patch('/admin/clinics/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.updateClinicSchema), adminController_1.AdminController.updateClinic);
router.delete('/admin/clinics/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.deleteClinic);
router.post('/admin/contracts', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.CENTRAL, client_1.Role.FINANCE]), (0, validate_1.validateBody)(schemas_1.createContractSchema), adminController_1.AdminController.createContract);
router.post('/admin/rates', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN, client_1.Role.CENTRAL, client_1.Role.FINANCE]), (0, validate_1.validateBody)(schemas_1.addContractRateSchema), adminController_1.AdminController.addContractRate);
router.delete('/admin/rates/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.deleteContractRate);
router.get('/admin/settings', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.getSettings);
router.patch('/admin/settings', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), (0, validate_1.validateBody)(schemas_1.updateSettingsSchema), adminController_1.AdminController.updateSettings);
router.post('/admin/slots/:id/expire', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.expireSlot);
router.post('/admin/slots/:id/restore', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.restoreSlot);
// ==========================================
// 10. Medical Slot Portal & Advance Pre-Booking
// ==========================================
router.get('/slots/queue', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), slotsController_1.SlotsController.listQueue);
router.post('/slots/request', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.createSlotRequestSchema), slotsController_1.SlotsController.createRequest);
router.post('/slots/:id/allocate', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL, client_1.Role.HR]), (0, validate_1.validateBody)(schemas_1.allocateSlotsSchema), slotsController_1.SlotsController.allocateSlots);
router.get('/slots/by-clinic', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), slotsController_1.SlotsController.listByClinic);
router.get('/slots/price-comparison', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL, client_1.Role.FINANCE]), slotsController_1.SlotsController.priceComparison);
// Slot Employee Assignments (Single & Bulk Allocation for HR & Central Team)
router.get('/slots/:id/assignments', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), slotsController_1.SlotsController.listAssignments);
router.post('/slots/:id/assign-single', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.assignSingleSlotSchema), slotsController_1.SlotsController.assignSingle);
router.post('/slots/:id/assign-bulk', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), (0, validate_1.validateBody)(schemas_1.assignBulkSlotSchema), slotsController_1.SlotsController.assignBulk);
router.delete('/slots/:id/assignments/:requestId', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), slotsController_1.SlotsController.unassignEmployee);
exports.default = router;
