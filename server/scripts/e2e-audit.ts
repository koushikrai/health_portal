import app from '../src/index';
import prisma from '../src/prisma';
import http from 'http';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function recordTest(suite: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({
      suite,
      name,
      status: 'PASS',
      durationMs: Date.now() - start
    });
    console.log(`  [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      suite,
      name,
      status: 'FAIL',
      details: err?.message || String(err),
      durationMs: Date.now() - start
    });
    console.error(`  [FAIL] ${name}: ${err?.message || err}`);
  }
}

async function request(
  baseUrl: string,
  method: string,
  endpoint: string,
  options: { token?: string; body?: any; query?: Record<string, string> } = {}
) {
  let url = `${baseUrl}${endpoint}`;
  if (options.query) {
    const q = new URLSearchParams(options.query).toString();
    url += `?${q}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, ok: res.ok, data };
}

async function runAllTests() {
  console.log('====================================================');
  console.log('   EXPERTISE HEALTHCARE PORTAL - END-TO-END QA AUDIT');
  console.log('====================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // 1. Start ephemeral HTTP server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}/api`;
  console.log(`Test HTTP server listening on ${baseUrl}\n`);

  const tokens: Record<string, string> = {};

  try {
    // ==========================================
    // SUITE 1: AUTHENTICATION & CREDENTIALS
    // ==========================================
    console.log('\n--- SUITE 1: AUTHENTICATION & CREDENTIALS ---');

    await recordTest('Auth', 'Login succeeds with valid Admin credentials (admin / Admin@2026)', async () => {
      const res = await request(baseUrl, 'POST', '/auth/login', {
        body: { username: 'admin', password: 'Admin@2026' }
      });
      if (res.status !== 200 || !res.data.token) {
        throw new Error(`Expected 200 with token, got ${res.status}: ${JSON.stringify(res.data)}`);
      }
      tokens.admin = res.data.token;
      if (res.data.user.role !== 'ADMIN') throw new Error(`Role is not ADMIN: ${res.data.user.role}`);
    });

    await recordTest('Auth', 'Login succeeds for all operational roles with Exp@2026', async () => {
      const roles = [
        { u: 'hr', expectedRole: 'HR' },
        { u: 'requester', expectedRole: 'REQUESTER' },
        { u: 'central', expectedRole: 'CENTRAL' },
        { u: 'badr', expectedRole: 'CLINIC' },
        { u: 'finance', expectedRole: 'FINANCE' }
      ];

      for (const r of roles) {
        const res = await request(baseUrl, 'POST', '/auth/login', {
          body: { username: r.u, password: 'Exp@2026' }
        });
        if (res.status !== 200 || !res.data.token) {
          throw new Error(`Login failed for ${r.u} with status ${res.status}`);
        }
        tokens[r.u] = res.data.token;
        if (res.data.user.role !== r.expectedRole) {
          throw new Error(`Role mismatch for ${r.u}: expected ${r.expectedRole}, got ${res.data.user.role}`);
        }
      }
    });

    await recordTest('Auth', 'Login fails with wrong password', async () => {
      const res = await request(baseUrl, 'POST', '/auth/login', {
        body: { username: 'admin', password: 'WrongPassword!2026' }
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await recordTest('Auth', 'Backdoor password (password123) is rejected', async () => {
      const res = await request(baseUrl, 'POST', '/auth/login', {
        body: { username: 'admin', password: 'password123' }
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status} (Backdoor still active!)`);
    });

    await recordTest('Auth', 'Backdoor password (admin123) is rejected for operational users', async () => {
      const res = await request(baseUrl, 'POST', '/auth/login', {
        body: { username: 'hr', password: 'admin123' }
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status} (Backdoor still active!)`);
    });

    await recordTest('Auth', 'Unauthenticated switch-role is rejected (401)', async () => {
      const res = await request(baseUrl, 'POST', '/auth/switch-role', {
        body: { targetRole: 'ADMIN' }
      });
      if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    });

    await recordTest('Auth', 'Non-admin switch-role is rejected (403)', async () => {
      const res = await request(baseUrl, 'POST', '/auth/switch-role', {
        token: tokens.hr,
        body: { targetRole: 'ADMIN' }
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await recordTest('Auth', 'Admin switch-role succeeds (impersonation/testing)', async () => {
      const res = await request(baseUrl, 'POST', '/auth/switch-role', {
        token: tokens.admin,
        body: { targetRole: 'CLINIC', vendorId: 'V1' }
      });
      if (res.status !== 200 || !res.data.token || res.data.user.role !== 'CLINIC') {
        throw new Error(`Admin switch-role failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }
    });

    // ==========================================
    // SUITE 2: ROLE RBAC GUARDRAILS
    // ==========================================
    console.log('\n--- SUITE 2: ROLE RBAC GUARDRAILS ---');

    await recordTest('RBAC', 'HR user blocked from Admin Overview (403)', async () => {
      const res = await request(baseUrl, 'GET', '/admin/overview', { token: tokens.hr });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await recordTest('RBAC', 'Clinic desk blocked from Admin Users list (403)', async () => {
      const res = await request(baseUrl, 'GET', '/admin/users', { token: tokens.badr });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await recordTest('RBAC', 'Finance blocked from creating clearance requests (403)', async () => {
      const res = await request(baseUrl, 'POST', '/requests', {
        token: tokens.finance,
        body: { employeeId: 'H1', testId: '5004959' }
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await recordTest('RBAC', 'Central team blocked from invoice clearance (403)', async () => {
      const res = await request(baseUrl, 'POST', '/invoices/INV-DUMMY/clear', {
        token: tokens.central,
        body: { note: 'Attempting clear' }
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await recordTest('RBAC', 'Clinic user blocked from Central batch-assign (403)', async () => {
      const res = await request(baseUrl, 'PATCH', '/requests/batch-assign', {
        token: tokens.badr,
        body: { requestIds: ['MR-2026-0101'], vendorId: 'V1' }
      });
      if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
    });

    await recordTest('RBAC', 'Admin can access Admin Overview (200)', async () => {
      const res = await request(baseUrl, 'GET', '/admin/overview', { token: tokens.admin });
      if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    });

    // ==========================================
    // SUITE 3: CLINIC ISOLATION & SCOPING
    // ==========================================
    console.log('\n--- SUITE 3: CLINIC ISOLATION & SCOPING ---');

    await recordTest('Clinic Scope', 'Clinic user (badr / V1) only sees requests for V1', async () => {
      const res = await request(baseUrl, 'GET', '/requests', {
        token: tokens.badr,
        query: { vendorId: 'V4' } // Attempt to leak V4 data
      });
      if (res.status !== 200) throw new Error(`Failed to list requests: ${res.status}`);
      const requests = res.data.requests || [];
      const nonV1 = requests.filter((r: any) => r.vendorId !== 'V1');
      if (nonV1.length > 0) {
        throw new Error(`Clinic isolation failed! Found ${nonV1.length} requests for other clinics.`);
      }
    });

    await recordTest('Clinic Scope', 'Clinic user (badr / V1) cannot submit report for V4 request (403)', async () => {
      // Find a request belonging to V4
      const v4Req = await prisma.medicalRequest.findFirst({
        where: { vendorId: 'V4' }
      });

      if (v4Req) {
        const res = await request(baseUrl, 'POST', '/reports', {
          token: tokens.badr,
          body: {
            requestId: v4Req.id,
            result: 'FIT',
            testDate: new Date().toISOString()
          }
        });
        if (res.status !== 403) {
          throw new Error(`Expected 403 Forbidden when badr submits for V4, got ${res.status}`);
        }
      }
    });

    await recordTest('Clinic Scope', 'Clinic user (badr / V1) cannot schedule appointment for V4 request (403)', async () => {
      const v4Req = await prisma.medicalRequest.findFirst({
        where: { vendorId: 'V4' }
      });

      if (v4Req) {
        const res = await request(baseUrl, 'PATCH', `/requests/${v4Req.id}/schedule`, {
          token: tokens.badr,
          body: {
            apptDate: '2026-11-20'
          }
        });
        if (res.status !== 403) {
          throw new Error(`Expected 403 Forbidden when badr schedules for V4, got ${res.status}`);
        }
      }
    });

    await recordTest('Clinic Scope', 'Clinic user (badr / V1) cannot submit invoice for V4 (403)', async () => {
      const res = await request(baseUrl, 'POST', '/invoices', {
        token: tokens.badr,
        body: {
          invoiceNo: 'BAK-HACK-01',
          vendorId: 'V4',
          requestIds: ['MR-2026-0101']
        }
      });
      if (res.status !== 403) {
        throw new Error(`Expected 403 Forbidden when badr passes vendorId=V4, got ${res.status}`);
      }
    });

    // ==========================================
    // SUITE 4: END-TO-END WORKFLOW (HAPPY PATH)
    // ==========================================
    console.log('\n--- SUITE 4: END-TO-END WORKFLOW (HAPPY PATH) ---');

    let createdRequestId = '';
    let reportId = '';
    let submittedInvoiceId = '';

    await recordTest('Workflow', 'Step 1: HR creates a new medical clearance request', async () => {
      // Find active employee
      const emp = await prisma.employee.findFirst();
      if (!emp) throw new Error('Employee not found in database');

      const res = await request(baseUrl, 'POST', '/requests', {
        token: tokens.hr,
        body: {
          employeeId: emp.id,
          testId: '5004959',
          needByDate: '2026-12-01',
          note: 'QA Automated Audit test clearance'
        }
      });

      if (res.status !== 201 || !res.data.request?.id) {
        throw new Error(`Request creation failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }

      createdRequestId = res.data.request.id;
      if (res.data.request.status !== 'WAITING') {
        throw new Error(`Initial status should be WAITING, got ${res.data.request.status}`);
      }
    });

    await recordTest('Workflow', 'Step 2: Check employee clearance eligibility', async () => {
      const emp = await prisma.employee.findFirst();
      const res = await request(baseUrl, 'GET', `/employees/${emp?.id}/eligibility`, {
        token: tokens.hr,
        query: { testId: '5004959' }
      });
      if (res.status !== 200) throw new Error(`Eligibility check failed with status ${res.status}`);
    });

    await recordTest('Workflow', 'Step 3: Central Team assigns clinic and sets appointment date', async () => {
      const res = await request(baseUrl, 'PATCH', '/requests/batch-assign', {
        token: tokens.central,
        body: {
          requestIds: [createdRequestId],
          vendorId: 'V1',
          apptDate: '2026-11-15'
        }
      });

      if (res.status !== 200) {
        throw new Error(`Batch assign failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }

      const updated = await prisma.medicalRequest.findUnique({ where: { id: createdRequestId } });
      if (updated?.status !== 'SCHEDULED' || updated?.vendorId !== 'V1') {
        throw new Error(`Expected SCHEDULED with vendorId V1, got ${updated?.status} / ${updated?.vendorId}`);
      }
    });

    await recordTest('Workflow', 'Step 4: Clinic Desk enters diagnostic results (FIT)', async () => {
      const res = await request(baseUrl, 'POST', '/reports', {
        token: tokens.badr,
        body: {
          requestId: createdRequestId,
          result: 'FIT',
          testDate: '2026-11-15',
          remarks: 'All vital signs, chest X-Ray, audiometry within normal occupational limits.',
          doctorName: 'Dr. Tariq Al-Ghamdi, MD'
        }
      });

      if (res.status !== 201 || !res.data.report?.id) {
        throw new Error(`Report entry failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }

      reportId = res.data.report.id;
      const updatedReq = await prisma.medicalRequest.findUnique({ where: { id: createdRequestId } });
      if (updatedReq?.status !== 'COMPLETED') {
        throw new Error(`Expected request status to be COMPLETED, got ${updatedReq?.status}`);
      }
    });

    await recordTest('Workflow', 'Step 5: Retrieve official Medical Fitness Certificate metadata', async () => {
      const res = await request(baseUrl, 'GET', `/reports/${reportId}/certificate`, {
        token: tokens.badr
      });

      if (res.status !== 200 || !res.data.certificate?.certificateNo) {
        throw new Error(`Certificate retrieval failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }

      if (res.data.certificate.result !== 'FIT') {
        throw new Error(`Certificate result mismatch: expected FIT, got ${res.data.certificate.result}`);
      }
    });

    await recordTest('Workflow', 'Step 6: Clinic submits invoice with 3-way match line items', async () => {
      const res = await request(baseUrl, 'POST', '/invoices', {
        token: tokens.badr,
        body: {
          invoiceNo: `INV-QA-${Date.now()}`,
          vendorId: 'V1',
          requestIds: [createdRequestId]
        }
      });

      if (res.status !== 201 || !res.data.invoice?.id) {
        throw new Error(`Invoice submission failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }

      submittedInvoiceId = res.data.invoice.id;
    });

    await recordTest('Workflow', 'Step 7: Finance conducts 3-way match audit on invoice', async () => {
      const res = await request(baseUrl, 'GET', `/invoices/${submittedInvoiceId}/audit`, {
        token: tokens.finance
      });

      if (res.status !== 200 || !res.data.auditedLines || !res.data.invoice) {
        throw new Error(`Invoice audit failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }
    });

    await recordTest('Workflow', 'Step 8: Finance approves and clears the invoice', async () => {
      const res = await request(baseUrl, 'POST', `/invoices/${submittedInvoiceId}/clear`, {
        token: tokens.finance,
        body: { note: 'QA Audit automated 3-way verification clearance' }
      });

      if (res.status !== 200 || res.data.invoice?.status !== 'CLEARED') {
        throw new Error(`Invoice clearance failed: ${res.status}: ${JSON.stringify(res.data)}`);
      }
    });

    await recordTest('Workflow', 'Step 9: System audit trail records all operational events', async () => {
      const res = await request(baseUrl, 'GET', '/audit-logs', {
        token: tokens.admin
      });

      if (res.status !== 200 || !Array.isArray(res.data.logs)) {
        throw new Error(`Audit logs fetch failed: ${res.status}`);
      }

      const actions = res.data.logs.map((l: any) => l.action);
      const expectedActions = ['CREATE_REQUEST', 'BATCH_ASSIGN_AND_SCHEDULE', 'SUBMIT_REPORT', 'SUBMIT_INVOICE', 'CLEAR_INVOICE'];
      for (const act of expectedActions) {
        if (!actions.includes(act)) {
          throw new Error(`Missing expected audit action in trail: ${act}`);
        }
      }
    });

    // ==========================================
    // SUITE 5: EDGE CASES & INTEGRITY CHECKS
    // ==========================================
    console.log('\n--- SUITE 5: EDGE CASES & INTEGRITY CHECKS ---');

    await recordTest('Edge Case', 'Bulk create reports skipped rows for non-existent employees', async () => {
      const emp = await prisma.employee.findFirst();
      const res = await request(baseUrl, 'POST', '/requests/bulk', {
        token: tokens.hr,
        body: {
          requests: [
            { employeeNo: emp?.employeeNo || '11000008', testId: '5004959' }, // valid
            { employeeNo: 'NON_EXISTENT_IQAMA_99999', testId: '5004959' } // invalid
          ]
        }
      });

      if (res.status !== 200) throw new Error(`Bulk upload failed with ${res.status}`);
      if (!Array.isArray(res.data.skipped) || res.data.skipped.length === 0) {
        throw new Error('Expected skipped array with non-existent employee report');
      }
      if (res.data.skipped[0].employeeNo !== 'NON_EXISTENT_IQAMA_99999') {
        throw new Error(`Skipped row reported wrong employeeNo: ${res.data.skipped[0].employeeNo}`);
      }
    });

    await recordTest('Edge Case', 'Cannot cancel an already COMPLETED clearance request (409)', async () => {
      const res = await request(baseUrl, 'PATCH', `/requests/${createdRequestId}/cancel`, {
        token: tokens.hr
      });
      if (res.status !== 409) {
        throw new Error(`Expected 409 Conflict, got ${res.status}`);
      }
    });

    await recordTest('Edge Case', 'Cannot reject an already COMPLETED clearance request (409)', async () => {
      const res = await request(baseUrl, 'PATCH', `/requests/${createdRequestId}/reject`, {
        token: tokens.central,
        body: { reason: 'Test invalid reject' }
      });
      if (res.status !== 409) {
        throw new Error(`Expected 409 Conflict, got ${res.status}`);
      }
    });

    await recordTest('Edge Case', 'Update rejects invalid status string (400)', async () => {
      const res = await request(baseUrl, 'PATCH', `/requests/${createdRequestId}`, {
        token: tokens.central,
        body: { status: 'INVALID_STATUS_STRING' }
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400 Bad Request for invalid status, got ${res.status}`);
      }
    });

    // Clean up created test record
    if (createdRequestId) {
      try {
        await prisma.invoiceLineItem.deleteMany({ where: { requestId: createdRequestId } });
        if (submittedInvoiceId) {
          await prisma.invoice.delete({ where: { id: submittedInvoiceId } });
        }
        await prisma.medicalReport.deleteMany({ where: { requestId: createdRequestId } });
        await prisma.medicalRequest.delete({ where: { id: createdRequestId } });
      } catch (cleanErr) {
        console.warn('Note: Cleanup of test request completed with warning:', cleanErr);
      }
    }

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  // Print Summary
  console.log('\n====================================================');
  console.log('                 AUDIT SUMMARY REPORT');
  console.log('====================================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL TESTS : ${results.length}`);
  console.log(`PASSED      : ${passed} \x1b[32m✔\x1b[0m`);
  console.log(`FAILED      : ${failed} ${failed > 0 ? '\x1b[31m✘\x1b[0m' : ''}`);
  console.log('====================================================');

  if (failed > 0) {
    console.error('\nFAILURES:');
    results.filter(r => r.status === 'FAIL').forEach(f => {
      console.error(`- [${f.suite}] ${f.name}: ${f.details}`);
    });
    process.exit(1);
  } else {
    console.log('\nALL WORKFLOW, FEATURE, AND GUARDRAIL AUDITS PASSED SUCCESSFULLY!');
  }
}

runAllTests().catch((e) => {
  console.error('Fatal Test Runner Error:', e);
  process.exit(1);
});
