import { Request, Response } from 'express';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { RequestRepository } from '../repositories/requestRepository';
import { ReportRepository } from '../repositories/reportRepository';
import { VendorRepository } from '../repositories/vendorRepository';
import { InvoiceRepository } from '../repositories/invoiceRepository';
import { UserRepository } from '../repositories/userRepository';
import { AuditRepository } from '../repositories/auditRepository';
import { MasterRepository } from '../repositories/masterRepository';

export class DashboardController {
  static async getHealth(req: Request, res: Response) {
    try {
      const dbStart = Date.now();
      const [empCount, reqCount, repCount, venCount, invCount, usrCount, logCount] = await Promise.all([
        EmployeeRepository.countAll(),
        RequestRepository.count(),
        ReportRepository.count(),
        VendorRepository.count(),
        InvoiceRepository.count(),
        UserRepository.count(),
        AuditRepository.count()
      ]);
      const dbLatencyMs = Date.now() - dbStart;

      return res.json({
        status: 'ONLINE',
        tier: '3-Tier Production Architecture Active',
        gateway: 'Local Express Server (Port 5000)',
        database: {
          engine: 'PostgreSQL (Neon Serverless)',
          connection: 'HEALTHY',
          latencyMs: `${dbLatencyMs}ms`
        },
        records: {
          employees: empCount,
          requests: reqCount,
          reports: repCount,
          clinics: venCount,
          invoices: invCount,
          users: usrCount,
          auditLogs: logCount
        },
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      return res.status(500).json({
        status: 'DEGRADED',
        error: e.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  static async getMetrics(req: Request, res: Response) {
    try {
      // 1. Core Medical Clearance Counts via Data Tier Repositories
      const totalEmployees = await EmployeeRepository.countActive();
      const totalRequests = await RequestRepository.count();
      const waitingRequests = await RequestRepository.count({ status: 'WAITING' });
      const scheduledRequests = await RequestRepository.count({ status: 'SCHEDULED' });
      const completedRequests = await RequestRepository.count({ status: 'COMPLETED' });

      const fitReports = await ReportRepository.count({ result: 'FIT' });
      const pendingInvoices = await InvoiceRepository.count({ status: 'SUBMITTED' });
      const pendingInvoiceSum = await InvoiceRepository.aggregateSum({ status: 'SUBMITTED' });
      const pendingTotalSAR = pendingInvoiceSum._sum.totalAmount != null
        ? `SAR ${Number(pendingInvoiceSum._sum.totalAmount).toFixed(2)}`
        : 'SAR 0.00';

      const now = new Date();
      const in30Days = new Date();
      in30Days.setDate(in30Days.getDate() + 30);

      const expiringSoon = await ReportRepository.count({
        validUntil: {
          gte: now,
          lte: in30Days
        }
      });

      // 2. Clearance Volume by Industrial Client / Facility (Aggregated purely from real database records)
      const requestsWithClient = await RequestRepository.findRequestsWithClientFields();

      const siteBuckets: Record<string, { client: string; count: number; target: number }> = {
        SADARA: { client: 'Sadara Complex (Jubail)', count: 0, target: 100 },
        SABIC: { client: 'SABIC Affiliates & Yanpet', count: 0, target: 80 },
        ARAMCO: { client: 'Saudi Aramco Sites', count: 0, target: 60 },
        PETROKEMYA: { client: 'PetroKemya Plants', count: 0, target: 40 },
        RC: { client: 'Royal Commission Projects', count: 0, target: 40 }
      };

      requestsWithClient.forEach(r => {
        const text = `${r.test?.name || ''} ${r.note || ''} ${r.department || ''}`.toUpperCase();
        if (text.includes('SADARA')) siteBuckets.SADARA.count++;
        else if (text.includes('SABIC') || text.includes('YANPET')) siteBuckets.SABIC.count++;
        else if (text.includes('ARAMCO')) siteBuckets.ARAMCO.count++;
        else if (text.includes('PETRO') || text.includes('KEMYA')) siteBuckets.PETROKEMYA.count++;
        else siteBuckets.RC.count++;
      });

      const clientVolume = Object.entries(siteBuckets).map(([code, s]) => {
        const total = s.count;
        const percent = s.target > 0 ? Math.min(100, Math.round((total / s.target) * 100)) : 0;
        return {
          client: s.client,
          code,
          count: total,
          target: s.target,
          percent
        };
      });

      // 3. Medical Protocol & Test Package Demand (Dynamically aggregated from Requests & Test Master)
      const testCounts = await RequestRepository.groupByTestId();
      const allTests = await MasterRepository.listAllTests();
      const totalTestRequests = testCounts.reduce((acc, c) => acc + c._count.id, 0) || 1;

      const protocolPackages = testCounts.map(tc => {
        const testObj = allTests.find(t => t.id === tc.testId);
        const name = testObj?.name || `Package #${tc.testId}`;
        const count = tc._count.id;
        const percent = Math.round((count / totalTestRequests) * 100);
        return {
          id: tc.testId,
          code: tc.testId,
          name,
          count,
          percent,
          validityMonths: testObj?.validityMonths || 12,
          color: tc.testId === '5004959' ? 'bg-secondary' : tc.testId === '5004955' ? 'bg-emerald-500' : tc.testId === '5004972' ? 'bg-blue-600' : 'bg-primary'
        };
      });

      // Department Medical Compliance: Aggregated from active employees and real valid reports in PostgreSQL
      const { deptCounts, clearedReports } = await EmployeeRepository.getActiveDepartmentCountsAndCleared(now);

      const deptMap: Record<string, { total: number; cleared: number }> = {};
      deptCounts.forEach(dc => {
        const d = dc.department || 'General Operations';
        if (!deptMap[d]) deptMap[d] = { total: 0, cleared: 0 };
        deptMap[d].total += dc._count.id;
      });

      const seenClearedEmpIds = new Set<string>();
      clearedReports.forEach(rep => {
        if (seenClearedEmpIds.has(rep.employeeId)) return;
        seenClearedEmpIds.add(rep.employeeId);
        const d = rep.employee?.department || 'General Operations';
        if (!deptMap[d]) deptMap[d] = { total: 1, cleared: 0 };
        deptMap[d].cleared++;
      });

      const departmentCompliance = Object.entries(deptMap).map(([name, stat]) => {
        const percent = stat.total > 0 ? Math.round((stat.cleared / stat.total) * 100) : 0;
        return {
          name,
          total: stat.total,
          cleared: stat.cleared,
          percent,
          status: percent >= 90 ? 'Optimal' : percent >= 75 ? 'Compliant' : 'Action Needed'
        };
      });

      // 4. Accredited Clinic Quotas & Capacity (Queried directly from live database vendors & slots)
      const clinics = await VendorRepository.listWithSlotsAndRequests();

      const clinicWorkload = clinics.map(c => {
        const capacity = c.slots[0]?.totalCapacity ?? 50;
        const assigned = c.requests.length;
        const available = Math.max(0, capacity - assigned);
        const utilization = capacity > 0 ? Math.round((assigned / capacity) * 100) : 0;

        return {
          id: c.id,
          code: c.code,
          name: c.name,
          sapVendorNo: c.sapVendorNo,
          crNumber: c.crNumber,
          capacity,
          assigned,
          available,
          utilization
        };
      });

      return res.json({
        kpis: {
          activeWorkforce: {
            value: totalEmployees,
            trend: `${totalEmployees} Registered active workforce`
          },
          fitCertificates: {
            value: `${fitReports} Active`,
            trend: `${fitReports} Valid clearance certificates`
          },
          inFlightRequests: {
            value: `${waitingRequests + scheduledRequests} In-Flight`,
            waiting: waitingRequests,
            scheduled: scheduledRequests
          },
          expiringRenewals: {
            value: `${expiringSoon} Expiring`,
            warningText: `${expiringSoon} certificates <30 days`,
            auditBar: 'Live Database Synced'
          },
          pendingInvoices: {
            value: `${pendingInvoices} Pending`,
            subtotalSAR: pendingTotalSAR,
            targetText: 'Awaiting SES Clearance'
          }
        },
        requestsSummary: {
          total: totalRequests,
          waiting: waitingRequests,
          scheduled: scheduledRequests,
          completed: completedRequests,
          pendingInvoices
        },
        clientVolume,
        protocolPackages,
        departmentCompliance,
        clinicWorkload
      });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }
}
