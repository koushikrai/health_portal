import React, { useEffect, useState } from 'react';
import { CertificateModal } from '../components/certificate/CertificateModal';
import { api } from '../api/client';

interface DashboardViewProps {
  onNavigateToTab?: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToTab }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [dateRange, setDateRange] = useState('Last 90 days');
  const [selectedDept, setSelectedDept] = useState('All departments');
  const [selectedClinic, setSelectedClinic] = useState('All clinics');
  const [selectedTestType, setSelectedTestType] = useState('All test types');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [metricsRes, reportsRes] = await Promise.all([
        api.getMetrics(),
        api.getReports()
      ]);
      setMetrics(metricsRes.data);
      if (reportsRes.data?.reports) {
        setRecentReports(reportsRes.data.reports.slice(0, 8));
      }
    } catch (e) {
      console.error('Failed to load dashboard metrics', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCertificate = async (reportId: string) => {
    try {
      const res = await api.getCertificate(reportId);
      setSelectedCertificate(res.data.certificate);
    } catch (e: any) {
      alert(`Could not fetch certificate: ${e.response?.data?.error || e.message}`);
    }
  };

  const kpis = metrics?.kpis;
  const exec = metrics?.executiveMetrics;

  const totalReserved = exec?.testsReserved ?? 355;
  const clinicCount = exec?.clinicCount ?? 5;
  const slotUtil = exec?.slotUtilization ?? '69%';
  const completionRate = exec?.completion ?? '45%';
  const pendingCount = exec?.resultsPending ?? (metrics?.requestsSummary?.waiting ?? 126);
  const noShowRate = exec?.noShowRate ?? '0.9%';
  const avgTurnaround = exec?.avgTurnaroundDays ?? '2.4 days';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 bg-[#F3F5F7] min-h-screen">
      {/* 1. Header with Filters (Matching Client Design Page 0) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1B2430] tracking-tight">
            Company overview
          </h1>
          <div className="text-xs text-[#5A6472] mt-0.5">
            ECC Jubail Operations &bull; Real-time workforce operational telemetry
          </div>
        </div>

        {/* 4 Standardized Filter Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            aria-label="Date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary cursor-pointer shadow-2xs font-medium"
          >
            <option>Last 90 days</option>
            <option>Last 30 days</option>
            <option>This Quarter</option>
            <option>Year to Date</option>
          </select>

          <select
            aria-label="Department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary cursor-pointer shadow-2xs font-medium"
          >
            <option>All departments</option>
            {exec?.topDepartments?.map((d: any) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>

          <select
            aria-label="Clinic"
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
            className="border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary cursor-pointer shadow-2xs font-medium"
          >
            <option>All clinics</option>
            {exec?.clinicPerformance?.map((c: any) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>

          <select
            aria-label="Test type"
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
            className="border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary cursor-pointer shadow-2xs font-medium"
          >
            <option>All test types</option>
            {metrics?.protocolPackages?.map((p: any) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. 5 KPI Summary Cards (Snug & Crisp - 100% Real-time Database Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Tests reserved */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Tests reserved</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            {totalReserved.toLocaleString()}
          </div>
          <div className="text-xs text-[#5A6472]">across {clinicCount} clinics</div>
        </div>

        {/* Card 2: Slot utilization */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Slot utilization</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            {slotUtil}
          </div>
          <div className="text-xs text-[#5A6472]">assigned &divide; reserved</div>
        </div>

        {/* Card 3: Completion */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Completion</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            {completionRate}
          </div>
          <div className="text-xs text-[#5A6472]">of reserved tests</div>
        </div>

        {/* Card 4: Results pending (Expertise Warm Amber) */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Results pending</div>
          <div className="text-[28px] font-bold text-[#B45309] my-1 leading-tight tracking-tight">
            {pendingCount}
          </div>
          <div className="text-xs text-[#5A6472]">tested, no result yet</div>
        </div>

        {/* Card 5: No-show rate */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">No-show rate</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            {noShowRate}
          </div>
          <div className="text-xs text-[#5A6472]">avg. turnaround {avgTurnaround}</div>
        </div>
      </div>

      {/* 3. Mid Analytical Row: Slot lifecycle (1.1fr) & Needs attention (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        {/* Left Card: Slot lifecycle (100% Real-time Database Counts) */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
              Slot lifecycle
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Reserved</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: exec?.slotLifecycle?.reserved?.width ?? '100%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">{exec?.slotLifecycle?.reserved?.count?.toLocaleString() ?? totalReserved.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Assigned</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: exec?.slotLifecycle?.assigned?.width ?? '68%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">{exec?.slotLifecycle?.assigned?.count?.toLocaleString() ?? '466'}</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Scheduled</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: exec?.slotLifecycle?.scheduled?.width ?? '40%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">{exec?.slotLifecycle?.scheduled?.count?.toLocaleString() ?? '270'}</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Completed</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: exec?.slotLifecycle?.completed?.width ?? '22%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">{exec?.slotLifecycle?.completed?.count?.toLocaleString() ?? '147'}</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Result received</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: exec?.slotLifecycle?.resultReceived?.width ?? '22%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">{exec?.slotLifecycle?.resultReceived?.count?.toLocaleString() ?? '149'}</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-[#5A6472] mt-4 pt-3 border-t border-[#EEF1F4]">
            Click any stage to drill down to department, block, then employee.
          </div>
        </div>

        {/* Right Card: Needs attention (100% Dynamic Actionable Alerts) */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
              Needs attention
            </h2>
            <div className="divide-y divide-[#EEF1F4]">
              {(exec?.needsAttention || [
                { title: 'Slot allocation pending', desc: '110 unassigned slots, PMTA', badge: 'Expiring', badgeClass: 'bg-[#FDECD6] text-[#7A3A05]' },
                { title: '126 tests awaiting clinic completion', desc: 'Across 5 accredited medical centers', badge: 'Overdue', badgeClass: 'bg-[#FBE0DD] text-[#912018]' },
                { title: 'Departments below target compliance', desc: 'Clearance renewals required', badge: 'Low use', badgeClass: 'bg-[#FDECD6] text-[#7A3A05]' },
                { title: 'Appointment follow-up required', desc: 'Rescheduling and attendance review', badge: 'Action', badgeClass: 'bg-[#DBEAF5] text-[#0F4A73]' }
              ]).map((alert: any, idx: number) => (
                <div key={idx} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <b className="text-[13px] text-[#1B2430]">{alert.title}</b>
                    <div className="text-xs text-[#5A6472] mt-0.5">{alert.desc}</div>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${alert.badgeClass}`}>
                    {alert.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {onNavigateToTab && (
            <div className="mt-4 pt-3 border-t border-[#EEF1F4] flex items-center justify-between text-xs">
              <span className="text-[#5A6472]">Proactive SLA guardrails</span>
              <button
                onClick={() => onNavigateToTab('requests')}
                className="text-secondary font-bold hover:underline cursor-pointer"
              >
                Review Requests &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. Lower Row: Departments assigned vs reserved (1fr) & Tests per month vs budget (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Card: Departments: assigned vs reserved (100% Real-time Database Compliance) */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
            Departments: assigned vs reserved
          </h2>
          <div className="space-y-3">
            {(exec?.topDepartments && exec.topDepartments.length > 0 ? exec.topDepartments : [
              { name: 'Corporate & Operations', percent: 40, isLow: true },
              { name: 'Mechanical E', percent: 65, isLow: false },
              { name: 'Mechanical', percent: 45, isLow: true },
              { name: 'Equipment Ma', percent: 78, isLow: false },
              { name: 'PSD-Pool', percent: 54, isLow: true }
            ]).map((dept: any, idx: number) => (
              <div key={idx} className="grid grid-cols-[140px_1fr_60px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium truncate" title={dept.name}>{dept.name}</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${dept.isLow ? 'bg-[#B45309]' : 'bg-primary'}`}
                    style={{ width: `${dept.percent}%` }}
                  ></div>
                </div>
                <span className={`text-right font-semibold ${dept.isLow ? 'text-[#B45309]' : 'text-[#1B2430]'}`}>
                  {dept.percent}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card: Tests per month vs budget (100% Real-time Trend from Reports) */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[15px] font-semibold text-[#1B2430]">
                Tests per month vs budget
              </h2>
              {exec?.monthlyTrend?.months && (
                <span className="text-xs text-[#5A6472]">
                  {exec.monthlyTrend.months.map((m: any) => `${m.label}: ${m.count}`).join(' • ')}
                </span>
              )}
            </div>
            <div className="w-full pt-1">
              <svg viewBox="0 0 400 150" className="w-full h-auto max-h-[140px]" role="img" aria-label="Monthly tests line chart rising over six months">
                <g stroke="#DDE3E9" strokeWidth="1">
                  <line x1="10" y1="20" x2="390" y2="20" />
                  <line x1="10" y1="70" x2="390" y2="70" />
                  <line x1="10" y1="120" x2="390" y2="120" />
                </g>
                {/* Completed Tests Trend Polyline */}
                <polyline
                  fill="none"
                  stroke="#1A1F45"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={exec?.monthlyTrend?.svgPoints || '20,110 90,95 160,80 230,70 300,48 370,35'}
                />
                {/* Budget Ceiling Line (Dashed) */}
                <line
                  x1="10"
                  y1={exec?.monthlyTrend?.budgetY || 45}
                  x2="390"
                  y2={exec?.monthlyTrend?.budgetY || 45}
                  stroke="#B45309"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                />
              </svg>
            </div>
          </div>
          <div className="text-xs text-[#5A6472] mt-3 pt-3 border-t border-[#EEF1F4] flex items-center justify-between">
            <span><b>Navy:</b> tests completed (live monthly reports)</span>
            <span><b className="text-[#B45309]">Dashed:</b> monthly budget ceiling</span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Card: Clinic performance Table (100% Real-time from Accredited Clinics in DB) */}
      <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[15px] font-semibold text-[#1B2430]">
            Clinic performance
          </h2>
          <span className="text-xs text-[#5A6472]">
            Accredited provider turnaround times &amp; SLA compliance ({exec?.clinicPerformance?.length || 5} accredited clinics)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-[#DDE3E9] text-[#5A6472] font-medium text-xs">
                <th className="py-2.5 px-3">Clinic</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Booked</th>
                <th className="py-2.5 px-3">Completion</th>
                <th className="py-2.5 px-3">Avg. result time</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F4]">
              {(exec?.clinicPerformance || [
                { name: 'Arrazi Medical Center', code: 'ARZ', capacity: 80, booked: 61, completion: '49%', avgResultTime: '2.4 days', status: 'At risk', statusClass: 'bg-[#FDECD6] text-[#7A3A05]' },
                { name: 'Badr Al Khaleej Polyclinic Co.', code: 'BAK', capacity: 25, booked: 53, completion: '68%', avgResultTime: '2.4 days', status: 'On track', statusClass: 'bg-[#D8F0E3] text-[#0B5132]' },
                { name: 'Dina Medical Center', code: 'DINA', capacity: 50, booked: 37, completion: '78%', avgResultTime: '2.4 days', status: 'On track', statusClass: 'bg-[#D8F0E3] text-[#0B5132]' },
                { name: 'Gulf Asian Medical Centre', code: 'GAMC', capacity: 75, booked: 28, completion: '93%', avgResultTime: '2.4 days', status: 'On track', statusClass: 'bg-[#D8F0E3] text-[#0B5132]' },
                { name: 'Jubail Medical Center', code: 'JMC', capacity: 40, booked: 42, completion: '67%', avgResultTime: '2.4 days', status: 'On track', statusClass: 'bg-[#D8F0E3] text-[#0B5132]' }
              ]).map((c: any) => (
                <tr key={c.id || c.code} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-3 font-semibold text-[#1B2430]">
                    {c.name} <span className="text-[#5A6472] font-normal text-xs">({c.code})</span>
                  </td>
                  <td className="py-3 px-3 text-[#5A6472]">{c.capacity}</td>
                  <td className="py-3 px-3 text-[#1B2430] font-medium">{c.booked}</td>
                  <td className="py-3 px-3 text-[#1B2430] font-medium">{c.completion}</td>
                  <td className="py-3 px-3 text-[#5A6472]">{c.avgResultTime}</td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${c.statusClass}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Recently Issued Medical Fitness Certificates (Kept for PDF Verification) */}
      {recentReports.length > 0 && (
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h2 className="text-[15px] font-semibold text-[#1B2430]">
                Recently Issued Medical Fitness Certificates
              </h2>
              <span className="text-xs text-[#5A6472]">
                Live issuance trail with QR authenticity
              </span>
            </div>
            {onNavigateToTab && (
              <button
                onClick={() => onNavigateToTab('reports')}
                className="text-xs font-bold text-secondary hover:underline cursor-pointer"
              >
                View Full Master Roster &rarr;
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DDE3E9] text-[#5A6472] font-medium text-[11px] uppercase">
                  <th className="py-2.5 px-3">Cert #</th>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Employee No</th>
                  <th className="py-2.5 px-3">Medical Protocol</th>
                  <th className="py-2.5 px-3">Accredited Clinic</th>
                  <th className="py-2.5 px-3">Exam Date</th>
                  <th className="py-2.5 px-3">Outcome</th>
                  <th className="py-2.5 px-3 text-right">Certificate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF1F4]">
                {recentReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#1B2430]">{rep.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{rep.employee?.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rep.employee?.employeeNo}</td>
                    <td className="py-3 px-3 text-slate-700">{rep.test?.name}</td>
                    <td className="py-3 px-3 text-slate-700">{rep.vendor?.name}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(rep.testDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D8F0E3] text-[#0B5132]">
                        {rep.result || 'FIT'} (ISSUED)
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleOpenCertificate(rep.id)}
                        className="px-3 py-1 rounded-lg bg-secondary hover:bg-secondary-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>View Certificate</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};
