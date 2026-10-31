import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CertificateModal } from '../components/certificate/CertificateModal';

interface ClinicPortalViewProps {
  userRole: string;
  vendorId?: string | null;
}

export const ClinicPortalView: React.FC<ClinicPortalViewProps> = ({ userRole, vendorId }) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'invoice'>('queue');
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any>(null);

  // Appointment scheduling
  const [apptModalId, setApptModalId] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState('');

  // Result entry modal
  const [resultModalReq, setResultModalReq] = useState<any>(null);
  const [examResult, setExamResult] = useState<'FIT' | 'UNFIT' | 'CONDITIONAL'>('FIT');
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [doctorName, setDoctorName] = useState('Dr. Tariq Al-Ghamdi, MD');
  const [examRemarks, setExamRemarks] = useState('Cardiopulmonary clear. Full visual acuity 20/20. Fit for duty.');

  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorId || 'V2');
  const clinics = [
    { id: 'V2', code: 'GAMC', name: 'Gulf Asian Medical Centre', sapNo: '1001238', contract: '4620000329' },
    { id: 'V1', code: 'BAK', name: 'Badr Al Khaleej Polyclinic Co.', sapNo: '1001502', contract: '4620000318' },
    { id: 'V3', code: 'JMC', name: 'Jubail Medical Center', sapNo: '1002341', contract: '4620000345' },
    { id: 'V4', code: 'ARZ', name: 'Arrazi Medical Center', sapNo: '1003412', contract: '4620000350' },
    { id: 'V5', code: 'DINA', name: 'Dina Medical Center', sapNo: '1004523', contract: '4620000360' },
  ];

  useEffect(() => {
    if (vendorId) {
      setSelectedVendorId(vendorId);
    }
  }, [vendorId]);

  const currentClinic = clinics.find(c => c.id === selectedVendorId) || clinics[0];

  // Invoicing
  const [billableRequests, setBillableRequests] = useState<string[]>([]);
  const [invoiceNo, setInvoiceNo] = useState(`${currentClinic.code}-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState('');

  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

  useEffect(() => {
    loadClinicRequests(selectedVendorId);
    setInvoiceNo(`${currentClinic.code}-2026-${Math.floor(100 + Math.random() * 900)}`);
  }, [selectedVendorId]);

  const loadClinicRequests = async (vendorId = selectedVendorId) => {
    try {
      const res = await api.getRequests({ vendorId });
      setRequests(res.data.requests);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScheduleAppt = async () => {
    if (!apptModalId || !apptDate) return;
    try {
      await api.scheduleAppointment(apptModalId, apptDate);
      setApptModalId(null);
      setApptDate('');
      loadClinicRequests(selectedVendorId);
    } catch (e: any) {
      alert(`Scheduling failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleSubmitResult = async () => {
    if (!resultModalReq) return;
    try {
      await api.submitReportResult({
        requestId: resultModalReq.id,
        result: examResult,
        testDate: examDate,
        doctorName: doctorName || 'Dr. Tariq Al-Ghamdi, MD',
        remarks: examRemarks
      });
      setResultModalReq(null);
      loadClinicRequests(selectedVendorId);
    } catch (e: any) {
      alert(`Failed to submit report: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleSubmitInvoice = async () => {
    if (billableRequests.length === 0) return;
    try {
      setSubmittingInvoice(true);
      const res = await api.submitInvoice({
        invoiceNo,
        vendorId: selectedVendorId,
        requestIds: billableRequests
      });
      setInvoiceSuccess(`Invoice #${res.data.invoice.invoiceNo} (SAR ${res.data.invoice.totalAmount}) submitted to Finance for 3-Way Match clearance!`);
      setBillableRequests([]);
      setTimeout(() => setInvoiceSuccess(''), 8000);
    } catch (e: any) {
      alert(`Invoice submission failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const completedRequests = requests.filter(r => r.status === 'COMPLETED');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Accredited Medical Center Portal</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="font-display font-extrabold text-xl text-slate-900">{currentClinic.name}</h2>
            {userRole === 'ADMIN' ? (
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2 py-1 rounded-lg border border-slate-300 focus:outline-none cursor-pointer"
              >
                {clinics.map(c => (
                  <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2.5 py-0.5 rounded-lg">
                {currentClinic.code} Accredited Center
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">SAP Vendor ID: {currentClinic.sapNo} &bull; Contract {currentClinic.contract} &bull; Net 30 Terms</p>
        </div>

        {/* Sub-Tab Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'queue'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">medical_services</span>
            <span>Examination Queue ({requests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('invoice')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'invoice'
                ? 'bg-secondary text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt</span>
            <span>Generate Invoice ({completedRequests.length} Billable)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Examination Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold text-slate-700">Patients Scheduled & Assigned for Examination</span>
            <span className="text-xs text-slate-400">Total: {requests.length} candidates</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                  <th className="py-3 px-4">Request Ref</th>
                  <th className="py-3 px-4">Candidate / Iqama</th>
                  <th className="py-3 px-4">SAP Test Package</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{req.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{req.employee?.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        SAP: {req.employee?.employeeNo} &bull; Iqama: {req.employee?.iqamaId || '2117017034'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {req.test?.name}
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">SAP #{req.test?.id}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {req.apptDate ? (
                        <span className="text-blue-700 font-bold">{new Date(req.apptDate).toLocaleDateString()}</span>
                      ) : (
                        <span className="text-amber-600 font-medium italic">Pending Date</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'SCHEDULED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {!req.apptDate && req.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setApptModalId(req.id)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          <span>Set Date</span>
                        </button>
                      )}

                      {req.status !== 'COMPLETED' && (
                        <button
                          onClick={() => setResultModalReq(req)}
                          className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-3 py-1 rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">fact_check</span>
                          <span>Enter Result</span>
                        </button>
                      )}

                      {req.report && (
                        <button
                          onClick={async () => {
                            const res = await api.getCertificate(req.report.id);
                            setSelectedCertificate(res.data.certificate);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          <span>View Cert</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Generate Clinic Invoice */}
      {activeTab === 'invoice' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">Batch Invoicing for Completed Medical Exams</h3>
              <p className="text-xs text-slate-400">Reconciled against SAP Material Contract Rate Schedule (Gulf Asian Medical Centre)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Invoice Number:</span>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="bg-slate-50 border border-slate-300 font-mono font-bold text-xs px-3 py-1.5 rounded-lg text-slate-800"
              />
            </div>
          </div>

          {invoiceSuccess && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{invoiceSuccess}</span>
            </div>
          )}

          {/* Billable Completed Tests Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                  <th className="py-3 px-4 w-10">Select</th>
                  <th className="py-3 px-4">Request Ref</th>
                  <th className="py-3 px-4">Patient / Candidate</th>
                  <th className="py-3 px-4">SAP Test Material</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 text-right">Contract Rate (SAR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {completedRequests.map(cr => {
                  const isChecked = billableRequests.includes(cr.id);
                  return (
                    <tr key={cr.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setBillableRequests([...billableRequests, cr.id]);
                            else setBillableRequests(billableRequests.filter(id => id !== cr.id));
                          }}
                          className="rounded text-secondary focus:ring-secondary cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{cr.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{cr.employee?.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{cr.test?.name}</td>
                      <td className="py-3 px-4">
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10.5px]">
                          {cr.report?.result || 'FIT'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-secondary text-sm">
                        SAR 152.00
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Invoice Summary & Submit */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 text-xs">
              <div>Selected Tests: <strong className="text-slate-900">{billableRequests.length}</strong></div>
              <div>Subtotal: <strong className="font-mono text-slate-900">SAR {(billableRequests.length * 152).toFixed(2)}</strong></div>
              <div>15% VAT: <strong className="font-mono text-slate-900">SAR {(billableRequests.length * 152 * 0.15).toFixed(2)}</strong></div>
              <div className="text-sm font-display font-extrabold text-secondary pt-1">
                Total Invoice Billed: SAR {(billableRequests.length * 152 * 1.15).toFixed(2)}
              </div>
            </div>

            <button
              disabled={submittingInvoice || billableRequests.length === 0}
              onClick={handleSubmitInvoice}
              className={`bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer ${
                submittingInvoice || billableRequests.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              <span>{submittingInvoice ? 'Submitting Invoice...' : 'Submit Invoice to Finance'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Set Appointment Modal */}
      {apptModalId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-display font-bold text-base text-slate-900 mb-1">Set Appointment Date</h3>
            <p className="text-xs text-slate-400 mb-4">Request #{apptModalId}</p>
            <input
              type="date"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-secondary mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setApptModalId(null)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600">Cancel</button>
              <button onClick={handleScheduleAppt} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl">Confirm Date</button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Result Modal */}
      {resultModalReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-display font-bold text-base text-slate-900 mb-1">Enter Medical Examination Outcome</h3>
            <p className="text-xs text-slate-400 mb-4">{resultModalReq.employee?.name} &bull; {resultModalReq.test?.name}</p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Determination Result *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['FIT', 'UNFIT', 'CONDITIONAL'] as const).map(res => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setExamResult(res)}
                      className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                        examResult === res
                          ? (res === 'FIT' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600')
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Examination Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Examining Physician / Doctor Name *</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Tariq Al-Ghamdi, MD"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Clinical Remarks & Findings</label>
                <textarea
                  value={examRemarks}
                  onChange={(e) => setExamRemarks(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:border-secondary"
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button onClick={() => setResultModalReq(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600">Cancel</button>
              <button onClick={handleSubmitResult} className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
                Issue Certificate & Complete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      <CertificateModal
        certificate={selectedCertificate}
        onClose={() => setSelectedCertificate(null)}
      />
    </div>
  );
};
