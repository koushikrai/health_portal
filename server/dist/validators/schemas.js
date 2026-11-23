"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignBulkSlotSchema = exports.assignSingleSlotSchema = exports.allocateSlotsSchema = exports.createSlotRequestSchema = exports.updateSettingsSchema = exports.addContractRateSchema = exports.createContractSchema = exports.updateClinicSchema = exports.createClinicSchema = exports.updateUserSchema = exports.createUserSchema = exports.rejectInvoiceSchema = exports.clearInvoiceSchema = exports.submitInvoiceSchema = exports.submitReportResultSchema = exports.updateRequestSchema = exports.rejectRequestSchema = exports.scheduleAppointmentSchema = exports.batchAssignSchema = exports.bulkCreateRequestsSchema = exports.bulkCreateItemSchema = exports.createRequestSchema = exports.switchRoleSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username is required'),
    password: zod_1.z.string().min(1, 'Password is required')
});
exports.switchRoleSchema = zod_1.z.object({
    targetRole: zod_1.z.enum(['ADMIN', 'HR', 'REQUESTER', 'CENTRAL', 'CLINIC', 'FINANCE']),
    vendorId: zod_1.z.string().optional().nullable()
});
exports.createRequestSchema = zod_1.z.object({
    employeeId: zod_1.z.string().min(1, 'employeeId is required'),
    testId: zod_1.z.string().min(1, 'testId is required'),
    employeeName: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    needByDate: zod_1.z.string().optional().nullable(),
    note: zod_1.z.any().optional(),
    batchId: zod_1.z.string().optional()
});
exports.bulkCreateItemSchema = zod_1.z.object({
    employeeNo: zod_1.z.string().optional(),
    employeeId: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    employeeName: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    testId: zod_1.z.string().optional(),
    needByDate: zod_1.z.string().optional().nullable(),
    note: zod_1.z.any().optional()
});
exports.bulkCreateRequestsSchema = zod_1.z.object({
    requests: zod_1.z.array(exports.bulkCreateItemSchema).min(1, 'At least one request is required'),
    batchName: zod_1.z.string().optional(),
    fileName: zod_1.z.string().optional().nullable(),
    plant: zod_1.z.string().optional()
});
exports.batchAssignSchema = zod_1.z.object({
    requestIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one requestId is required'),
    vendorId: zod_1.z.string().min(1, 'vendorId is required'),
    apptDate: zod_1.z.string().optional().nullable()
});
exports.scheduleAppointmentSchema = zod_1.z.object({
    apptDate: zod_1.z.string().min(1, 'apptDate is required'),
    note: zod_1.z.string().optional()
});
exports.rejectRequestSchema = zod_1.z.object({
    reason: zod_1.z.string().optional()
});
exports.updateRequestSchema = zod_1.z.object({
    note: zod_1.z.any().optional(),
    apptDate: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['WAITING', 'SUBMITTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional(),
    department: zod_1.z.string().optional(),
    vendorId: zod_1.z.string().optional().nullable()
});
exports.submitReportResultSchema = zod_1.z.object({
    requestId: zod_1.z.string().min(1, 'requestId is required'),
    result: zod_1.z.enum(['FIT', 'UNFIT', 'FIT_WITH_RESTRICTION', 'CONDITIONAL', 'PENDING']),
    testDate: zod_1.z.string().optional(),
    doctorName: zod_1.z.string().optional(),
    remarks: zod_1.z.any().optional(),
    fileUrl: zod_1.z.string().optional()
});
exports.submitInvoiceSchema = zod_1.z.object({
    vendorId: zod_1.z.string().optional(),
    invoiceNo: zod_1.z.string().min(1, 'invoiceNo is required').optional(),
    invoiceNumber: zod_1.z.string().min(1, 'invoiceNumber is required').optional(),
    requestIds: zod_1.z.array(zod_1.z.string()).min(1, 'At least one requestId is required'),
    fileUrl: zod_1.z.string().optional(),
    totalAmount: zod_1.z.number().optional()
}).refine(data => Boolean(data.invoiceNo || data.invoiceNumber), {
    message: 'invoiceNo is required',
    path: ['invoiceNo']
});
exports.clearInvoiceSchema = zod_1.z.object({
    sesReference: zod_1.z.string().optional(),
    reviewNotes: zod_1.z.string().optional()
});
exports.rejectInvoiceSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1, 'Rejection reason is required')
});
exports.createUserSchema = zod_1.z.object({
    username: zod_1.z.string().min(2, 'Username must be at least 2 characters'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
    role: zod_1.z.enum(['ADMIN', 'HR', 'REQUESTER', 'CENTRAL', 'CLINIC', 'FINANCE']),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    vendorId: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional()
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    role: zod_1.z.enum(['ADMIN', 'HR', 'REQUESTER', 'CENTRAL', 'CLINIC', 'FINANCE']).optional(),
    password: zod_1.z.string().min(6).optional().or(zod_1.z.literal('')),
    vendorId: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional()
});
exports.createClinicSchema = zod_1.z.object({
    code: zod_1.z.string().min(2, 'Clinic code is required'),
    name: zod_1.z.string().min(2, 'Clinic name is required'),
    city: zod_1.z.string().optional(),
    sapVendorNo: zod_1.z.string().optional().nullable(),
    crNumber: zod_1.z.string().optional().nullable(),
    vatNumber: zod_1.z.string().optional().nullable(),
    tier: zod_1.z.string().optional(),
    saudization: zod_1.z.coerce.number().optional(),
    notes: zod_1.z.string().optional(),
    contractNo: zod_1.z.string().optional(),
    paymentTerms: zod_1.z.coerce.number().optional(),
    invoicingType: zod_1.z.string().optional(),
    contactEmail: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    contactPhone: zod_1.z.string().optional()
});
exports.updateClinicSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    sapVendorNo: zod_1.z.string().optional().nullable(),
    crNumber: zod_1.z.string().optional().nullable(),
    vatNumber: zod_1.z.string().optional().nullable(),
    tier: zod_1.z.string().optional(),
    saudization: zod_1.z.coerce.number().optional(),
    status: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    contactEmail: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    contactPhone: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional()
});
exports.createContractSchema = zod_1.z.object({
    vendorId: zod_1.z.string().min(1, 'vendorId is required'),
    contractNo: zod_1.z.string().min(1, 'contractNo is required'),
    quoteNo: zod_1.z.string().optional().nullable(),
    startDate: zod_1.z.string().optional(),
    endDate: zod_1.z.string().optional(),
    validFrom: zod_1.z.string().optional(),
    validTo: zod_1.z.string().optional(),
    invoicingType: zod_1.z.string().optional(),
    paymentTerms: zod_1.z.coerce.number().optional(),
    notes: zod_1.z.any().optional(),
    status: zod_1.z.string().optional()
});
exports.addContractRateSchema = zod_1.z.object({
    contractId: zod_1.z.string().min(1, 'contractId is required'),
    testId: zod_1.z.string().min(1, 'testId is required'),
    rate: zod_1.z.coerce.number().positive('Rate must be positive'),
    includesVat: zod_1.z.boolean().optional()
});
exports.updateSettingsSchema = zod_1.z.object({
    slotExpiryDays: zod_1.z.coerce.number().int().positive().optional(),
    autoExpireSlots: zod_1.z.boolean().optional(),
    slotExpiryBasis: zod_1.z.enum(['CREATED_DATE', 'NEED_BY_DATE']).optional(),
    autoArchiveCompleted: zod_1.z.boolean().optional()
});
exports.createSlotRequestSchema = zod_1.z.object({
    requestedSlots: zod_1.z.coerce.number().int().positive('requestedSlots must be a positive integer'),
    title: zod_1.z.string().optional(),
    testId: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    plant: zod_1.z.string().optional(),
    needByDate: zod_1.z.string().optional().nullable(),
    note: zod_1.z.string().optional()
});
exports.allocateSlotsSchema = zod_1.z.object({
    allocations: zod_1.z.record(zod_1.z.string(), zod_1.z.coerce.number().int().nonnegative()),
    status: zod_1.z.string().optional()
});
exports.assignSingleSlotSchema = zod_1.z.object({
    employeeNo: zod_1.z.string().optional(),
    employeeId: zod_1.z.string().optional(),
    name: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    vendorId: zod_1.z.string().optional(),
    apptDate: zod_1.z.string().optional().nullable(),
    note: zod_1.z.string().optional()
});
exports.assignBulkSlotSchema = zod_1.z.object({
    employees: zod_1.z.array(zod_1.z.object({
        employeeNo: zod_1.z.string().optional(),
        id: zod_1.z.string().optional(),
        name: zod_1.z.string().optional(),
        department: zod_1.z.string().optional()
    })).min(1, 'At least one employee is required'),
    vendorId: zod_1.z.string().optional(),
    apptDate: zod_1.z.string().optional().nullable(),
    note: zod_1.z.string().optional()
});
