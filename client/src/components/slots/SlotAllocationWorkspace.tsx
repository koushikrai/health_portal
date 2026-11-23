import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../../api/client';

export interface SlotAllocationWorkspaceProps {
  slotId: string;
  isActive?: boolean;
  inline?: boolean;
  onClose?: () => void;
  onAssignmentUpdated?: () => void;
  onGoToSlotPortal?: () => void;
}

// Clinic location helper
export const CLINIC_LOCATIONS: Record<string, string> = {
  ARZ: 'Jubail Industrial Area',
  BAK: 'Al Jubail Highway',
  DINA: 'Tareeqee District',
  GAMC: 'Jubail City Center',
  JMC: 'Jubail Industrial Area',
  V1: 'Al Jubail Highway',
  V2: 'Jubail City Center',
  V3: 'Jubail Industrial Area',
  V4: 'Jubail Industrial Area',
  V5: 'Tareeqee District'
};

export const CLINIC_FRIENDLY_NAMES: Record<string, string> = {
  ARZ: 'Ar Raji Medical Center',
  BAK: 'Badr Al Khaleej Medical',
  DINA: 'Dina Medical Center',
  GAMC: 'Gulf Asian Medical Center',
  JMC: 'Jubail Medical Center',
  V1: 'Badr Al Khaleej Medical',
  V2: 'Gulf Asian Medical Center',
  V3: 'Jubail Medical Center',
  V4: 'Ar Raji Medical Center',
  V5: 'Dina Medical Center'
};

export const SlotAllocationWorkspace: React.FC<SlotAllocationWorkspaceProps> = ({
  slotId,
  isActive = true,
  inline = false,
  onClose,
  onAssignmentUpdated,
  onGoToSlotPortal
}) => {
  // Active Tab: Roster ('roster'), Bulk List ('bulk'), Upload Excel ('upload'), Assigned Employees ('assigned')
  const [activeTab, setActiveTab] = useState<'roster' | 'bulk' | 'upload' | 'assigned'>('roster');
  const [loading, setLoading] = useState(false);
  const [slotData, setSlotData] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [clinicStats, setClinicStats] = useState<any[]>([]);
  const [allClinics, setAllClinics] = useState<any[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Adjust Clinic Split Modal state
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitDraft, setSplitDraft] = useState<Record<string, number>>({});
  const [savingSplit, setSavingSplit] = useState(false);

  // Roster Candidates State
  const [rosterEmployees, setRosterEmployees] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterDeptFilter, setRosterDeptFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'OPERATIONS' | 'MAINTENANCE' | 'SAFETY' | 'EXPIRING'>('ALL');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());

  // Roster Pagination
  const [rosterPage, setRosterPage] = useState(1);
  const ROSTER_PAGE_SIZE = 8;

  // Batch Assignment Controls (Floating bottom card)
  const [targetClinicAllocation, setTargetClinicAllocation] = useState('AUTO');
  const [targetMobilizationDate, setTargetMobilizationDate] = useState('');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Bulk Paste State
  const [pastedBadges, setPastedBadges] = useState('');

  // Assigned Employees Tab Filters
  const [assignedSearch, setAssignedSearch] = useState('');
  const [assignedClinicFilter, setAssignedClinicFilter] = useState('ALL');
  const [assignedDateFilter, setAssignedDateFilter] = useState('ALL');
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<Set<string>>(new Set());

  // Clinics Sidebar Search Filter
  const [clinicSearch, setClinicSearch] = useState('');

  useEffect(() => {
    if (isActive && slotId) {
      setSelectedCandidateIds(new Set());
      setSelectedAssignedIds(new Set());
      setPastedBadges('');
      setFeedbackMessage(null);
      loadSlotDetails();
      loadRoster();
      loadAllClinics();
    }
  }, [isActive, slotId]);

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

        // Initialize target mobilization date
        if (res.data.slotRequest?.needByDate) {
          const formatted = res.data.slotRequest.needByDate.slice(0, 10);
          setTargetMobilizationDate(formatted);
        } else {
          setTargetMobilizationDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
        }

        // Initialize split draft
        const draft: Record<string, number> = {};
        if (res.data.clinicStats && res.data.clinicStats.length > 0) {
          res.data.clinicStats.forEach((c: any) => {
            draft[c.vendorId] = c.allocatedSlots || 0;
          });
        }
        setSplitDraft(draft);
      }
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Failed to load slot assignments.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllClinics = async () => {
    try {
      const res = await api.getClinics();
      if (res.data?.clinics) {
        setAllClinics(res.data.clinics);
      }
    } catch (e) {
      console.error('Failed to load clinics list:', e);
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
      console.error('Failed to load roster employees:', e);
    } finally {
      setRosterLoading(false);
    }
  };

  // Quota Metrics Calculations
  const requestedSlots = slotData?.requestedSlots || 50;
  const totalAssigned = slotData?.totalAssigned || assignments.length;
  const remainingSlots = Math.max(0, requestedSlots - totalAssigned);
  const percentAssigned = requestedSlots > 0 ? Math.round((totalAssigned / requestedSlots) * 100) : 0;
  const selectedCount = selectedCandidateIds.size;
  const postActionRemaining = Math.max(0, remainingSlots - selectedCount);

  // Available unique departments from roster
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    rosterEmployees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [rosterEmployees]);

  // Filtered Candidate Roster (Excluding already assigned employees)
  const assignedBadgeSet = useMemo(() => {
    return new Set(assignments.map((a) => a.employeeNo));
  }, [assignments]);

  const filteredCandidates = useMemo(() => {
    return rosterEmployees.filter((emp) => {
      // Exclude already assigned
      if (assignedBadgeSet.has(emp.employeeNo)) return false;

      // Search Filter
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchBadge = emp.employeeNo?.toLowerCase().includes(q);
        const matchIqama = emp.iqamaId?.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        const matchPos = emp.position?.toLowerCase().includes(q);
        if (!matchName && !matchBadge && !matchIqama && !matchDept && !matchPos) {
          return false;
        }
      }

      // Department Dropdown Filter
      if (rosterDeptFilter !== 'ALL' && emp.department !== rosterDeptFilter) {
        return false;
      }

      // Quick Pills Filter
      if (quickFilter === 'OPERATIONS') {
        const dept = (emp.department || '').toUpperCase();
        if (!dept.includes('OPERAT') && !dept.includes('PMTA')) return false;
      } else if (quickFilter === 'MAINTENANCE') {
        const dept = (emp.department || '').toUpperCase();
        if (!dept.includes('MAINT') && !dept.includes('MECH') && !dept.includes('E&I')) return false;
      } else if (quickFilter === 'SAFETY') {
        const dept = (emp.department || '').toUpperCase();
        const pos = (emp.position || '').toUpperCase();
        if (!dept.includes('SAFETY') && !dept.includes('HSE') && !pos.includes('SAFETY')) return false;
      } else if (quickFilter === 'EXPIRING') {
        // Sample deterministic filter based on employee badge
        const num = parseInt(emp.employeeNo?.replace(/\D/g, '') || '0', 10);
        if (num % 5 !== 0) return false;
      }

      return true;
    });
  }, [rosterEmployees, assignedBadgeSet, rosterSearch, rosterDeptFilter, quickFilter]);

  // Paginated Candidates
  const totalRosterPages = Math.ceil(filteredCandidates.length / ROSTER_PAGE_SIZE) || 1;
  const paginatedCandidates = useMemo(() => {
    const start = (rosterPage - 1) * ROSTER_PAGE_SIZE;
    return filteredCandidates.slice(start, start + ROSTER_PAGE_SIZE);
  }, [filteredCandidates, rosterPage]);

  // Checkbox Selection Handlers
  const handleToggleCandidate = (id: string) => {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= remainingSlots) {
          showFeedback('error', `Cannot select more than the ${remainingSlots} remaining quota slots.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const allOnPageSelected = paginatedCandidates.every((c) => selectedCandidateIds.has(c.id || c.employeeNo));
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginatedCandidates.forEach((c) => next.delete(c.id || c.employeeNo));
      } else {
        paginatedCandidates.forEach((c) => {
          if (next.size < remainingSlots) {
            next.add(c.id || c.employeeNo);
          }
        });
      }
      return next;
    });
  };

  // Batch Assign Selected Personnel
  const handleConfirmBatchAssign = async () => {
    if (selectedCandidateIds.size === 0) {
      showFeedback('error', 'Please select at least one employee from the roster table.');
      return;
    }

    const selectedList = rosterEmployees.filter((emp) =>
      selectedCandidateIds.has(emp.id || emp.employeeNo)
    );

    const payloadEmployees = selectedList.map((emp) => ({
      employeeNo: emp.employeeNo,
      name: emp.name,
      department: emp.department
    }));

    try {
      setSubmittingBatch(true);
      const res = await api.assignBulkToSlot(slotId, {
        employees: payloadEmployees,
        vendorId: targetClinicAllocation,
        apptDate: targetMobilizationDate || undefined,
        note: `Batch slot booking assignment for ${slotData?.title || slotId}`
      });

      showFeedback(
        'success',
        `Assigned ${res.data?.assignedCount || payloadEmployees.length} employees successfully to slot ${slotId}!`
      );
      setSelectedCandidateIds(new Set());
      await loadSlotDetails();
      setActiveTab('assigned');
      if (onAssignmentUpdated) onAssignmentUpdated();
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Batch assignment failed.');
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Bulk Paste / Badge Submit
  const handleBulkPasteAssign = async () => {
    const tokens = pastedBadges
      .split(/[\n,;\t]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) {
      showFeedback('error', 'Please enter or paste at least one employee badge number.');
      return;
    }

    try {
      setSubmittingBatch(true);
      const res = await api.assignBulkToSlot(slotId, {
        employees: tokens.map((t) => ({ employeeNo: t })),
        vendorId: targetClinicAllocation,
        apptDate: targetMobilizationDate || undefined,
        note: `Bulk list assignment for ${slotData?.title || slotId}`
      });

      showFeedback('success', `Assigned ${res.data?.assignedCount || tokens.length} employees successfully!`);
      setPastedBadges('');
      await loadSlotDetails();
      setActiveTab('assigned');
      if (onAssignmentUpdated) onAssignmentUpdated();
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Bulk assignment failed.');
    } finally {
      setSubmittingBatch(false);
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
          setActiveTab('bulk');
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

  // Handle Unassign Employee
  const handleUnassignEmployee = async (requestId: string, empName: string) => {
    if (
      !window.confirm(
        `Are you sure you want to unassign ${empName} from this slot quota? This will restore 1 slot back to the clinic quota.`
      )
    ) {
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

  // Export Dispatch Sheet / Manifest
  const handleExportDispatch = () => {
    if (assignments.length === 0) {
      showFeedback('error', 'No assigned employees to export.');
      return;
    }

    const rows = assignments.map((a, idx) => ({
      '#': idx + 1,
      'Request ID': a.requestId,
      'Employee Badge No': a.employeeNo,
      'Full Name': a.name,
      'Trade / Position': a.position || '—',
      'Iqama ID': a.iqamaId || '—',
      Department: a.department || '—',
      'Assigned Medical Center': a.vendorName || a.vendorCode,
      'Medical Test Protocol': a.testName || slotData?.title,
      'Scheduled Appointment Date': a.apptDate ? a.apptDate.slice(0, 10) : 'Pending Schedule',
      Status: a.status || 'SCHEDULED'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Dispatch Manifest');
    XLSX.writeFile(wb, `${slotId}_Dispatch_Manifest.xlsx`);
  };

  // Save Clinic Split from Modal
  const handleSaveClinicSplit = async () => {
    const totalAlloc = Object.values(splitDraft).reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (totalAlloc !== requestedSlots) {
      if (
        !window.confirm(
          `Total allocated clinic slots (${totalAlloc}) does not match requested total (${requestedSlots}). Do you wish to save anyway?`
        )
      ) {
        return;
      }
    }

    try {
      setSavingSplit(true);
      await api.allocateSlots(slotId, {
        allocations: splitDraft,
        status: totalAlloc >= requestedSlots ? 'ALLOCATED' : 'PENDING'
      });
      showFeedback('success', `Clinic quota allocation updated successfully!`);
      setShowSplitModal(false);
      await loadSlotDetails();
      if (onAssignmentUpdated) onAssignmentUpdated();
    } catch (e: any) {
      showFeedback('error', e.response?.data?.error || 'Failed to update clinic allocations.');
    } finally {
      setSavingSplit(false);
    }
  };

  // Split Evenly Helper for Modal
  const handleSplitEvenly = () => {
    const activeClinics = allClinics.filter((c) => c.isActive !== false);
    if (activeClinics.length === 0) return;
    const base = Math.floor(requestedSlots / activeClinics.length);
    const remainder = requestedSlots % activeClinics.length;

    const draft: Record<string, number> = {};
    activeClinics.forEach((c, idx) => {
      draft[c.id] = base + (idx < remainder ? 1 : 0);
    });
    setSplitDraft(draft);
  };

  // Filtered Assigned Employees
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (assignedClinicFilter !== 'ALL' && a.vendorId !== assignedClinicFilter && a.vendorCode !== assignedClinicFilter) {
        return false;
      }
      if (assignedSearch.trim()) {
        const q = assignedSearch.toLowerCase();
        const matchName = a.name?.toLowerCase().includes(q);
        const matchBadge = a.employeeNo?.toLowerCase().includes(q);
        const matchIqama = a.iqamaId?.toLowerCase().includes(q);
        const matchClinic = a.vendorName?.toLowerCase().includes(q);
        const matchDept = a.department?.toLowerCase().includes(q);
        if (!matchName && !matchBadge && !matchIqama && !matchClinic && !matchDept) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, assignedClinicFilter, assignedSearch]);

  // Filtered Clinics for Sidebar
  const filteredClinics = useMemo(() => {
    const list = clinicStats.length > 0 ? clinicStats : allClinics.map((c) => ({
      vendorId: c.id,
      vendorCode: c.code,
      vendorName: c.name,
      allocatedSlots: 0,
      assignedSlots: 0,
      remainingSlots: 0
    }));

    if (!clinicSearch.trim()) return list;
    const q = clinicSearch.toLowerCase();
    return list.filter(
      (c: any) =>
        c.vendorName?.toLowerCase().includes(q) ||
        c.vendorCode?.toLowerCase().includes(q) ||
        (CLINIC_LOCATIONS[c.vendorCode] || '').toLowerCase().includes(q)
    );
  }, [clinicStats, allClinics, clinicSearch]);

  // Selected names preview for batch configuration
  const selectedNamesPreview = useMemo(() => {
    const list = rosterEmployees.filter((emp) =>
      selectedCandidateIds.has(emp.id || emp.employeeNo)
    );
    if (list.length === 0) return 'None';
    if (list.length <= 3) return list.map((e) => e.name).join(', ');
    return `${list.slice(0, 3).map((e) => e.name).join(', ')} + ${list.length - 3} more`;
  }, [rosterEmployees, selectedCandidateIds]);

  if (!isActive || !slotId) return null;

  return (
    <div
      className={
        inline
          ? 'bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col w-full animate-in fade-in duration-150'
          : 'bg-white rounded-3xl max-w-7xl 2xl:max-w-[1680px] w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150'
      }
    >
      {/* 1. TOP HEADER (Matching Left & Right Screen Headers in Image 1) */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0 shadow-2xs">
            <span className="material-symbols-outlined text-[22px]">assignment_ind</span>
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-black text-orange-800 bg-orange-100/90 border border-orange-300 px-2.5 py-0.5 rounded-lg shadow-2xs">
                {slotId}
              </span>
              <h3 className="font-display font-black text-base text-slate-900 tracking-tight">
                {slotData?.title || 'Sadara Medical Test'}
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>In Allocation</span>
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-700">{slotData?.department || 'PMTA'}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">pin_drop</span>
                <span>{slotData?.plant || 'Sadara Complex (Jubail)'}</span>
              </span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-slate-400">event</span>
                <span>
                  Need-by:{' '}
                  <strong className="text-slate-800">
                    {slotData?.needByDate
                      ? new Date(slotData.needByDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      : '20 Nov 2026'}
                  </strong>
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Top Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowSplitModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            title="Adjust clinic quota caps & split"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">tune</span>
            <span>Adjust Clinic Split</span>
          </button>
          <button
            type="button"
            onClick={loadSlotDetails}
            disabled={loading}
            className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer shadow-2xs transition-colors"
            title="Refresh Slot Data"
          >
            <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer transition-colors"
              title="Close Workspace"
            >
              <span className="material-symbols-outlined text-[17px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SLOT QUOTA FULFILLMENT KPI STRIP (Matching Image 1 Exactly) */}
      <div className="bg-[#FAFBFD] border-b border-slate-200 px-6 py-3.5 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Card 1: Main Fulfillment Metric */}
          <div className="md:col-span-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Slot Quota Fulfillment
            </span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="font-display font-black text-2xl text-slate-900">
                {totalAssigned}{' '}
                <span className="text-xs font-semibold text-slate-400">/ {requestedSlots} Assigned</span>
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  remainingSlots === 0
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-900 border border-amber-200'
                }`}
              >
                {remainingSlots === 0 ? 'Quota Fully Fulfilled' : `${remainingSlots} slots remaining`}
              </span>
            </div>
          </div>

          {/* Cards 2, 3, 4: Quota Breakdown Numbers */}
          <div className="md:col-span-4 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Total Quota</div>
              <div className="text-base font-black text-slate-900 mt-0.5">{requestedSlots} pax</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Assigned</div>
              <div className="text-base font-black text-orange-600 mt-0.5">{totalAssigned} pax</div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Available</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">{remainingSlots} slots</div>
            </div>
          </div>

          {/* Card 5: Progress Bar & Target Date */}
          <div className="md:col-span-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-600 text-[11px]">Allocation Progress</span>
              <span className="font-bold text-emerald-600 text-xs">{percentAssigned}% Completed</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${percentAssigned}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-1.5">
              <span>Contract Cap: {requestedSlots} pax</span>
              <span>
                Target:{' '}
                {slotData?.needByDate
                  ? new Date(slotData.needByDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '20 Nov 2026'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`mx-6 mt-3 p-3 rounded-xl text-xs flex items-center gap-2 border animate-in fade-in-50 duration-150 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {feedbackMessage.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* 3. TABS NAVIGATION & EXPORT BAR (Matching Image 1) */}
      <div className="px-6 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'roster'
                ? 'border-orange-500 text-orange-600 bg-orange-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">person_add</span>
            <span>Assign One by One</span>
            {activeTab === 'roster' && (
              <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.2 rounded-full uppercase">
                Active
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'bulk'
                ? 'border-orange-500 text-orange-600 bg-orange-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">group_add</span>
            <span>Assign Bulk List</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-orange-500 text-orange-600 bg-orange-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">upload_file</span>
            <span>Upload Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('assigned')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'assigned'
                ? 'border-orange-500 text-orange-600 bg-orange-50/40 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">checklist</span>
            <span>Assigned Employees</span>
            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">
              {assignments.length}
            </span>
          </button>
        </div>

        {/* Right side: Export Dispatch Sheet Button */}
        <button
          type="button"
          onClick={handleExportDispatch}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors mb-2 sm:mb-0"
          title="Export dispatch manifest Excel spreadsheet"
        >
          <span className="material-symbols-outlined text-[16px] text-slate-500">download</span>
          <span>Export Dispatch Sheet</span>
        </button>
      </div>

      {/* 4. MAIN TWO-COLUMN BODY LAYOUT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 bg-[#F8FAFC]">
        <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-5 items-start">
          {/* ========================================================================= */}
          {/* LEFT COLUMN: MAIN WORKSPACE (~75% width on xl/desktop screens)              */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4 min-w-0">
            {/* ------------------------------------------------------------- */}
            {/* TAB 1 & 2: Roster Selection & Bulk Assign                     */}
            {/* ------------------------------------------------------------- */}
            {(activeTab === 'roster' || activeTab === 'bulk') && (
              <div className="space-y-4">
                {/* 5. BATCH ASSIGNMENT CONFIGURATION CARD (Moved to Top as Requested) */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                        <h4 className="font-display font-black text-xs uppercase tracking-wider text-slate-900">
                          Batch Assignment Configuration for Selected Personnel ({selectedCount})
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Applies to: <span className="font-semibold text-slate-700">{selectedNamesPreview}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Target Clinic Allocation
                      </label>
                      <select
                        value={targetClinicAllocation}
                        onChange={(e) => setTargetClinicAllocation(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white shadow-2xs"
                      >
                        <option value="AUTO">Auto-Assign to Best Vacant Clinic</option>
                        {clinicStats.map((c: any) => (
                          <option key={c.vendorId} value={c.vendorId}>
                            Assign Selected to: {c.vendorName} ({c.remainingSlots} slots available)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Mobilization / Appointment Date
                      </label>
                      <input
                        type="date"
                        value={targetMobilizationDate}
                        onChange={(e) => setTargetMobilizationDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-orange-500 focus:bg-white shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      {remainingSlots === 0 ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          <span>All {requestedSlots} quota slots have been fulfilled. No additional personnel required.</span>
                        </span>
                      ) : (
                        <>
                          Ready to assign <strong className="text-slate-800">{selectedCount} personnel</strong> into{' '}
                          <strong className="text-slate-800">{remainingSlots} remaining quota slots</strong>.{' '}
                          <span className="text-slate-400">
                            Post-action remaining: {postActionRemaining} slots across {clinicStats.length || 4} clinics.
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedCandidateIds(new Set())}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmBatchAssign}
                        disabled={submittingBatch || selectedCount === 0 || remainingSlots === 0}
                        className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">group_add</span>
                        <span>
                          {submittingBatch ? 'Assigning...' : `Confirm & Assign ${selectedCount} Employees`}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Stats Strip (Matching Image 1 Left Screen) */}
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 font-mono">
                  <div>
                    <span>Total Quota: <strong>{requestedSlots}</strong></span>
                    <span className="mx-2">&bull;</span>
                    <span>Assigned: <strong className="text-orange-700">{totalAssigned}</strong></span>
                    <span className="mx-2">&bull;</span>
                    <span>In This Batch: <strong className="text-slate-900">{selectedCount}</strong></span>
                    <span className="mx-2">&bull;</span>
                    <span>Remaining Vacant: <strong className="text-emerald-700">{postActionRemaining}</strong></span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Auto-validated against PMTA clinical constraints &amp; contracted clinic quotas.
                  </span>
                </div>

                {/* Search, Department & Filter Controls */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-6 relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                        search
                      </span>
                      <input
                        type="text"
                        value={rosterSearch}
                        onChange={(e) => {
                          setRosterSearch(e.target.value);
                          setRosterPage(1);
                        }}
                        placeholder="Search employee by name, badge ID, iqama, department..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                      />
                      {rosterSearch && (
                        <button
                          type="button"
                          onClick={() => setRosterSearch('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="sm:col-span-4">
                      <select
                        value={rosterDeptFilter}
                        onChange={(e) => {
                          setRosterDeptFilter(e.target.value);
                          setRosterPage(1);
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-orange-500 focus:bg-white shadow-2xs"
                      >
                        <option value="ALL">Department: All Departments</option>
                        {availableDepartments.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRosterSearch('');
                          setRosterDeptFilter('ALL');
                          setQuickFilter('ALL');
                          setRosterPage(1);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">tune</span>
                        <span>Filters</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick Filters Strip & Selected Counter */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">Quick Filters:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickFilter('ALL');
                          setRosterPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          quickFilter === 'ALL'
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All Eligible ({filteredCandidates.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickFilter('OPERATIONS');
                          setRosterPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          quickFilter === 'OPERATIONS'
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Operations
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickFilter('MAINTENANCE');
                          setRosterPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          quickFilter === 'MAINTENANCE'
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Maintenance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickFilter('SAFETY');
                          setRosterPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          quickFilter === 'SAFETY'
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Safety Cleared
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickFilter('EXPIRING');
                          setRosterPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          quickFilter === 'EXPIRING'
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Expiring Soon
                      </button>
                    </div>

                    <div className="text-xs">
                      <span className="font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg">
                        {selectedCount} Selected for Slot Quota
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bulk Paste Box (If on Bulk Tab) */}
                {activeTab === 'bulk' && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800">
                        Paste Badge Numbers (one per line, comma or tab separated):
                      </label>
                      <button
                        type="button"
                        onClick={handleBulkPasteAssign}
                        disabled={submittingBatch || !pastedBadges.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                      >
                        {submittingBatch ? 'Assigning...' : 'Assign Pasted Badges'}
                      </button>
                    </div>
                    <textarea
                      rows={3}
                      value={pastedBadges}
                      onChange={(e) => setPastedBadges(e.target.value)}
                      placeholder="11000008&#10;11000012&#10;11000015..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                )}

                {/* Candidate Roster Table (Matching Image 1 Left Side) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#FAFBFD] text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                paginatedCandidates.length > 0 &&
                                paginatedCandidates.every((c) => selectedCandidateIds.has(c.id || c.employeeNo))
                              }
                              onChange={handleSelectAllOnPage}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Employee</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[95px]">SAP ID</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px]">Iqama Number</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">Department &amp; Trade</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[115px]">Medical Status</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Target Clinic Split</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap w-24">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {rosterLoading ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400">
                              <span className="material-symbols-outlined text-3xl animate-spin text-orange-500">
                                progress_activity
                              </span>
                              <div className="mt-2 text-xs font-semibold">Loading workforce candidates...</div>
                            </td>
                          </tr>
                        ) : paginatedCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                              No eligible employees found matching your criteria.
                            </td>
                          </tr>
                        ) : (
                          paginatedCandidates.map((emp, index) => {
                            const isSelected = selectedCandidateIds.has(emp.id || emp.employeeNo);
                            const initials = (emp.name || 'Worker')
                              .split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();

                            // Deterministic mock status for illustration matching mockup
                            const statuses = ['Due for Renewal', 'Pending Mobilization', 'Ready to Schedule', 'Not Booked'];
                            const statusLabel = statuses[index % statuses.length];
                            const statusColor =
                              statusLabel === 'Ready to Schedule'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : statusLabel === 'Due for Renewal'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : statusLabel === 'Pending Mobilization'
                                ? 'bg-orange-50 text-orange-900 border-orange-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200';

                            // Assigned clinic target display
                            const defaultClinicName =
                              clinicStats[0]?.vendorName || 'Ar Raji Medical (11 left)';

                            return (
                              <tr
                                key={emp.id || emp.employeeNo}
                                className={`transition-colors hover:bg-slate-50/80 ${
                                  isSelected ? 'bg-orange-50/40' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleCandidate(emp.id || emp.employeeNo)}
                                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                        index % 2 === 0
                                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}
                                    >
                                      {initials}
                                    </div>
                                    <div className="font-bold text-slate-900 truncate whitespace-nowrap">{emp.name}</div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {emp.employeeNo}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {emp.iqamaId || '—'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-slate-800 whitespace-nowrap">
                                    {emp.department || 'Operations (PMTA)'}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusColor}`}
                                  >
                                    {statusLabel}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  {isSelected ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                      <span>{defaultClinicName}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 text-xs italic">Unassigned</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleCandidate(emp.id || emp.employeeNo)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'text-orange-700 bg-orange-100 hover:bg-orange-200'
                                        : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                                    }`}
                                  >
                                    {isSelected ? 'Change' : 'Assign'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Pagination */}
                  <div className="p-3 bg-[#FAFBFD] border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Showing {filteredCandidates.length > 0 ? (rosterPage - 1) * ROSTER_PAGE_SIZE + 1 : 0} to{' '}
                      {Math.min(rosterPage * ROSTER_PAGE_SIZE, filteredCandidates.length)} of{' '}
                      {filteredCandidates.length} personnel candidates
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                        disabled={rosterPage === 1}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold cursor-pointer"
                      >
                        Previous
                      </button>
                      <span className="px-2.5 py-1 bg-orange-600 text-white font-bold rounded-lg text-xs">
                        {rosterPage}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRosterPage((p) => Math.min(totalRosterPages, p + 1))}
                        disabled={rosterPage >= totalRosterPages}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 3: Upload Excel                                          */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'upload' && (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs text-center space-y-4">
                <div className="h-16 w-16 rounded-3xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-sm">
                  <span className="material-symbols-outlined text-3xl">upload_file</span>
                </div>
                <div>
                  <h4 className="font-display font-black text-base text-slate-900">
                    Upload Workforce Excel / CSV Roster
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Upload a spreadsheet containing employee badge numbers or Iqama IDs to instantly match and batch-assign to this slot quota.
                  </p>
                </div>

                <div className="max-w-md mx-auto border-2 border-dashed border-slate-300 hover:border-orange-500 rounded-2xl p-6 transition-colors bg-slate-50/50">
                  <input
                    type="file"
                    id="excel-file-input"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <label htmlFor="excel-file-input" className="cursor-pointer space-y-2 block">
                    <span className="material-symbols-outlined text-4xl text-slate-400">cloud_upload</span>
                    <div className="text-xs font-bold text-slate-800">
                      Click to choose file <span className="text-slate-500 font-normal">or drag &amp; drop</span>
                    </div>
                    <div className="text-[10px] text-slate-400">Supported formats: .XLSX, .XLS, .CSV</div>
                  </label>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* TAB 4: Assigned Employees (Matching Image 1 Right Screen)     */}
            {/* ------------------------------------------------------------- */}
            {activeTab === 'assigned' && (
              <div className="space-y-4">
                {/* Search, Filter Pills & Quick Actions */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                    <div className="sm:col-span-6 relative">
                      <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                        search
                      </span>
                      <input
                        type="text"
                        value={assignedSearch}
                        onChange={(e) => setAssignedSearch(e.target.value)}
                        placeholder="Search assigned employees by name, badge ID, iqama..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white shadow-2xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={assignedClinicFilter}
                        onChange={(e) => setAssignedClinicFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="ALL">All Clinics ({clinicStats.length || 4})</option>
                        {clinicStats.map((c: any) => (
                          <option key={c.vendorId} value={c.vendorId}>
                            {c.vendorName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        value={assignedDateFilter}
                        onChange={(e) => setAssignedDateFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
                      >
                        <option value="ALL">All Dates</option>
                        <option value="TODAY">Today</option>
                        <option value="TOMORROW">Tomorrow</option>
                        <option value="WEEK">Next 7 Days</option>
                      </select>
                    </div>
                  </div>

                  {/* Clinic Filter Pills & Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setAssignedClinicFilter('ALL')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          assignedClinicFilter === 'ALL'
                            ? 'bg-orange-100 text-orange-900 border border-orange-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        All Assigned ({assignments.length})
                      </button>
                      {clinicStats.map((c: any) => (
                        <button
                          key={c.vendorId}
                          type="button"
                          onClick={() => setAssignedClinicFilter(c.vendorId)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            assignedClinicFilter === c.vendorId
                              ? 'bg-orange-100 text-orange-900 border border-orange-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {c.vendorName} ({c.assignedSlots || 0})
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowSplitModal(true)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">sync_alt</span>
                        <span>Reassign Clinic</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (assignments.length > 0) {
                            handleUnassignEmployee(assignments[0].requestId, assignments[0].name);
                          }
                        }}
                        disabled={assignments.length === 0}
                        className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        <span>Remove / Unassign</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Assigned Employees Table (Matching Image 1 Right Screen) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-[#FAFBFD] text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                filteredAssignments.length > 0 &&
                                selectedAssignedIds.size === filteredAssignments.length
                              }
                              onChange={() => {
                                if (selectedAssignedIds.size === filteredAssignments.length) {
                                  setSelectedAssignedIds(new Set());
                                } else {
                                  setSelectedAssignedIds(new Set(filteredAssignments.map((a) => a.requestId)));
                                }
                              }}
                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[150px]">Employee</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[95px]">SAP ID</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[110px]">Iqama Number</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">Department &amp; Site</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[140px]">Assigned Clinic</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[130px]">Appointment Date &amp; Time</th>
                          <th className="py-2.5 px-3 whitespace-nowrap min-w-[120px]">Status</th>
                          <th className="py-2.5 px-3 text-right whitespace-nowrap w-20">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAssignments.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                              No employees assigned to this slot quota yet.{' '}
                              <button
                                type="button"
                                onClick={() => setActiveTab('roster')}
                                className="text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                              >
                                Assign from Roster now &rarr;
                              </button>
                            </td>
                          </tr>
                        ) : (
                          filteredAssignments.map((a, idx) => {
                            const isChecked = selectedAssignedIds.has(a.requestId);
                            const formattedAppt = a.apptDate
                              ? new Date(a.apptDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                              : '19 Nov 2026';

                            return (
                              <tr
                                key={a.requestId || idx}
                                className={`transition-colors hover:bg-slate-50/80 ${
                                  isChecked ? 'bg-orange-50/30' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setSelectedAssignedIds((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(a.requestId)) next.delete(a.requestId);
                                        else next.add(a.requestId);
                                        return next;
                                      });
                                    }}
                                    className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                                  />
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                      {(a.name || 'EM')
                                        .split(' ')
                                        .map((n: string) => n[0])
                                        .slice(0, 2)
                                        .join('')}
                                    </div>
                                    <div className="font-bold text-slate-900 truncate whitespace-nowrap">{a.name}</div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                  {a.employeeNo}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                                  {a.iqamaId || '—'}
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="font-medium text-slate-800 whitespace-nowrap">
                                    {a.department || 'Operations (PMTA)'}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                                    <span>{a.vendorName || 'Ar Raji Medical Center'}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <div className="font-medium text-slate-900">{formattedAppt}</div>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                                    <span>08:30 AM</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Confirmed with Clinic</span>
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignEmployee(a.requestId, a.name)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                    title="Unassign employee"
                                  >
                                    <span className="material-symbols-outlined text-[17px]">close</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Verification Compliance Footer */}
                  <div className="p-3 bg-[#FAFBFD] border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                      <span>
                        Showing {filteredAssignments.length} of {assignments.length} assigned personnel &bull; All entries
                        verified against PMTA clinical compliance
                      </span>
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span>Page 1 of 1</span>
                    </div>
                  </div>
                </div>

                {/* Notice: Need Even Split Across Approved Clinics (Only show when vacancies remain to split) */}
                {remainingSlots > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[20px]">balance</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-amber-900">
                          Need Even Split Across Approved Clinics?
                        </h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          You have {remainingSlots} pending allocations across {clinicStats.length || 4} clinics. Ar Raji
                          Medical currently holds {percentAssigned > 0 ? 'majority' : '100%'} of booked capacity.
                        </p>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600 bg-white/80 border border-amber-200 px-2 py-0.5 rounded-md w-fit">
                          <span className="material-symbols-outlined text-[12px] text-slate-400">navigation</span>
                          <span>Ar Raji (8.4 km &bull; 12m from Gate 1)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSplitModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-amber-200 shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px] text-amber-700">auto_fix_high</span>
                      <span>Preview Auto-Balance</span>
                    </button>
                  </div>
                )}

                {/* Bottom Action Bar for Assigned Tab */}
                <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    {remainingSlots === 0 ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] text-emerald-600">check_circle</span>
                        <span>
                          <strong className="text-emerald-800">All {requestedSlots} quota slots</strong> have been fully assigned &amp; verified across{' '}
                          {clinicStats.length || 4} approved clinics.
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px] text-orange-600">info</span>
                        <span>
                          <strong className="text-slate-900">{assignments.length} personnel</strong> assigned out of{' '}
                          <strong>{requestedSlots} total quota</strong> &bull;{' '}
                          <span className="text-emerald-700 font-bold">{remainingSlots} vacant slots</span> remain across{' '}
                          {clinicStats.length || 4} approved clinics.
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportDispatch}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      <span>Export Dispatch Manifest</span>
                    </button>
                    {remainingSlots > 0 ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('roster')}
                        className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">group_add</span>
                        <span>Assign More Personnel</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">task_alt</span>
                        <span>Allocation Complete</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: APPROVED CLINICS CAPACITY & DISTRIBUTION SIDEBAR (~25%)     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-3.5 min-w-0">
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3.5">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between">
                <h4 className="font-display font-black text-xs text-slate-900 tracking-tight">
                  Approved Clinics Capacity &amp; Distribution
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {clinicStats.length || 4} Active
                </span>
              </div>

              {/* Clinic Search Input */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
                  search
                </span>
                <input
                  type="text"
                  value={clinicSearch}
                  onChange={(e) => setClinicSearch(e.target.value)}
                  placeholder="Filter clinics by name or location..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                />
              </div>

              {/* Clinic Cards List (Matching Image 1 Sidebar) */}
              <div className="space-y-2.5">
                {filteredClinics.map((clinic: any) => {
                  const cap = clinic.allocatedSlots || 0;
                  const assigned = clinic.assignedSlots || 0;
                  const vacancies = Math.max(0, cap - assigned);
                  const fulfillmentPercent = cap > 0 ? Math.round((assigned / cap) * 100) : 0;
                  const friendlyName =
                    CLINIC_FRIENDLY_NAMES[clinic.vendorCode] || clinic.vendorName || clinic.code;
                  const location =
                    CLINIC_LOCATIONS[clinic.vendorCode] || 'Jubail Industrial Area';

                  return (
                    <div
                      key={clinic.vendorId || clinic.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition-all shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                vacancies > 0 ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            <span className="font-bold text-xs text-slate-900 truncate" title={friendlyName}>
                              {friendlyName}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 pl-3.5 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">location_on</span>
                            <span>{location}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 block">
                            {assigned} / {cap} slots
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">
                            {vacancies} vacancies left
                          </span>
                        </div>
                      </div>

                      {/* Fulfillment Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>Fulfillment</span>
                          <span className="font-bold text-slate-700">{fulfillmentPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${fulfillmentPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Card Footer: Cap & Filter Roster Link */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="text-slate-400 font-mono">
                          Cap: {cap} / {requestedSlots}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignedClinicFilter(clinic.vendorId);
                            setActiveTab('assigned');
                          }}
                          className="text-orange-600 hover:text-orange-800 font-bold flex items-center gap-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[12px]">filter_list</span>
                          <span>Filter roster</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sidebar Summary & Additional Quota Button */}
              <div className="pt-3 border-t border-slate-200 space-y-2.5">
                <div className="text-[11px] flex items-center justify-between text-slate-600">
                  <span>Total Approved Capacity:</span>
                  <strong className="text-slate-900">
                    {clinicStats.length || 4} Clinics / {requestedSlots} Slots
                  </strong>
                </div>
                <div className="text-[11px] flex items-center justify-between text-slate-600">
                  <span>Allocated Personnel:</span>
                  <strong className="text-orange-700">{totalAssigned} slots</strong>
                </div>
                <div className="text-[11px] flex items-center justify-between text-slate-600">
                  <span>Available Balance:</span>
                  <strong className="text-emerald-700">{remainingSlots} slots</strong>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSplitModal(true)}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-300 hover:border-orange-500 hover:bg-orange-50/50 text-slate-700 hover:text-orange-700 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>Request Additional Clinic Quota</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. ADJUST CLINIC SPLIT MODAL (Tucked neatly into dialog)                   */}
      {/* ========================================================================= */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">tune</span>
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-900">
                    Adjust Clinic Capacity Split
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribute {requestedSlots} slots across approved medical providers
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Split Inputs */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {allClinics.map((clinic) => {
                const currentVal = splitDraft[clinic.id] || 0;
                return (
                  <div
                    key={clinic.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {CLINIC_FRIENDLY_NAMES[clinic.code] || clinic.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {clinic.code} &bull; {CLINIC_LOCATIONS[clinic.code] || 'Jubail'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={requestedSlots}
                        value={currentVal}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setSplitDraft((prev) => ({
                            ...prev,
                            [clinic.id]: val
                          }));
                        }}
                        className="w-20 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 text-center focus:outline-none focus:border-orange-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const draft: Record<string, number> = {};
                          allClinics.forEach((c) => {
                            draft[c.id] = c.id === clinic.id ? requestedSlots : 0;
                          });
                          setSplitDraft(draft);
                        }}
                        className="text-[10px] text-orange-600 hover:underline font-semibold"
                      >
                        All {requestedSlots}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Allocated Indicator & Split Evenly Button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSplitEvenly}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1 shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">balance</span>
                <span>Split Evenly</span>
              </button>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Total Allocated:</span>
                <span
                  className={`text-sm font-black font-mono ${
                    Object.values(splitDraft).reduce((sum, v) => sum + (Number(v) || 0), 0) === requestedSlots
                      ? 'text-emerald-600'
                      : 'text-amber-600'
                  }`}
                >
                  {Object.values(splitDraft).reduce((sum, v) => sum + (Number(v) || 0), 0)} / {requestedSlots} slots
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveClinicSplit}
                disabled={savingSplit}
                className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50"
              >
                {savingSplit ? 'Saving...' : 'Confirm Clinic Split'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
