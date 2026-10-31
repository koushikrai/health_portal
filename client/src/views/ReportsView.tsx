import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CertificateModal } from '../components/certificate/CertificateModal';

interface ReportsViewProps {
  onRenew?: (empNo: string, testId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ onRenew }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

  useEffect(() => {
    loadReports();
  }, [resultFilter, searchQuery]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await api.getReports({
        result: resultFilter === 'ALL' ? undefined : resultFilter,
        search: searchQuery || undefined
      });
      setReports(res.data.reports);
    } catch (e) {
      console.error(e);
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

  const totalReports = reports.length;
  const fitCount = reports.filter(r => r.result === 'FIT').length;
  const unfitCount = reports.filter(r => r.result === 'UNFIT').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Central Medical Record Repository
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 mt-0.5">
            Medical Reports & Certificate Library
          </h2>
          <p className="text-xs text-slate-500">
            Official medical clearance certificates issued by accredited clinics with cryptographically verifiable QR stamps.
          </p>
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">
            Total: {totalReports} Records
          </span>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
            {fitCount} FIT Cleared
          </span>
          {unfitCount > 0 && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-800 border border-red-200">
              {unfitCount} UNFIT
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Employee, SAP ID, Iqama, Certificate #..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs focus:outline-none focus:border-secondary transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {(['ALL', 'FIT', 'CONDITIONAL', 'UNFIT'] as const).map(res => (
            <button
              key={res}
              type="button"
              onClick={() => setResultFilter(res)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                resultFilter === res
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {res === 'ALL' ? 'All Results' : res}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading medical report library...</div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No medical reports found matching the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="py-3 px-4">Certificate #</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Medical Test</th>
                  <th className="py-3 px-4">Accredited Clinic</th>
                  <th className="py-3 px-4">Exam Date</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4">Determination</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => {
                  const emp = report.employee;
                  const isExpiringSoon = report.validUntil && (new Date(report.validUntil).getTime() - Date.now()) < 30 * 24 * 60 * 60 * 1000;
                  
                  return (
                    <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {report.id}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{emp?.name || 'Unknown'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          SAP: {emp?.employeeNo} &bull; Iqama: {emp?.iqamaId || 'GCC'}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{report.test?.name}</div>
                        <div className="text-[10.5px] text-slate-400 font-mono">Material: {report.test?.id}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{report.vendor?.code}</span>
                        <div className="text-[10.5px] text-slate-400 line-clamp-1">{report.vendor?.name}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {report.testDate ? report.testDate.slice(0, 10) : '—'}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {report.validUntil ? (
                          <div className="flex items-center gap-1.5">
                            <span className={isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-800'}>
                              {report.validUntil.slice(0, 10)}
                            </span>
                            {isExpiringSoon && (
                              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                Expiring
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">One-off</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {report.result === 'FIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                            FIT
                          </span>
                        )}
                        {report.result === 'UNFIT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-red-100 text-red-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-600"></span>
                            UNFIT
                          </span>
                        )}
                        {report.result === 'CONDITIONAL' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-100 text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                            RESTRICTED
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenCertificate(report.id)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[15px]">badge</span>
                            <span>Certificate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
