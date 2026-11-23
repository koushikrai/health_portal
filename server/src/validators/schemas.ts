import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export const switchRoleSchema = z.object({
  targetRole: z.enum(['ADMIN', 'HR', 'REQUESTER', 'CENTRAL', 'CLINIC', 'FINANCE']),
  vendorId: z.string().optional().nullable()
});

export const createRequestSchema = z.object({
  employeeId: z.string().min(1, 'employeeId is required'),
  testId: z.string().min(1, 'testId is required'),
  employeeName: z.string().optional(),
  department: z.string().optional(),
  needByDate: z.string().optional().nullable(),
  note: z.any().optional(),
  batchId: z.string().optional()
});

export const bulkCreateItemSchema = z.object({
  employeeNo: z.string().optional(),
  employeeId: z.string().optional(),
  name: z.string().optional(),
  employeeName: z.string().optional(),
  department: z.string().optional(),
  testId: z.string().optional(),
  needByDate: z.string().optional().nullable(),
  note: z.any().optional()
});

export const bulkCreateRequestsSchema = z.object({
  requests: z.array(bulkCreateItemSchema).min(1, 'At least one request is required'),
  batchName: z.string().optional(),
  fileName: z.string().optional().nullable(),
  plant: z.string().optional()
});

export const batchAssignSchema = z.object({
  requestIds: z.array(z.string()).min(1, 'At least one requestId is required'),
  vendorId: z.string().min(1, 'vendorId is required'),
  apptDate: z.string().optional().nullable()
});

export const scheduleAppointmentSchema = z.object({
  apptDate: z.string().min(1, 'apptDate is required'),
  note: z.string().optional()
});

export const rejectRequestSchema = z.object({
  reason: z.string().optional()
});

export const updateRequestSchema = z.object({
  note: z.any().optional(),
  apptDate: z.string().optional().nullable(),
  status: z.enum(['WAITING', 'SUBMITTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED']).optional(),
  department: z.string().optional(),
  vendorId: z.string().optional().nullable()
});

export const submitReportResultSchema = z.object({
  requestId: z.string().min(1, 'requestId is required'),
  result: z.enum(['FIT', 'UNFIT', 'FIT_WITH_RESTRICTION', 'CONDITIONAL', 'PENDING']),
  testDate: z.string().optional(),
  doctorName: z.string().optional(),
  remarks: z.any().optional(),
  fileUrl: z.string().optional()
});

export const submitInvoiceSchema = z.object({
  vendorId: z.string().optional(),
  invoiceNo: z.string().min(1, 'invoiceNo is required').optional(),
  invoiceNumber: z.string().min(1, 'invoiceNumber is required').optional(),
  requestIds: z.array(z.string()).min(1, 'At least one requestId is required'),
  fileUrl: z.string().optional(),
  totalAmount: z.number().optional()
}).refine(data => Boolean(data.invoiceNo || data.invoiceNumber), {
  message: 'invoiceNo is required',
  path: ['invoiceNo']
});

export const clearInvoiceSchema = z.object({
  sesReference: z.string().optional(),
  reviewNotes: z.string().optional()
});

export const rejectInvoiceSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required')
});

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'HR', 'REQUESTER', 'CENTRAL', 'CLINIC', 'FINANCE']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  vendorId: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'HR', 'REQUESTER', 'CENTRAL', 'CLINIC', 'FINANCE']).optional(),
  password: z.string().min(6).optional().or(z.literal('')),
  vendorId: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export const createClinicSchema = z.object({
  code: z.string().min(2, 'Clinic code is required'),
  name: z.string().min(2, 'Clinic name is required'),
  city: z.string().optional(),
  sapVendorNo: z.string().optional().nullable(),
  crNumber: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  tier: z.string().optional(),
  saudization: z.coerce.number().optional(),
  notes: z.string().optional(),
  contractNo: z.string().optional(),
  paymentTerms: z.coerce.number().optional(),
  invoicingType: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional()
});

export const updateClinicSchema = z.object({
  name: z.string().optional(),
  city: z.string().optional(),
  sapVendorNo: z.string().optional().nullable(),
  crNumber: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  tier: z.string().optional(),
  saudization: z.coerce.number().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  isActive: z.boolean().optional()
});

export const createContractSchema = z.object({
  vendorId: z.string().min(1, 'vendorId is required'),
  contractNo: z.string().min(1, 'contractNo is required'),
  quoteNo: z.string().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  invoicingType: z.string().optional(),
  paymentTerms: z.coerce.number().optional(),
  notes: z.any().optional(),
  status: z.string().optional()
});

export const addContractRateSchema = z.object({
  contractId: z.string().min(1, 'contractId is required'),
  testId: z.string().min(1, 'testId is required'),
  rate: z.coerce.number().positive('Rate must be positive'),
  includesVat: z.boolean().optional()
});

export const updateSettingsSchema = z.object({
  slotExpiryDays: z.coerce.number().int().positive().optional(),
  autoExpireSlots: z.boolean().optional(),
  slotExpiryBasis: z.enum(['CREATED_DATE', 'NEED_BY_DATE']).optional(),
  autoArchiveCompleted: z.boolean().optional()
});

export const createSlotRequestSchema = z.object({
  requestedSlots: z.coerce.number().int().positive('requestedSlots must be a positive integer'),
  title: z.string().optional(),
  testId: z.string().optional(),
  department: z.string().optional(),
  plant: z.string().optional(),
  needByDate: z.string().optional().nullable(),
  note: z.string().optional()
});

export const allocateSlotsSchema = z.object({
  allocations: z.record(z.string(), z.coerce.number().int().nonnegative()),
  status: z.string().optional()
});

export const assignSingleSlotSchema = z.object({
  employeeNo: z.string().optional(),
  employeeId: z.string().optional(),
  name: z.string().optional(),
  department: z.string().optional(),
  vendorId: z.string().optional(),
  apptDate: z.string().optional().nullable(),
  note: z.string().optional()
});

export const assignBulkSlotSchema = z.object({
  employees: z.array(z.object({
    employeeNo: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    department: z.string().optional()
  })).min(1, 'At least one employee is required'),
  vendorId: z.string().optional(),
  apptDate: z.string().optional().nullable(),
  note: z.string().optional()
});
