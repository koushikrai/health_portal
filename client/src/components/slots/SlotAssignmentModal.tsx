import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';

interface SlotAssignmentModalProps {
  slotId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssignmentUpdated?: () => void;
}

export const SlotAssignmentModal: React.FC<SlotAssignmentModalProps> = ({
  slotId,
  isOpen,
  onClose,
  onAssignmentUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk' | 'list'>('single');
  const [loading, setLoading] = useState(false);
  const [slotData, setSlotData] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [clinicStats, setClinicStats] = useState<any[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Single Assignment Form State
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [employeeSearchResults, setEmployeeSearchResults] = useState<any[]>([]);
  const [searchingEmployees, setSearchingEmployees] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [singleClinicId, setSingleClinicId] = useState('AUTO');
  const [singleApptDate, setSingleApptDate] = useState('');
  const [singleNote, setSingleNote] = useState('');
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Bulk Assignment Form State
  const [bulkMode, setBulkMode] = useState<'roster' | 'paste' | 'file'>('roster');
  const [rosterEmployees, setRosterEmployees] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());
  const [pastedBadges, setPastedBadges] = useState('');
  const [bulkClinicId, setBulkClinicId] = useState('AUTO');
  const [bulkApptDate, setBulkApptDate] = useState('');
  const [bulkNote, setBulkNote] = useState('Bulk batch assignment for pre-booked slot quota');
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Table Search Filter
  const [assignedFilter, setAssignedFilter] = useState('');

  useEffect(() => {
    if (isOpen && slotId) {
      loadSlotDetails();
      loadRoster();
    }
  }, [isOpen, slotId]);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 6000);
  };

  const loadSlotDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getSlotAssignments(slotId);
      if (res.data) {
        setSlotData(res.data.slotRequest);
        setClinicStats(res.data.clinicStats || []);
        setAssignments(res.data.assignments || []);
        if (res.data.slotRequest?.needByDate) {
          const formatted = res.data.slotRequest.needByDate.slice(0, 10);
          setSingleApptDate(formatted);
          setBulkApptDate(formatted);
        }
      }
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Failed to load slot assignments.');
    } finally {
      setLoading(false);
    }
  };

  const loadRoster = async () => {
    try {
      setRosterLoading(true);
      const res = await api.searchEmployees('');
      if (res.data?.employees) {
        setRosterEmployees(res.data.employees);
      }
    } catch (e) {
      console.error('Failed to load roster:', e);
    } finally {
      setRosterLoading(false);
    }
  };

  // Search employees for Single Assignment
  useEffect(() => {
    if (!searchEmployeeQuery.trim()) {
      setEmployeeSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingEmployees(true);
        const res = await api.searchEmployees(searchEmployeeQuery.trim());
        if (res.data?.employees) {
          // Exclude already assigned
          const assignedIds = new Set(assignments.map(a => a.employeeNo));
          const filtered = res.data.employees.filter((emp: any) => !assignedIds.has(emp.employeeNo));
          setEmployeeSearchResults(filtered);
        }
      } catch (e) {
        console.error('Error searching employees:', e);
      } finally {
        setSearchingEmployees(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchEmployeeQuery, assignments]);

  // Handle Single Assign
  const handleSingleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) {
      showFeedback('error', 'Please select an employee to assign.');
      return;
    }

    try {
      setSubmittingSingle(true);
      const res = await api.assignSingleToSlot(slotId, {
        employeeNo: selectedEmp.employeeNo,
        name: selectedEmp.name,
        department: selectedEmp.department,
        vendorId: singleClinicId,
        apptDate: singleApptDate || undefined,
        note: singleNote
      });

      showFeedback('success', res.data?.message || `Successfully assigned ${selectedEmp.name} to slot ${slotId}!`);
      setSelectedEmp(null);
      setSearchEmployeeQuery('');
      setSingleNote('');
      await loadSlotDetails();
      if (onAssignmentUpdated) onAssignmentUpdated();
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Failed to assign employee.');
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Handle Bulk Assign
  const handleBulkAssign = async () => {
    let payloadEmployees: Array<{ employeeNo: string; name?: string; department?: string }> = [];

    if (bulkMode === 'roster') {
      const selected = rosterEmployees.filter(emp => selectedRosterIds.has(emp.id || emp.employeeNo));
      if (selected.length === 0) {
        showFeedback('error', 'Please select at least one employee from the roster table.');
        return;
      }
      payloadEmployees = selected.map(emp => ({
        employeeNo: emp.employeeNo,
        name: emp.name,
        department: emp.department
      }));
    } else if (bulkMode === 'paste') {
      const tokens = pastedBadges
        .split(/[\n,;\t]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (tokens.length === 0) {
        showFeedback('error', 'Please enter or paste at least one employee badge number.');
        return;
      }
      payloadEmployees = tokens.map(t => ({ employeeNo: t }));
    }

    if (payloadEmployees.length === 0) {
      showFeedback('error', 'No employees specified for assignment.');
      return;
    }

    try {
      setSubmittingBulk(true);
      const res = await api.assignBulkToSlot(slotId, {
        employees: payloadEmployees,
        vendorId: bulkClinicId,
        apptDate: bulkApptDate || undefined,
        note: bulkNote
      });

      showFeedback(
        'success',
        `Assigned ${res.data?.assignedCount || payloadEmployees.length} employees successfully to slot ${slotId}!`
      );
      setSelectedRosterIds(new Set());
      setPastedBadges('');
      await loadSlotDetails();
      setActiveTab('list');
      if (onAssignmentUpdated) onAssignmentUpdated();
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Bulk assignment failed.');
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Handle Unassign
  const handleUnassign = async (requestId: string, empName: string) => {
    if (!window.confirm(`Are you sure you want to unassign ${empName} from this slot quota? This will restore 1 slot back to the available quota.`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await api.unassignFromSlot(slotId, requestId);
      showFeedback('success', res.data?.message || 'Employee unassigned successfully.');
      await loadSlotDetails();
      if (onAssignmentUpdated) onAssignmentUpdated();
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Failed to unassign employee.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Excel Upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const badges: string[] = [];
        data.forEach((row, idx) => {
          if (idx === 0) return; // Header
          if (Array.isArray(row) && row[0]) {
            badges.push(String(row[0]).trim());
          }
        });

        if (badges.length > 0) {
          setPastedBadges(badges.join('\n'));
          setBulkMode('paste');
          showFeedback('success', `Imported ${badges.length} employee badge numbers from ${file.name}!`);
        } else {
          showFeedback('error', 'No employee numbers found in uploaded file.');
        }
      } catch (err: any) {
        showFeedback('error', 'Failed to read spreadsheet: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Assigned List to Excel
  const handleExportAssigned = () => {
    if (assignments.length === 0) return;
    const rows = assignments.map(a => ({
      'Request ID': a.requestId,
      'Badge No': a.employeeNo,
      'Employee Name': a.name,
      'Department': a.department,
      'Trade / Position': a.position,
      'Iqama ID': a.iqamaId || '—',
      'Assigned Clinic': a.vendorName,
      'Medical Test': a.testName,
      'Status': a.status,
      'Appointment Date': a.apptDate ? a.apptDate.slice(0, 10) : '—',
      'Assigned At': a.assignedAt ? a.assignedAt.slice(0, 10) : '—'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assigned Employees');
    XLSX.writeFile(wb, `${slotId}_Assigned_Employees.xlsx`);
  };

  if (!isOpen) return null;

  const totalAssigned = slotData?.totalAssigned || assignments.length;
  const requestedSlots = slotData?.requestedSlots || 0;
  const remainingSlots = Math.max(0, requestedSlots - totalAssigned);
  const percentAssigned = requestedSlots > 0 ? Math.round((totalAssigned / requestedSlots) * 100) : 0;

  // Filter assigned list
  const filteredAssignments = assignments.filter(a => {
    if (!assignedFilter) return true;
    const f = assignedFilter.toLowerCase();
    return (
      a.employeeNo?.toLowerCase().includes(f) ||
      a.name?.toLowerCase().includes(f) ||
      a.department?.toLowerCase().includes(f) ||
      a.vendorName?.toLowerCase().includes(f)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#10192e] to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">group_add</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-orange-400 bg-orange-950/60 border border-orange-700/50 px-2 py-0.5 rounded-md">
                  {slotId}
                </span>
                <h3 className="font-display font-extrabold text-base text-white">
                  Assign Workforce to Booked Slot Quota
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {slotData?.title} &bull; {slotData?.department} &bull; {slotData?.plant || 'Sadara Complex'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Quota Progress & Clinic Capacity Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Slot Quota Fulfillment
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-display font-black text-slate-900">
                  {totalAssigned} <span className="text-sm font-normal text-slate-500">/ {requestedSlots} Assigned</span>
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  remainingSlots === 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {remainingSlots} slots remaining
                </span>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Allocation Progress</span>
                <span>{percentAssigned}%</span>
              </div>
              <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 transition-all duration-500 rounded-full"
                  style={{ width: `${percentAssigned}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Clinics Quota Breakdown Pills */}
          {clinicStats.length > 0 && (
            <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Approved Clinics:
              </span>
              {clinicStats.map((c: any) => (
                <div
                  key={c.vendorId}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs flex items-center gap-1.5 shadow-xs"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-800">{c.vendorName}:</span>
                  <span className="font-mono font-bold text-slate-900">{c.assignedSlots || 0}/{c.allocatedSlots}</span>
                  <span className="text-[10px] text-slate-400">({c.remainingSlots} left)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            <span className="material-symbols-outlined text-[18px]">
              {feedbackMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-medium">{feedbackMessage.text}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'single'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            <span>Assign One by One</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'bulk'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">group_add</span>
            <span>Assign Bulk List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">checklist</span>
            <span>Assigned Employees ({assignments.length})</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: Single Employee Assignment */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleAssign} className="space-y-5 max-w-2xl mx-auto">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Search &amp; Select Employee
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={searchEmployeeQuery}
                    onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                    placeholder="Search by Employee Badge No, Iqama, Name, or Department..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  {searchingEmployees && (
                    <span className="absolute right-3 top-2.5 h-4 w-4 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></span>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {employeeSearchResults.length > 0 && (
                  <div className="mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {employeeSearchResults.map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => {
                          setSelectedEmp(emp);
                          setSearchEmployeeQuery('');
                          setEmployeeSearchResults([]);
                        }}
                        className="p-2.5 hover:bg-orange-50/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="font-bold text-xs text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Badge: <span className="font-mono font-semibold">{emp.employeeNo}</span> &bull; {emp.department || 'Operations'} &bull; Iqama: {emp.iqamaId || '—'}
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Employee Card */}
              {selectedEmp ? (
                <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-500 text-white font-bold text-xs flex items-center justify-center">
                      {selectedEmp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{selectedEmp.name}</h4>
                      <p className="text-[11px] text-slate-600">
                        Badge: <strong className="font-mono">{selectedEmp.employeeNo}</strong> &bull; Dept: <strong>{selectedEmp.department || 'Operations'}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedEmp(null)}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                  Search above or enter badge number to select an employee for this test.
                </div>
              )}

              {/* Clinic Selection & Appointment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Target Clinic
                  </label>
                  <select
                    value={singleClinicId}
                    onChange={(e) => setSingleClinicId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="AUTO">Auto-Assign to Available Clinic (Recommended)</option>
                    {clinicStats.map((c: any) => (
                      <option key={c.vendorId} value={c.vendorId}>
                        {c.vendorName} ({c.remainingSlots} slots remaining)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Target Appointment / Test Date
                  </label>
                  <input
                    type="date"
                    value={singleApptDate}
                    onChange={(e) => setSingleApptDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Assignment Note / Shift Details (Optional)
                </label>
                <input
                  type="text"
                  value={singleNote}
                  onChange={(e) => setSingleNote(e.target.value)}
                  placeholder="e.g. Turnaround crew mobilization, Day shift gate pass"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingSingle || !selectedEmp || remainingSlots === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[17px]">person_add</span>
                  <span>{submittingSingle ? 'Assigning...' : 'Assign Employee to Slot Quota'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Bulk List Assignment */}
          {activeTab === 'bulk' && (
            <div className="space-y-5">
              {/* Bulk Mode Switcher */}
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-600 mr-2">Input Method:</span>
                <button
                  type="button"
                  onClick={() => setBulkMode('roster')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    bulkMode === 'roster'
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Select from Company Roster
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    bulkMode === 'paste'
                      ? 'bg-orange-100 text-orange-800 border border-orange-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Paste Badge Numbers
                </button>
                <label className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">upload_file</span>
                  <span>Upload Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Sub-Mode 1: Roster Multi-Select */}
              {bulkMode === 'roster' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      placeholder="Filter roster by Name, Badge, Department..."
                      className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs w-72 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const available = rosterEmployees.filter(emp => !assignments.some(a => a.employeeNo === emp.employeeNo));
                          const take = available.slice(0, remainingSlots);
                          setSelectedRosterIds(new Set(take.map(e => e.id || e.employeeNo)));
                        }}
                        className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
                      >
                        Select Next {Math.min(remainingSlots, 10)}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedRosterIds(new Set())}
                        className="text-xs text-slate-500 hover:underline cursor-pointer"
                      >
                        Clear Selection ({selectedRosterIds.size})
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-8">
                            <input
                              type="checkbox"
                              checked={selectedRosterIds.size > 0 && selectedRosterIds.size === rosterEmployees.length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRosterIds(new Set(rosterEmployees.slice(0, remainingSlots).map(emp => emp.id || emp.employeeNo)));
                                } else {
                                  setSelectedRosterIds(new Set());
                                }
                              }}
                            />
                          </th>
                          <th className="py-2 px-3">Badge No</th>
                          <th className="py-2 px-3">Employee Name</th>
                          <th className="py-2 px-3">Department</th>
                          <th className="py-2 px-3">Position</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterEmployees
                          .filter(emp => {
                            if (!rosterSearch) return true;
                            const s = rosterSearch.toLowerCase();
                            return (
                              emp.name?.toLowerCase().includes(s) ||
                              emp.employeeNo?.toLowerCase().includes(s) ||
                              emp.department?.toLowerCase().includes(s)
                            );
                          })
                          .map((emp) => {
                            const isAssigned = assignments.some(a => a.employeeNo === emp.employeeNo);
                            const isChecked = selectedRosterIds.has(emp.id || emp.employeeNo);

                            return (
                              <tr
                                key={emp.id}
                                className={`hover:bg-orange-50/40 cursor-pointer ${
                                  isChecked ? 'bg-orange-50/70 font-semibold' : ''
                                } ${isAssigned ? 'opacity-40 bg-slate-50' : ''}`}
                                onClick={() => {
                                  if (isAssigned) return;
                                  const id = emp.id || emp.employeeNo;
                                  const next = new Set(selectedRosterIds);
                                  if (next.has(id)) next.delete(id);
                                  else {
                                    if (next.size >= remainingSlots) {
                                      showFeedback('error', `Cannot select more than ${remainingSlots} slots remaining.`);
                                      return;
                                    }
                                    next.add(id);
                                  }
                                  setSelectedRosterIds(next);
                                }}
                              >
                                <td className="py-2 px-3">
                                  <input
                                    type="checkbox"
                                    disabled={isAssigned}
                                    checked={isChecked}
                                    onChange={() => {}}
                                  />
                                </td>
                                <td className="py-2 px-3 font-mono">{emp.employeeNo}</td>
                                <td className="py-2 px-3 text-slate-900">{emp.name}</td>
                                <td className="py-2 px-3 text-slate-600">{emp.department || 'Operations'}</td>
                                <td className="py-2 px-3 text-slate-500">{emp.position || 'Worker'}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-Mode 2: Paste Badges */}
              {(bulkMode === 'paste' || bulkMode === 'file') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-800">
                      Paste Employee Badge Numbers / Iqamas
                    </label>
                    <span className="text-[11px] text-slate-500">
                      One per line, or comma-separated
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={pastedBadges}
                    onChange={(e) => setPastedBadges(e.target.value)}
                    placeholder="11000008&#10;11000012&#10;90000001&#10;90000002..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  ></textarea>
                </div>
              )}

              {/* Target Clinic Distribution & Appointment Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Clinic Distribution Strategy
                  </label>
                  <select
                    value={bulkClinicId}
                    onChange={(e) => setBulkClinicId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  >
                    <option value="AUTO">Distribute Evenly Across Allocated Clinics (Recommended)</option>
                    {clinicStats.map((c: any) => (
                      <option key={c.vendorId} value={c.vendorId}>
                        Assign All to {c.vendorName} ({c.remainingSlots} slots remaining)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Appointment / Mobilization Date
                  </label>
                  <input
                    type="date"
                    value={bulkApptDate}
                    onChange={(e) => setBulkApptDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Ready to assign{' '}
                  <strong className="text-slate-900 font-bold">
                    {bulkMode === 'roster'
                      ? selectedRosterIds.size
                      : pastedBadges.split(/[\n,;\t]+/).filter(t => t.trim().length > 0).length}{' '}
                    personnel
                  </strong>{' '}
                  into {remainingSlots} remaining slots.
                </span>

                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={submittingBulk || remainingSlots === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[17px]">group_add</span>
                  <span>{submittingBulk ? 'Dispatching...' : 'Assign All to Slot Quota'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Assigned Employees Table */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[17px]">search</span>
                  <input
                    type="text"
                    value={assignedFilter}
                    onChange={(e) => setAssignedFilter(e.target.value)}
                    placeholder="Filter assigned workers..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleExportAssigned}
                    disabled={assignments.length === 0}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    <span>Export Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={loadSlotDetails}
                    disabled={loading}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="Refresh"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                  </button>
                </div>
              </div>

              {assignments.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                  <span className="material-symbols-outlined text-4xl text-slate-300 block mb-2">person_off</span>
                  No employees assigned to this slot quota yet. Use <strong>Assign One by One</strong> or <strong>Assign Bulk List</strong> above.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-semibold sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Badge No</th>
                          <th className="py-2.5 px-3">Employee Name</th>
                          <th className="py-2.5 px-3">Department</th>
                          <th className="py-2.5 px-3">Assigned Clinic</th>
                          <th className="py-2.5 px-3">Target Date</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAssignments.map((a) => (
                          <tr key={a.requestId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{a.employeeNo}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{a.name}</div>
                              <div className="text-[10px] text-slate-400">ID: {a.requestId}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{a.department}</td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {a.vendorName}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                              {a.apptDate ? a.apptDate.slice(0, 10) : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                {a.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleUnassign(a.requestId, a.name)}
                                className="px-2 py-1 rounded-md text-[11px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Unassign employee from slot quota"
                              >
                                Unassign
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Total Quota: <strong>{requestedSlots}</strong> &bull; Assigned: <strong>{totalAssigned}</strong> &bull; Vacant: <strong className="text-emerald-700">{remainingSlots}</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
