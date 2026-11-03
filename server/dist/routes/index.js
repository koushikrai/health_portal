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
const auth_1 = require("../middlewares/auth");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// ==========================================
// 1. Authentication & Session Endpoints
// ==========================================
router.post('/auth/login', authController_1.AuthController.login);
router.get('/auth/me', auth_1.authenticate, authController_1.AuthController.me);
router.post('/auth/switch-role', authController_1.AuthController.switchRole);
// ==========================================
// 2. Dashboard & KPI Analytics
// ==========================================
router.get('/dashboard/metrics', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL, client_1.Role.FINANCE]), dashboardController_1.DashboardController.getMetrics);
// ==========================================
// 3. Employee Master & Eligibility
// ==========================================
router.get('/employees/search', auth_1.authenticate, employeeController_1.EmployeeController.search);
router.get('/employees/:id', auth_1.authenticate, employeeController_1.EmployeeController.getById);
router.get('/employees/:id/eligibility', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), employeeController_1.EmployeeController.checkEligibility);
// ==========================================
// 4. Reference & Master Data
// ==========================================
router.get('/masters/departments', auth_1.authenticate, mastersController_1.MastersController.getDepartments);
router.get('/masters/tests', auth_1.authenticate, mastersController_1.MastersController.getTests);
router.get('/masters/clinics', auth_1.authenticate, mastersController_1.MastersController.getClinics);
router.get('/masters/rates', auth_1.authenticate, mastersController_1.MastersController.getRates);
// ==========================================
// 5. Medical Clearance Requests & Triage
// ==========================================
router.get('/requests', auth_1.authenticate, requestsController_1.RequestsController.list);
router.post('/requests', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), requestsController_1.RequestsController.create);
router.post('/requests/bulk', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), requestsController_1.RequestsController.bulkCreate);
router.patch('/requests/batch-assign', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL]), requestsController_1.RequestsController.batchAssign);
router.patch('/requests/:id/schedule', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC, client_1.Role.CENTRAL, client_1.Role.HR, client_1.Role.REQUESTER]), requestsController_1.RequestsController.scheduleAppointment);
router.patch('/requests/:id/cancel', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.REQUESTER, client_1.Role.CENTRAL]), requestsController_1.RequestsController.cancel);
router.patch('/requests/:id/reject', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CENTRAL]), requestsController_1.RequestsController.reject);
router.patch('/requests/:id', auth_1.authenticate, requestsController_1.RequestsController.update);
// ==========================================
// 6. Reports & Medical Fitness Certificates
// ==========================================
router.get('/reports', auth_1.authenticate, reportsController_1.ReportsController.list);
router.post('/reports', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC]), reportsController_1.ReportsController.submitResult);
router.post('/reports/bulk-upload', auth_1.authenticate, reportsController_1.uploadReportsMulter.array('files', 150), reportsController_1.ReportsController.bulkUploadPdf);
router.get('/reports/:id/certificate', auth_1.authenticate, reportsController_1.ReportsController.getCertificate);
// ==========================================
// 7. Finance Invoicing & 3-Way Match
// ==========================================
router.get('/invoices', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC, client_1.Role.FINANCE]), invoicesController_1.InvoicesController.list);
router.post('/invoices', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.CLINIC]), invoicesController_1.InvoicesController.submit);
router.get('/invoices/:id/audit', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.FINANCE]), invoicesController_1.InvoicesController.audit);
router.post('/invoices/:id/clear', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.FINANCE]), invoicesController_1.InvoicesController.clear);
router.post('/invoices/:id/reject', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.FINANCE]), invoicesController_1.InvoicesController.reject);
// ==========================================
// 8. Security & System Audit Trail
// ==========================================
router.get('/audit-logs', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.HR, client_1.Role.CENTRAL, client_1.Role.FINANCE]), auditController_1.AuditController.list);
// ==========================================
// 9. Master Administration & Governance
// ==========================================
router.get('/admin/overview', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.getSystemOverview);
router.get('/admin/users', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.listUsers);
router.post('/admin/users', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.createUser);
router.patch('/admin/users/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.updateUser);
router.delete('/admin/users/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.deleteUser);
router.post('/admin/clinics', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.createClinic);
router.patch('/admin/clinics/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.updateClinic);
router.post('/admin/contracts', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.createContract);
router.post('/admin/rates', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.addContractRate);
router.delete('/admin/rates/:id', auth_1.authenticate, (0, auth_1.requireRole)([client_1.Role.ADMIN]), adminController_1.AdminController.deleteContractRate);
exports.default = router;
