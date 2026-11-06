import axios from 'axios';

const rawBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const cleanBase = rawBase.replace(/\/+$/, '');
const API_BASE = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor to attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to catch 401 expired sessions
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ecc_token');
      window.dispatchEvent(new CustomEvent('ecc_auth_expired'));
    }
    return Promise.reject(error);
  }
);

export const api = {
  // System Telemetry & Health
  getHealth: () => apiClient.get('/health'),

  // Auth
  login: (data: { username: string; password: string }) => apiClient.post('/auth/login', data),
  me: () => apiClient.get('/auth/me'),
  switchRole: (targetRole: string, vendorId?: string) => apiClient.post('/auth/switch-role', { targetRole, vendorId }),

  // Dashboard
  getMetrics: () => apiClient.get('/dashboard/metrics'),

  // Employees
  searchEmployees: (q: string) => apiClient.get(`/employees/search?q=${encodeURIComponent(q)}`),
  getEmployee: (id: string) => apiClient.get(`/employees/${id}`),
  checkEligibility: (id: string, testId: string) => apiClient.get(`/employees/${id}/eligibility?testId=${testId}`),

  // Master Data
  getDepartments: () => apiClient.get('/masters/departments'),
  getTests: () => apiClient.get('/masters/tests'),
  getClinics: () => apiClient.get('/masters/clinics'),
  getRates: () => apiClient.get('/masters/rates'),

  // Requests
  getRequests: (params?: { status?: string; vendorId?: string; search?: string }) => apiClient.get('/requests', { params }),
  getBatches: () => apiClient.get('/requests/batches'),
  createRequest: (data: any) => apiClient.post('/requests', data),
  bulkCreateRequests: (payload: any) => {
    const data = Array.isArray(payload) ? { requests: payload } : payload;
    return apiClient.post('/requests/bulk', data);
  },
  batchAssignRequests: (requestIds: string[], vendorId: string, apptDate?: string) => apiClient.patch('/requests/batch-assign', { requestIds, vendorId, apptDate }),
  scheduleAppointment: (id: string, apptDate: string, note?: string) => apiClient.patch(`/requests/${id}/schedule`, { apptDate, note }),
  updateRequest: (id: string, data: any) => apiClient.patch(`/requests/${id}`, data),
  cancelRequest: (id: string) => apiClient.patch(`/requests/${id}/cancel`),
  rejectRequest: (id: string, reason?: string) => apiClient.patch(`/requests/${id}/reject`, { reason }),

  // Reports & Workforce Clearance
  getReports: (params?: { result?: string; search?: string }) => apiClient.get('/reports', { params }),
  getWorkforceClearance: (params?: { search?: string; department?: string; status?: string; batchId?: string }) =>
    apiClient.get('/clearance/workforce', { params }),
  submitReportResult: (data: any) => apiClient.post('/reports', data),
  getCertificate: (id: string) => apiClient.get(`/reports/${id}/certificate`),
  uploadBatchReports: (formData: FormData) => apiClient.post('/reports/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  // Invoices
  getInvoices: (params?: { status?: string; vendorId?: string }) => apiClient.get('/invoices', { params }),
  submitInvoice: (data: any) => apiClient.post('/invoices', data),
  auditInvoice: (id: string) => apiClient.get(`/invoices/${id}/audit`),
  clearInvoice: (id: string, data: { sesReference?: string; reviewNotes?: string }) => apiClient.post(`/invoices/${id}/clear`, data),
  rejectInvoice: (id: string, reason: string) => apiClient.post(`/invoices/${id}/reject`, { reason }),

  // Audit Logs
  getAuditLogs: () => apiClient.get('/audit-logs'),

  // Medical Slot Portal & Advance Pre-Booking
  getSlotQueue: (params?: { includeExpired?: boolean }) => apiClient.get('/slots/queue', { params }),
  createSlotRequest: (data: {
    title?: string;
    testId?: string;
    department?: string;
    plant?: string;
    requestedSlots: number;
    needByDate?: string;
    note?: string;
  }) => apiClient.post('/slots/request', data),
  allocateSlots: (id: string, data: { allocations: Record<string, number>; status?: string }) =>
    apiClient.post(`/slots/${id}/allocate`, data),
  getSlotsByClinic: () => apiClient.get('/slots/by-clinic'),
  getSlotsPriceComparison: () => apiClient.get('/slots/price-comparison'),

  // Master Administration & Governance
  admin: {
    getOverview: () => apiClient.get('/admin/overview'),
    getUsers: () => apiClient.get('/admin/users'),
    createUser: (data: any) => apiClient.post('/admin/users', data),
    updateUser: (id: string, data: any) => apiClient.patch(`/admin/users/${id}`, data),
    deleteUser: (id: string) => apiClient.delete(`/admin/users/${id}`),
    createClinic: (data: any) => apiClient.post('/admin/clinics', data),
    updateClinic: (id: string, data: any) => apiClient.patch(`/admin/clinics/${id}`, data),
    createContract: (data: any) => apiClient.post('/admin/contracts', data),
    addContractRate: (data: any) => apiClient.post('/admin/rates', data),
    deleteContractRate: (id: string) => apiClient.delete(`/admin/rates/${id}`),
    getSettings: () => apiClient.get('/admin/settings'),
    updateSettings: (data: any) => apiClient.patch('/admin/settings', data),
    expireSlot: (id: string) => apiClient.post(`/admin/slots/${id}/expire`),
    restoreSlot: (id: string) => apiClient.post(`/admin/slots/${id}/restore`)
  }
};
