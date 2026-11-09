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
  const totalReserved = kpis?.activeWorkforce?.value ? Math.round(kpis.activeWorkforce.value * 3.5) : 4200;
  const pendingCount = metrics?.requestsSummary?.waiting ?? 340;

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
            <option>Operations</option>
            <option>Finance</option>
            <option>Engineering</option>
            <option>Logistics</option>
            <option>Sales</option>
            <option>PMTA</option>
          </select>

          <select
            aria-label="Clinic"
            value={selectedClinic}
            onChange={(e) => setSelectedClinic(e.target.value)}
            className="border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary cursor-pointer shadow-2xs font-medium"
          >
            <option>All clinics</option>
            <option>Ar Raji Medical</option>
            <option>Badr Al Khaleej</option>
            <option>Dina Medical</option>
            <option>Gulf Asian</option>
            <option>Jubail Medical</option>
          </select>

          <select
            aria-label="Test type"
            value={selectedTestType}
            onChange={(e) => setSelectedTestType(e.target.value)}
            className="border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary cursor-pointer shadow-2xs font-medium"
          >
            <option>All test types</option>
            <option>Sadara medical test</option>
            <option>SABIC medical screening with TSH</option>
            <option>Yanpet petrochemical periodic test</option>
            <option>General medical fitness</option>
          </select>
        </div>
      </div>

      {/* 2. 5 KPI Summary Cards (Snug & Crisp) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Tests reserved */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Tests reserved</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            {totalReserved.toLocaleString()}
          </div>
          <div className="text-xs text-[#5A6472]">across 9 clinics</div>
        </div>

        {/* Card 2: Slot utilization */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Slot utilization</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            85%
          </div>
          <div className="text-xs text-[#5A6472]">assigned &divide; reserved</div>
        </div>

        {/* Card 3: Completion */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <div className="text-xs text-[#5A6472] font-medium">Completion</div>
          <div className="text-[28px] font-bold text-[#1B2430] my-1 leading-tight tracking-tight">
            63%
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
            4.8%
          </div>
          <div className="text-xs text-[#5A6472]">avg. turnaround 3.2 days</div>
        </div>
      </div>

      {/* 3. Mid Analytical Row: Slot lifecycle (1.1fr) & Needs attention (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        {/* Left Card: Slot lifecycle */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
              Slot lifecycle
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Reserved</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '100%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">4,200</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Assigned</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '85%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">3,570</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Scheduled</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '74%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">3,120</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Completed</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '63%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">2,650</span>
              </div>

              <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 text-[13px]">
                <span className="text-[#1B2430] font-medium">Result received</span>
                <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '55%' }}></div>
                </div>
                <span className="text-right font-semibold text-[#1B2430]">2,310</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-[#5A6472] mt-4 pt-3 border-t border-[#EEF1F4]">
            Click any stage to drill down to department, block, then employee.
          </div>
        </div>

        {/* Right Card: Needs attention */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
              Needs attention
            </h2>
            <div className="divide-y divide-[#EEF1F4]">
              {/* Alert 1 */}
              <div className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                <div>
                  <b className="text-[13px] text-[#1B2430]">3 slot blocks expire in 7 days</b>
                  <div className="text-xs text-[#5A6472] mt-0.5">120 unassigned slots, Procurement</div>
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDECD6] text-[#7A3A05] shrink-0">
                  Expiring
                </span>
              </div>

              {/* Alert 2 */}
              <div className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <b className="text-[13px] text-[#1B2430]">Clinic result delay</b>
                  <div className="text-xs text-[#5A6472] mt-0.5">2 clinics above 5-day turnaround SLA</div>
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBE0DD] text-[#912018] shrink-0">
                  Overdue
                </span>
              </div>

              {/* Alert 3 */}
              <div className="flex items-start justify-between gap-3 py-2.5">
                <div>
                  <b className="text-[13px] text-[#1B2430]">Low assignment</b>
                  <div className="text-xs text-[#5A6472] mt-0.5">4 departments below 60% of reserved</div>
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDECD6] text-[#7A3A05] shrink-0">
                  Low use
                </span>
              </div>

              {/* Alert 4 */}
              <div className="flex items-start justify-between gap-3 py-2.5 last:pb-0">
                <div>
                  <b className="text-[13px] text-[#1B2430]">No-show follow-up</b>
                  <div className="text-xs text-[#5A6472] mt-0.5">85 employees need rescheduling</div>
                </div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DBEAF5] text-[#0F4A73] shrink-0">
                  Action
                </span>
              </div>
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
        {/* Left Card: Departments: assigned vs reserved */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
          <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
            Departments: assigned vs reserved
          </h2>
          <div className="space-y-3">
            <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-[13px]">
              <span className="text-[#1B2430] font-medium">Operations</span>
              <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '92%' }}></div>
              </div>
              <span className="text-right font-semibold text-[#1B2430]">92%</span>
            </div>

            <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-[13px]">
              <span className="text-[#1B2430] font-medium">Finance</span>
              <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '88%' }}></div>
              </div>
              <span className="text-right font-semibold text-[#1B2430]">88%</span>
            </div>

            <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-[13px]">
              <span className="text-[#1B2430] font-medium">Engineering</span>
              <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '79%' }}></div>
              </div>
              <span className="text-right font-semibold text-[#1B2430]">79%</span>
            </div>

            <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-[13px]">
              <span className="text-[#1B2430] font-medium">Logistics</span>
              <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                <div className="h-full bg-[#B45309] rounded-full" style={{ width: '58%' }}></div>
              </div>
              <span className="text-right font-semibold text-[#B45309]">58%</span>
            </div>

            <div className="grid grid-cols-[110px_1fr_60px] items-center gap-3 text-[13px]">
              <span className="text-[#1B2430] font-medium">Sales</span>
              <div className="h-2.5 rounded-full bg-[#E6EBF0] overflow-hidden">
                <div className="h-full bg-[#B45309] rounded-full" style={{ width: '46%' }}></div>
              </div>
              <span className="text-right font-semibold text-[#B45309]">46%</span>
            </div>
          </div>
        </div>

        {/* Right Card: Tests per month vs budget */}
        <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1B2430] mb-3.5">
              Tests per month vs budget
            </h2>
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
                  points="20,110 90,95 160,80 230,70 300,48 370,35"
                />
                {/* Budget Ceiling Line (Dashed) */}
                <line
                  x1="10"
                  y1="45"
                  x2="390"
                  y2="45"
                  stroke="#B45309"
                  strokeWidth="2"
                  strokeDasharray="6 5"
                />
              </svg>
            </div>
          </div>
          <div className="text-xs text-[#5A6472] mt-3 pt-3 border-t border-[#EEF1F4] flex items-center justify-between">
            <span><b>Navy:</b> tests completed</span>
            <span><b className="text-[#B45309]">Dashed:</b> monthly budget ceiling</span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Card: Clinic performance Table */}
      <div className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-3.5">
          <h2 className="text-[15px] font-semibold text-[#1B2430]">
            Clinic performance
          </h2>
          <span className="text-xs text-[#5A6472]">
            Accredited provider turnaround times &amp; SLA compliance
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
              {/* Clinic A */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-semibold text-[#1B2430]">Ar Raji Medical (Clinic A)</td>
                <td className="py-3 px-3 text-[#5A6472]">800</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">712</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">71%</td>
                <td className="py-3 px-3 text-[#5A6472]">2.4 days</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D8F0E3] text-[#0B5132]">
                    On track
                  </span>
                </td>
              </tr>

              {/* Clinic B */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-semibold text-[#1B2430]">Badr Al Khaleej (Clinic B)</td>
                <td className="py-3 px-3 text-[#5A6472]">600</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">588</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">64%</td>
                <td className="py-3 px-3 text-[#5A6472]">5.6 days</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBE0DD] text-[#912018]">
                    SLA breach
                  </span>
                </td>
              </tr>

              {/* Clinic C */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-semibold text-[#1B2430]">Dina Medical (Clinic C)</td>
                <td className="py-3 px-3 text-[#5A6472]">500</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">341</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">58%</td>
                <td className="py-3 px-3 text-[#5A6472]">3.1 days</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#D8F0E3] text-[#0B5132]">
                    On track
                  </span>
                </td>
              </tr>

              {/* Clinic D */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3 font-semibold text-[#1B2430]">Gulf Asian (Clinic D)</td>
                <td className="py-3 px-3 text-[#5A6472]">400</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">390</td>
                <td className="py-3 px-3 text-[#1B2430] font-medium">49%</td>
                <td className="py-3 px-3 text-[#5A6472]">5.2 days</td>
                <td className="py-3 px-3 text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDECD6] text-[#7A3A05]">
                    At risk
                  </span>
                </td>
              </tr>
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
