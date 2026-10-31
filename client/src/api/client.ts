import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
  createRequest: (data: any) => apiClient.post('/requests', data),
  bulkCreateRequests: (requests: any[]) => apiClient.post('/requests/bulk', { requests }),
  batchAssignRequests: (requestIds: string[], vendorId: string) => apiClient.patch('/requests/batch-assign', { requestIds, vendorId }),
  scheduleAppointment: (id: string, apptDate: string) => apiClient.patch(`/requests/${id}/schedule`, { apptDate }),
  cancelRequest: (id: string) => apiClient.patch(`/requests/${id}/cancel`),
  rejectRequest: (id: string, reason?: string) => apiClient.patch(`/requests/${id}/reject`, { reason }),

  // Reports
  getReports: (params?: { result?: string; search?: string }) => apiClient.get('/reports', { params }),
  submitReportResult: (data: any) => apiClient.post('/reports', data),
  getCertificate: (id: string) => apiClient.get(`/reports/${id}/certificate`),

  // Invoices
  getInvoices: (params?: { status?: string; vendorId?: string }) => apiClient.get('/invoices', { params }),
  submitInvoice: (data: any) => apiClient.post('/invoices', data),
  auditInvoice: (id: string) => apiClient.get(`/invoices/${id}/audit`),
  clearInvoice: (id: string, data: { sesReference?: string; reviewNotes?: string }) => apiClient.post(`/invoices/${id}/clear`, data),
  rejectInvoice: (id: string, reason: string) => apiClient.post(`/invoices/${id}/reject`, { reason }),

  // Audit Logs
  getAuditLogs: () => apiClient.get('/audit-logs'),

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
    deleteContractRate: (id: string) => apiClient.delete(`/admin/rates/${id}`)
  }
};
