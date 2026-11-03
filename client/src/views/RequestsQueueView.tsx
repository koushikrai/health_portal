import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { CertificateModal } from '../components/certificate/CertificateModal';

interface RequestsQueueViewProps {
  userRole: string;
}

export const RequestsQueueView: React.FC<RequestsQueueViewProps> = ({ userRole }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

  // Rejection modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Clinics for triage
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('V2');
  const [triageApptDate, setTriageApptDate] = useState<string>('');

  // Appointment Scheduling Modal state
  const [schedulingRequest, setSchedulingRequest] = useState<any | null>(null);
  const [apptDateInput, setApptDateInput] = useState<string>('');
  const [apptTimeInput, setApptTimeInput] = useState<string>('09:00 AM');
  const [apptNotesInput, setApptNotesInput] = useState<string>('');
  const [schedulingLoading, setSchedulingLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    loadRequests();
    loadClinics();
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      const res = await api.getRequests({
        status: statusFilter,
        search: search || undefined
      });
      setRequests(res.data.requests);
    } catch (e) {
      console.error(e);
    }
  };

  const loadClinics = async () => {
    try {
      const res = await api.getClinics();
      setClinics(res.data.clinics);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(requests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBatchAssign = async (vendorId: string) => {
    if (selectedIds.length === 0) return;
    try {
      await api.batchAssignRequests(selectedIds, vendorId, triageApptDate || undefined);
      setToastMessage(
        `Successfully assigned ${selectedIds.length} candidate(s)${triageApptDate ? ` & scheduled for ${new Date(triageApptDate).toLocaleDateString()}` : ''}!`
      );
      setTimeout(() => setToastMessage(''), 5000);
      setSelectedIds([]);
      setTriageApptDate('');
      loadRequests();
    } catch (e: any) {
      alert(`Assignment failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleOpenScheduleModal = (req: any) => {
    setSchedulingRequest(req);
    if (req.apptDate) {
      const d = new Date(req.apptDate);
      setApptDateInput(d.toISOString().slice(0, 10));
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setApptDateInput(tomorrow.toISOString().slice(0, 10));
    }
    setApptTimeInput('09:00 AM');
    setApptNotesInput(req.note || 'Patient must fast 8-10 hours prior to blood draw. Bring original Iqama / National ID.');
  };

  const handleQuickDatePreset = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    setApptDateInput(target.toISOString().slice(0, 10));
  };

  const handleConfirmSchedule = async () => {
    if (!schedulingRequest || !apptDateInput) return;
    try {
      setSchedulingLoading(true);
      await api.scheduleAppointment(schedulingRequest.id, apptDateInput, apptNotesInput);
      setToastMessage(`Appointment confirmed for ${schedulingRequest.employee?.name || 'Worker'} on ${new Date(apptDateInput).toLocaleDateString()}!`);
      setTimeout(() => setToastMessage(''), 5000);
      setSchedulingRequest(null);
      await loadRequests();
    } catch (e: any) {
      alert(`Scheduling failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId) return;
    try {
      await api.rejectRequest(rejectingId, rejectReason);
      setRejectingId(null);
      setRejectReason('');
      loadRequests();
    } catch (e: any) {
      alert(`Rejection failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const handleOpenCertificate = async (reportId: string) => {
    try {
      const res = await api.getCertificate(reportId);
      setSelectedCertificate(res.data.certificate);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="font-display font-extrabold text-xl text-slate-900">Occupational Medical Clearance Queue</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tracking, central clinic triage, and patient appointment scheduling</p>
        </div>

        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {['ALL', 'WAITING', 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'REJECTED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Central Team Triage Control Bar (Visible for Central and Admin) */}
      {(userRole === 'CENTRAL' || userRole === 'ADMIN') && (
        <div className="bg-[#131B35] text-white p-5 rounded-2xl shadow-md border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-2xl">hub</span>
              <div>
                <h4 className="font-display font-bold text-sm text-white">Central Medical Team Triage Console</h4>
                <p className="text-[11px] text-slate-300">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} request(s) selected for clinic allocation`
                    : 'Select pending clearance requests below to batch allocate to accredited clinics'}
                </p>
              </div>
            </div>

            {/* Clinic Allocation & Scheduling Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[11px] font-bold uppercase text-slate-300">Target Clinic:</span>
              
              {/* Dynamic Dropdown with All 5 Accredited Clinics */}
              <select
                value={selectedClinicId}
                onChange={(e) => setSelectedClinicId(e.target.value)}
                className="bg-[#0B1020] text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-secondary cursor-pointer"
              >
                {(clinics.length > 0 ? clinics : [
                  { id: 'V2', code: 'GAMC', name: 'Gulf Asian Medical Centre' },
                  { id: 'V1', code: 'BAK', name: 'Badr Al Khaleej Polyclinic Co.' },
                  { id: 'V3', code: 'JMC', name: 'Jubail Medical Center' },
                  { id: 'V4', code: 'ARZ', name: 'Arrazi Medical Center' },
                  { id: 'V5', code: 'DINA', name: 'Dina Medical Center' }
                ]).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>

              {/* Optional Batch Appointment Date Picker */}
              <div className="flex items-center gap-1.5 bg-[#0B1020] border border-slate-700 rounded-xl px-2.5 py-1.5">
                <span className="material-symbols-outlined text-[16px] text-slate-400">calendar_month</span>
                <input
                  type="date"
                  value={triageApptDate}
                  onChange={(e) => setTriageApptDate(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                  title="Optional: Set appointment date during batch assignment"
                />
              </div>

              {/* Primary Batch Assign Button */}
              <button
                disabled={selectedIds.length === 0}
                onClick={() => handleBatchAssign(selectedClinicId)}
                className={`bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedIds.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>
                  {triageApptDate ? 'Assign & Schedule' : 'Assign'} {selectedIds.length > 0 ? `(${selectedIds.length})` : ''} to Clinic
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Search */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                loadRequests();
              }}
              placeholder="Filter by Request ID, employee, Iqama, department..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-secondary shadow-sm"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{requests.length}</strong> records
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === requests.length}
                    className="rounded text-secondary focus:ring-secondary cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Request Ref</th>
                <th className="py-3 px-4">Employee / Iqama</th>
                <th className="py-3 px-4">SAP Medical Test</th>
                <th className="py-3 px-4">Division / Dept</th>
                <th className="py-3 px-4">Assigned Clinic</th>
                <th className="py-3 px-4">Appointment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {requests.map(req => {
                const isSelected = selectedIds.includes(req.id);
                return (
                  <tr key={req.id} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-secondary/5' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(req.id)}
                        className="rounded text-secondary focus:ring-secondary cursor-pointer"
                      />
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {req.id}
                      <span className="text-[10px] text-slate-400 block font-normal">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{req.employee?.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        SAP: {req.employee?.employeeNo} &bull; Iqama: {req.employee?.iqamaId || '2117017034'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{req.test?.name}</div>
                      <div className="text-[10.5px] font-mono text-slate-400">SAP #{req.test?.id}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {req.department || 'PMTA'}
                    </td>

                    <td className="py-3 px-4">
                      {req.vendor ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                          <span>{req.vendor.code} ({req.vendor.name})</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned (In Triage)</span>
                      )}
                    </td>

                    {/* Interactive Appointment Column */}
                    <td className="py-3 px-4 font-mono">
                      {req.apptDate ? (
                        <button
                          onClick={() => handleOpenScheduleModal(req)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-all cursor-pointer group shadow-2xs"
                          title="Click to view or reschedule appointment"
                        >
                          <span className="material-symbols-outlined text-[15px] text-blue-600 group-hover:scale-110 transition-transform">event_available</span>
                          <span>{new Date(req.apptDate).toLocaleDateString()}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenScheduleModal(req)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-all cursor-pointer group shadow-2xs"
                          title="Click to schedule patient appointment"
                        >
                          <span className="material-symbols-outlined text-[15px] text-amber-600 group-hover:scale-110 transition-transform">calendar_add_on</span>
                          <span>+ Schedule</span>
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        req.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : req.status === 'SCHEDULED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : req.status === 'WAITING'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                        <span>{req.status}</span>
                      </span>
                    </td>

                    {/* ACTIONS Column with Schedule Button */}
                    <td className="py-3 px-4 text-right">
                      {req.report ? (
                        <button
                          onClick={() => handleOpenCertificate(req.report.id)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">verified</span>
                          <span>Certificate</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Schedule Button */}
                          <button
                            onClick={() => handleOpenScheduleModal(req)}
                            className="px-2.5 py-1 rounded-lg bg-primary hover:bg-slate-900 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1 cursor-pointer"
                            title="Schedule appointment slot"
                          >
                            <span className="material-symbols-outlined text-[15px]">calendar_month</span>
                            <span>{req.apptDate ? 'Reschedule' : 'Schedule'}</span>
                          </button>

                          {/* Reject Option */}
                          {req.status === 'WAITING' && (userRole === 'CENTRAL' || userRole === 'ADMIN') && (
                            <button
                              onClick={() => setRejectingId(req.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors cursor-pointer"
                              title="Reject Request"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Appointment Modal */}
      {schedulingRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-fade-in space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">calendar_month</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    Schedule Patient Appointment
                  </h3>
                  <p className="text-xs text-slate-400">Request #{schedulingRequest.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSchedulingRequest(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Candidate & Protocol Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">{schedulingRequest.employee?.name}</span>
                <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  SAP: {schedulingRequest.employee?.employeeNo}
                </span>
              </div>
              <div className="text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
                <span>Iqama: <strong className="font-mono text-slate-800">{schedulingRequest.employee?.iqamaId || '2490184820'}</strong></span>
                <span>Dept: <strong className="text-slate-800">{schedulingRequest.department || 'PMTA'}</strong></span>
                <span>Test: <strong className="text-primary">{schedulingRequest.test?.name}</strong></span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Assigned Facility:</span>
                <span className="font-bold text-slate-800">
                  {schedulingRequest.vendor ? `${schedulingRequest.vendor.code} — ${schedulingRequest.vendor.name}` : 'Unassigned (Assigned at Triage)'}
                </span>
              </div>
            </div>

            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Appointment Date
              </label>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(0)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(3)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  In 3 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(7)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Next Week (+7d)
                </button>
              </div>

              <input
                type="date"
                value={apptDateInput}
                onChange={(e) => setApptDateInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary shadow-xs cursor-pointer"
              />
            </div>

            {/* Time Slot Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Preferred Shift Slot
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '08:00 AM - 11:00 AM', label: 'Morning Slot', icon: 'wb_sunny' },
                  { id: '11:00 AM - 14:00 PM', label: 'Midday Slot', icon: 'light_mode' },
                  { id: '14:00 PM - 17:00 PM', label: 'Afternoon Slot', icon: 'wb_twilight' }
                ].map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setApptTimeInput(slot.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      apptTimeInput === slot.id
                        ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold mb-0.5">
                      <span className="material-symbols-outlined text-[15px]">{slot.icon}</span>
                      <span>{slot.label}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">{slot.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preparation / Clinical Instructions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Instructions / Clinical Notes
              </label>
              <textarea
                value={apptNotesInput}
                onChange={(e) => setApptNotesInput(e.target.value)}
                rows={2}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-primary shadow-xs"
                placeholder="Fasting requirements, original ID checklist..."
              ></textarea>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSchedulingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!apptDateInput || schedulingLoading}
                onClick={handleConfirmSchedule}
                className={`px-4 py-2 rounded-xl bg-primary hover:bg-slate-900 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer ${
                  !apptDateInput || schedulingLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {schedulingLoading ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Confirm Appointment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-display font-bold text-base text-slate-900 mb-2">Reject Medical Request #{rejectingId}</h3>
            <p className="text-xs text-slate-500 mb-4">Please provide an operational or eligibility rejection reason for the audit trail.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Duplicate active certificate held; incorrect SAP test code selected..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:border-secondary mb-4"
            ></textarea>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectingId(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm"
              >
                Confirm Rejection
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
