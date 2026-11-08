import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/layout/HeroBanner';
import { StatCard } from '../components/ui/StatCard';
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
  const [timePeriod, setTimePeriod] = useState('This Month');

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
  const clientVolume = metrics?.clientVolume || [];
  const protocolPackages = metrics?.protocolPackages || [];
  const clinicWorkload = metrics?.clinicWorkload || [];

  // Infinite Scroll State for Fixed-Height Analytical Cards
  const [infiniteClientVolume, setInfiniteClientVolume] = useState<any[]>([]);
  const [infiniteProtocols, setInfiniteProtocols] = useState<any[]>([]);
  const [infiniteClinics, setInfiniteClinics] = useState<any[]>([]);

  useEffect(() => {
    if (clientVolume.length > 0) {
      setInfiniteClientVolume(clientVolume);
    }
  }, [clientVolume]);

  useEffect(() => {
    if (protocolPackages.length > 0) {
      setInfiniteProtocols(protocolPackages);
    }
  }, [protocolPackages]);

  useEffect(() => {
    if (clinicWorkload.length > 0) {
      setInfiniteClinics(clinicWorkload);
    }
  }, [clinicWorkload]);

  const handleScrollInfinite = (
    e: React.UIEvent<HTMLDivElement>,
    originalList: any[],
    setter: React.Dispatch<React.SetStateAction<any[]>>
  ) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (originalList.length > 0 && scrollHeight - scrollTop - clientHeight < 40) {
      setter(prev => [...prev, ...originalList]);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Operations Executive Hero Banner */}
      <HeroBanner
        title="Workforce Medical Clearance &"
        accentText="Gate Pass Governance"
        subtitle="Operational telemetry covering 1,200+ ECC active personnel across Jubail, Yanbu, and Eastern Province client complexes (Sadara, SABIC, Aramco)."
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
        actionButton={{
          label: 'Executive Brief PDF',
          icon: 'download',
          onClick: () => window.print()
        }}
      />

      {/* 2. Operations Quick Hub & Telemetry Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">domain_verification</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm text-slate-900">
                Enterprise Occupational Health Command Hub
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10.5px] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                ACTIVE MONITORING
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live clearance status across 5 accredited partner medical centers and petrochemical gate passes.
            </p>
          </div>
        </div>

        {/* Action Shortcuts */}
        {onNavigateToTab && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateToTab('clinic')}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">local_hospital</span>
              <span>Open Clinic Portal (Client Spec)</span>
            </button>
            <button
              onClick={() => onNavigateToTab('intake')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px] text-secondary">add_circle</span>
              <span>New Request</span>
            </button>
            <button
              onClick={() => onNavigateToTab('requests')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">assignment</span>
              <span>Requests Queue</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. 4 Executive KPI StatCards (Real-Time from PostgreSQL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
        <StatCard
          label="ACTIVE ECC WORKFORCE"
          value={kpis?.activeWorkforce?.value !== undefined ? `${kpis.activeWorkforce.value.toLocaleString()} workers` : (loading ? '...' : '0 workers')}
          trendText={kpis?.activeWorkforce?.trend || 'Live personnel roster'}
          isPositiveTrend={true}
        />

        <StatCard
          label="ACTIVE FIT CERTIFICATES"
          value={kpis?.fitCertificates?.value || (loading ? '...' : '0 Active')}
          trendText={kpis?.fitCertificates?.trend || '100% verified QR authenticity'}
          isPositiveTrend={true}
        />

        <StatCard
          label="IN-FLIGHT CLEARANCES"
          value={kpis?.inFlightRequests?.value || (loading ? '...' : '0 In-Flight')}
          trendText={`${metrics?.requestsSummary?.waiting ?? 0} awaiting clinic triage`}
          isPositiveTrend={false}
        />

        <StatCard
          label="RENEWALS REQUIRED (<30D)"
          value={kpis?.expiringRenewals?.value || (loading ? '...' : '0 Expiring')}
          trendText={kpis?.expiringRenewals?.trend || 'Automated reminders sent'}
          isPositiveTrend={false}
        />
      </div>

      {/* 4. Macro Analytical Breakdown Grids (Fixed Uniform Height + Infinite Scroll) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Card 1: Client Complex Volume Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col h-[385px] justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Client Complex Volume
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Active Contracts
            </span>
          </div>

          <div
            onScroll={(e) => handleScrollInfinite(e, clientVolume, setInfiniteClientVolume)}
            className="flex-1 overflow-y-auto pr-1 my-2.5 space-y-3.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {infiniteClientVolume.map((item: any, idx: number) => (
              <div key={`${item.code}-${idx}`}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700">{item.client}</span>
                  <span className="text-slate-900 font-bold">{item.count} passes ({item.percent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span>Aggregated gate clearance passes</span>
            <span className="font-bold text-slate-700">100% CCHI Verified</span>
          </div>
        </div>

        {/* Card 2: Medical Protocol Demand (Replaces Department Compliance) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col h-[385px] justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Medical Protocol Demand
            </h3>
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              SAP Material Master
            </span>
          </div>

          <div
            onScroll={(e) => handleScrollInfinite(e, protocolPackages, setInfiniteProtocols)}
            className="flex-1 overflow-y-auto pr-1 my-2.5 space-y-3.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {infiniteProtocols.map((item: any, idx: number) => (
              <div key={`${item.id}-${idx}`}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <div className="flex items-center gap-1.5 truncate mr-2">
                    <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                      #{item.code}
                    </span>
                    <span className="text-slate-700 truncate">{item.name}</span>
                  </div>
                  <span className="text-slate-900 font-bold shrink-0">{item.count} req ({item.percent}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color || 'bg-secondary'}`}
                    style={{ width: `${Math.min(100, Math.max(6, item.percent))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span>Active Protocol Coverage</span>
            <span className="font-bold text-emerald-600">100% Accredited Standards</span>
          </div>
        </div>

        {/* Card 3: Clinic Partner Workload Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col h-[385px] justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Clinic Partner Workload
            </h3>
            <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              5 Facilities
            </span>
          </div>

          <div
            onScroll={(e) => handleScrollInfinite(e, clinicWorkload, setInfiniteClinics)}
            className="flex-1 overflow-y-auto pr-1 my-2.5 space-y-3.5 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {infiniteClinics.map((item: any, idx: number) => (
              <div key={`${item.id || item.code}-${idx}`}>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-700 truncate mr-2">{item.code} - {item.name}</span>
                  <span className="text-slate-900 font-bold shrink-0">{item.assigned ?? item.count} exams</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, Math.max(10, item.utilization || item.share || 20))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span>SAP Contract Allocation</span>
            <span className="font-bold text-slate-700">Balanced Capacity</span>
          </div>
        </div>
      </div>

      {/* 5. Recently Issued Medical Fitness Certificates (Live Database Table) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-primary">verified</span>
            <h3 className="font-display font-extrabold text-sm text-slate-900">
              Recently Issued Medical Fitness Certificates
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Live issuance trail from PostgreSQL
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10.5px]">
              <tr>
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
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No issued medical reports in database yet.
                  </td>
                </tr>
              ) : (
                recentReports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{rep.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{rep.employee?.name}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">{rep.employee?.employeeNo}</td>
                    <td className="py-3 px-3 text-slate-700">{rep.test?.name}</td>
                    <td className="py-3 px-3 text-slate-700">{rep.vendor?.name}</td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(rep.testDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
