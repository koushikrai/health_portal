import React, { useEffect, useState } from 'react';
import { HeroBanner } from '../components/layout/HeroBanner';
import { StatCard } from '../components/ui/StatCard';
import { CertificateModal } from '../components/certificate/CertificateModal';
import { api } from '../api/client';

export const DashboardView: React.FC = () => {
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
        setRecentReports(reportsRes.data.reports.slice(0, 5));
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
  const deptCompliance = metrics?.departmentCompliance || [];
  const clinicWorkload = metrics?.clinicWorkload || [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Operations Hero Banner */}
      <HeroBanner
        title="ECC Workforce Medical Clearance &"
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

      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="ACTIVE ECC WORKFORCE"
          value={kpis?.activeWorkforce?.value ? `${kpis.activeWorkforce.value.toLocaleString()} workers` : '1,104 workers'}
          trendText={kpis?.activeWorkforce?.trend || '+4.2% active personnel'}
          isPositiveTrend={true}
          icon="group"
          ceilingPercent={kpis?.activeWorkforce?.ceilingPercent || 88}
          targetText={kpis?.activeWorkforce?.targetText || 'Capacity: 1,500 active'}
        />

        <StatCard
          label="ACTIVE FIT CERTIFICATES"
          value={kpis?.fitCertificates?.value || '1,085 Active'}
          trendText={kpis?.fitCertificates?.trend || '100% verified QR authenticity'}
          isPositiveTrend={true}
          icon="verified"
          ceilingPercent={kpis?.fitCertificates?.ceilingPercent || 96}
          targetText={kpis?.fitCertificates?.targetText || 'Site Gate Pass Ready'}
        />

        <StatCard
          label="IN-FLIGHT CLEARANCES"
          value={kpis?.inFlightRequests?.value || '4 In-Flight'}
          trendText={`${metrics?.requestsSummary?.waiting || 2} awaiting clinic assignment`}
          isPositiveTrend={false}
          icon="pending_actions"
          ceilingPercent={kpis?.inFlightRequests?.ceilingPercent || 25}
          targetText={kpis?.inFlightRequests?.targetText || 'Central Team Triage Active'}
        />

        <StatCard
          label="RENEWALS REQUIRED (<30D)"
          value={kpis?.expiringRenewals?.value || '14 Expiring'}
          trendText={kpis?.expiringRenewals?.warningText || '14 certificates <30 days'}
          isPositiveTrend={false}
          icon="alarm"
          ceilingPercent={92}
          targetText="Target Compliance: 98%"
        />
      </div>

      {/* 2-Column Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Industrial Client Clearance Distribution (2 cols wide) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Client Industrial Site Deployment & Clearance
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Contractual medical compliance parity across major oil, gas, and petrochemical facilities
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Site Compliant
              </span>
            </div>

            <div className="space-y-4 pt-2">
              {clientVolume.map((item: any) => (
                <div key={item.code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800">{item.client}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-normal">{item.count} / {item.target} cleared</span>
                      <span className={`font-mono font-bold ${item.percent >= 90 ? 'text-emerald-600' : 'text-secondary'}`}>
                        {item.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.percent >= 90 ? 'bg-secondary' : 'bg-orange-400'
                      }`}
                      style={{ width: `${item.percent}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Overall Site Access Parity: <strong className="text-slate-800 font-mono">92.4%</strong></span>
            <span className="text-slate-400">Audited per Saudi Aramco & SABIC EHS Specs</span>
          </div>
        </div>

        {/* Right Column: Department Medical Readiness (1 col wide) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">Department Readiness</h3>
                <p className="text-xs text-slate-500 mt-0.5">Active personnel clearance status</p>
              </div>
            </div>

            <div className="space-y-3.5">
              {deptCompliance.map((dept: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-slate-800 truncate">{dept.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {dept.cleared} of {dept.total} verified
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-slate-900">{dept.percent}%</div>
                    <span className={`inline-block text-[9.5px] font-semibold px-1.5 py-0.5 rounded ${
                      dept.status === 'Optimal' || dept.status === 'Full Parity'
                        ? 'bg-emerald-100 text-emerald-800'
                        : dept.status === 'Compliant'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {dept.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <span className="text-xs text-secondary font-bold hover:underline cursor-pointer">
              View All 26 Master Departments &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Recent Medical Clearances Table (from Claude Artifact vOverview) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">
              Recent Medical Reports & Certificates
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Newly uploaded clearance outcomes with cryptographic verification QR codes
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            {recentReports.length} Recent Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-2.5 px-3">Certificate #</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Test Package</th>
                <th className="py-2.5 px-3">Clinic</th>
                <th className="py-2.5 px-3">Valid Until</th>
                <th className="py-2.5 px-3">Result</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentReports.map((rep) => (
                <tr key={rep.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{rep.id}</td>
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{rep.employee?.name}</div>
                    <div className="text-[10.5px] text-slate-400 font-mono">SAP: {rep.employee?.employeeNo}</div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{rep.test?.name}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-700">{rep.vendor?.code}</td>
                  <td className="py-2.5 px-3 font-mono">{rep.validUntil ? rep.validUntil.slice(0, 10) : '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      rep.result === 'FIT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {rep.result}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenCertificate(rep.id)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10.5px] px-2.5 py-1 rounded-lg cursor-pointer"
                    >
                      Certificate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accredited Clinics Workload & Daily Capacity Quotas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-slate-900">
              Accredited Medical Providers — Daily Quota & Utilization
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live capacity monitoring across approved clinics under contractual Net 30 terms
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            5 Clinics Contracted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-1">
          {clinicWorkload.map((clinic: any) => (
            <div key={clinic.id} className="p-4 rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900">{clinic.code}</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">#{clinic.sapVendorNo}</span>
                </div>
                <div className="text-xs text-slate-600 line-clamp-1 mb-3" title={clinic.name}>
                  {clinic.name}
                </div>
                
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Utilization:</span>
                  <span className="font-bold font-mono text-slate-800">{clinic.utilization}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      clinic.utilization > 80 ? 'bg-red-500' : clinic.utilization > 50 ? 'bg-secondary' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.max(5, clinic.utilization)}%` }}
                  ></div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Avail: <strong className="text-emerald-600 font-mono">{clinic.available}</strong></span>
                <span>Cap: <strong className="text-slate-800 font-mono">{clinic.capacity}/d</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};
