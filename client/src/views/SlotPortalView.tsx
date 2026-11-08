import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { SlotAssignmentModal } from '../components/slots/SlotAssignmentModal';

interface ClinicSlotItem {
  id: string;
  code: string;
  name: string;
  allocated: number;
}

interface ActiveAllocItem {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  allocatedSlots: number;
}

interface SlotRequestItem {
  id: string; // e.g. SR-1007
  title: string;
  testId?: string;
  testName?: string;
  department: string;
  plant?: string;
  requestedSlots: number;
  allocatedSlots: number;
  assignedSlots?: number;
  remainingSlots?: number;
  status: string;
  needByDate?: string;
  note?: string;
  createdByName?: string;
  createdAt?: string;
  ageDays?: number;
  daysRemaining?: number;
  isExpired?: boolean;
  autoDisappearDate?: string;
  allocations: Record<string, number>;
  activeAllocations?: ActiveAllocItem[];
  clinics: ClinicSlotItem[];
}

interface ClinicOption {
  id: string;
  code: string;
  name: string;
  tier?: string;
  sapVendorNo?: string;
}

interface AllocationRow {
  vendorId: string;
  slots: number;
}

interface SlotPortalViewProps {
  userRole?: string;
  userName?: string;
  onSwitchRole?: (role: string) => Promise<void> | void;
}

export const SlotPortalView: React.FC<SlotPortalViewProps> = ({
  userRole = 'CENTRAL',
  userName = '',
  onSwitchRole
}) => {
  // Strict Role Guardrail: Medical Slot Portal is for HR, Requester, Central Medical Team & Admin
  if (!['CENTRAL', 'ADMIN', 'HR', 'REQUESTER'].includes(userRole)) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#F8FAF9]">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              The Medical Slot Portal is reserved for HR Coordinators and the <strong>Central Medical Team</strong> to pre-book and dispatch clinic quotas.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.href = '/dashboard'}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Return to Your Authorized Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  // Module Navigation
  const [activeMenu, setActiveMenu] = useState<'queue' | 'by-clinic' | 'price-comparison'>('queue');
  const [selectedRoleView, setSelectedRoleView] = useState<string>('Central Medical Team');

  useEffect(() => {
    if (userRole === 'CENTRAL') {
      setSelectedRoleView('Central Medical Team');
    }
  }, [userRole]);

  // Queue and Clinic Data
  const [queue, setQueue] = useState<SlotRequestItem[]>([]);
  const [allClinics, setAllClinics] = useState<ClinicOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Slot Governance Expiry State
  const [slotExpiryDays, setSlotExpiryDays] = useState<number>(7);
  const [showExpired, setShowExpired] = useState<boolean>(false);
  const [expiredCount, setExpiredCount] = useState<number>(0);

  // Workforce Assignment Modal State
  const [assigningSlotId, setAssigningSlotId] = useState<string | null>(null);

  // Selected request in queue (which card is active/expanded for clinic assignment)
  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);

  // Dynamic clinic rows per card: { [requestId]: AllocationRow[] }
  const [cardClinicRows, setCardClinicRows] = useState<Record<string, AllocationRow[]>>({});

  // State for Allocations by Clinic
  const [clinicSummaries, setClinicSummaries] = useState<any[]>([]);
  const [clinicLoading, setClinicLoading] = useState(false);

  // State for Price Comparison
  const [priceData, setPriceData] = useState<{ clinics: any[]; tests: any[] }>({ clinics: [], tests: [] });
  const [priceLoading, setPriceLoading] = useState(false);

  // Pre-Book New Slots Modal State (For HR or Central Team)
  const [masterTests, setMasterTests] = useState<any[]>([]);
  const [isPreBookModalOpen, setIsPreBookModalOpen] = useState(false);
  const [newTestId, setNewTestId] = useState('5004955');
  const [newTitle, setNewTitle] = useState('Sadara Medical');
  const [newDept, setNewDept] = useState('PMTA');
  const [newPlant, setNewPlant] = useState('Sadara Complex (Jubail)');
  const [newSlots, setNewSlots] = useState<number>(50);
  const [newNeedBy, setNewNeedBy] = useState('2026-11-20');
  const [newNote, setNewNote] = useState('Turnaround advance reservation for 50 unassigned workforce');
  const [submittingPreBook, setSubmittingPreBook] = useState(false);

  // Console view options (Procurement rates vs Central Medical Team queue)
  const isProcurementRole = selectedRoleView === 'Procurement central';
  const isCentralOrAdmin = userRole === 'CENTRAL' || userRole === 'ADMIN';
  const isHrRole = userRole === 'HR' || userRole === 'REQUESTER';

  // Handle Role Switching from Dropdown
  const handleRoleViewChange = async (newView: string) => {
    setSelectedRoleView(newView);

    if (newView === 'Procurement central') {
      setActiveMenu('price-comparison');
      showToast('Switched to Procurement Central: Contract Rates & Quota Allocation');
    } else {
      setActiveMenu('queue');
      showToast('Switched to Central Medical Team: Slot Allocation Console');
    }
  };

  useEffect(() => {
    loadQueueData();
    api.getTests().then(res => {
      if (res.data?.tests) {
        setMasterTests(res.data.tests);
        if (res.data.tests.length > 0) {
          setNewTestId(res.data.tests[0].id);
          setNewTitle(res.data.tests[0].name);
        }
      }
    }).catch(console.error);
  }, [showExpired]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const loadQueueData = async () => {
    try {
      setLoading(true);
      const res = await api.getSlotQueue({ includeExpired: showExpired });
      if (res.data) {
        const fetchedQueue: SlotRequestItem[] = res.data.requests || [];
        const fetchedClinics: ClinicOption[] = res.data.allClinics || [];
        setQueue(fetchedQueue);
        setAllClinics(fetchedClinics);
        if (res.data.slotExpiryDays) setSlotExpiryDays(res.data.slotExpiryDays);
        if (res.data.expiredCount !== undefined) setExpiredCount(res.data.expiredCount);

        // Initialize dynamic 4-column layout matching screenshot (Ar Raji, Badr Al Khaleej, Dina, Gulf Asian)
        const initialRowsMap: Record<string, AllocationRow[]> = {};
        const primaryClinicIds = ['V4', 'V1', 'V5', 'V2'];

        fetchedQueue.forEach((req) => {
          const allocMap: Record<string, number> = {};
          if (req.allocations) {
            Object.entries(req.allocations).forEach(([vId, val]) => {
              allocMap[vId] = typeof val === 'number' ? val : 0;
            });
          }
          if (req.activeAllocations) {
            req.activeAllocations.forEach(a => {
              allocMap[a.vendorId] = a.allocatedSlots;
            });
          }

          // Build row list starting with the 4 primary clinics
          const rows: AllocationRow[] = primaryClinicIds.map(vId => ({
            vendorId: vId,
            slots: allocMap[vId] || 0
          }));

          // If there are other clinics with allocations not in primaryClinicIds, append them
          Object.entries(allocMap).forEach(([vId, slots]) => {
            if (!primaryClinicIds.includes(vId) && slots > 0) {
              rows.push({ vendorId: vId, slots });
            }
          });

          initialRowsMap[req.id] = rows;
        });

        setCardClinicRows(initialRowsMap);

        if (fetchedQueue.length > 0 && !selectedReqId) {
          setSelectedReqId(fetchedQueue[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to load slot queue:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadClinicData = async () => {
    try {
      setClinicLoading(true);
      const res = await api.getSlotsByClinic();
      setClinicSummaries(res.data?.clinics || []);
    } catch (e) {
      console.error('Failed to load clinic summaries:', e);
    } finally {
      setClinicLoading(false);
    }
  };

  const loadPriceData = async () => {
    try {
      setPriceLoading(true);
      const res = await api.getSlotsPriceComparison();
      setPriceData(res.data || { clinics: [], tests: [] });
    } catch (e) {
      console.error('Failed to load price comparison:', e);
    } finally {
      setPriceLoading(false);
    }
  };

  useEffect(() => {
    if (activeMenu === 'by-clinic') loadClinicData();
    if (activeMenu === 'price-comparison') loadPriceData();
  }, [activeMenu]);

  // Update clinic dropdown choice for a specific row
  const handleUpdateRowClinic = (reqId: string, rowIndex: number, newVendorId: string) => {
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])];
      if (rows[rowIndex]) {
        rows[rowIndex] = { ...rows[rowIndex], vendorId: newVendorId };
      }
      return { ...prev, [reqId]: rows };
    });
  };

  // Update slots count for a specific row
  const handleUpdateRowSlots = (reqId: string, rowIndex: number, slotsStr: string) => {
    const slots = Math.max(0, parseInt(slotsStr, 10) || 0);
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])];
      if (rows[rowIndex]) {
        rows[rowIndex] = { ...rows[rowIndex], slots };
      }
      return { ...prev, [reqId]: rows };
    });
  };

  // Add another clinic row with dropdown
  const handleAddClinicRow = (reqId: string) => {
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])];
      // Pick a clinic that isn't already in the list if possible
      const usedIds = new Set(rows.map(r => r.vendorId));
      const nextAvailable = allClinics.find(c => !usedIds.has(c.id)) || allClinics[0];
      const nextVendorId = nextAvailable?.id || 'V1';
      rows.push({ vendorId: nextVendorId, slots: 0 });
      return { ...prev, [reqId]: rows };
    });
  };

  // Remove a clinic row
  const handleRemoveClinicRow = (reqId: string, rowIndex: number) => {
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])];
      if (rows.length > 1) {
        rows.splice(rowIndex, 1);
      } else {
        // If only 1 left, just set slots to 0
        rows[0] = { ...rows[0], slots: 0 };
      }
      return { ...prev, [reqId]: rows };
    });
  };

  // Assign ALL slots to a specific column clinic
  const handleAssignAllToThisColumn = (reqId: string, colIndex: number, requestedTotal: number) => {
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])].map((r, idx) => ({
        ...r,
        slots: idx === colIndex ? requestedTotal : 0
      }));
      return { ...prev, [reqId]: rows };
    });
    showToast(`Assigned all ${requestedTotal} slots to column #${colIndex + 1}. Click 'Confirm allocation' to save.`);
  };

  // Assign ALL slots to a single clinic
  const handleAssignAllToOneClinic = (reqId: string, requestedTotal: number) => {
    setCardClinicRows(prev => {
      const rows = [...(prev[reqId] || [])];
      const primaryVendorId = rows[0]?.vendorId || allClinics[0]?.id || 'V4';
      return {
        ...prev,
        [reqId]: [{ vendorId: primaryVendorId, slots: requestedTotal }]
      };
    });
    showToast(`Assigned all ${requestedTotal} slots to single clinic. Click 'Confirm allocation' to save.`);
  };

  // Calculate sum of slots across all clinic rows for a card
  const getCardAllocatedSum = (reqId: string): number => {
    const rows = cardClinicRows[reqId] || [];
    return rows.reduce((sum, r) => sum + (r.slots || 0), 0);
  };

  // Split slots evenly across current clinic rows
  const handleSplitEvenly = (req: SlotRequestItem) => {
    const rows = cardClinicRows[req.id] || [];
    if (rows.length === 0) return;

    const total = req.requestedSlots;
    const baseShare = Math.floor(total / rows.length);
    let remainder = total % rows.length;

    const updatedRows = rows.map(r => {
      const share = baseShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder--;
      return { ...r, slots: share };
    });

    setCardClinicRows(prev => ({
      ...prev,
      [req.id]: updatedRows
    }));

    showToast(`Evenly divided ${total} slots across ${rows.length} clinics for ${req.id}`);
  };

  // Fill remaining slots into a specific row
  const handleFillRemaining = (req: SlotRequestItem, rowIndex: number) => {
    const rows = [...(cardClinicRows[req.id] || [])];
    const otherSum = rows.reduce((sum, r, idx) => idx === rowIndex ? sum : sum + (r.slots || 0), 0);
    const remaining = Math.max(0, req.requestedSlots - otherSum);

    if (rows[rowIndex]) {
      rows[rowIndex] = { ...rows[rowIndex], slots: remaining };
    }

    setCardClinicRows(prev => ({
      ...prev,
      [req.id]: rows
    }));
  };

  // Confirm Allocation and persist to PostgreSQL database
  const handleConfirmAllocation = async (req: SlotRequestItem) => {
    const rows = cardClinicRows[req.id] || [];
    const allocationsMap: Record<string, number> = {};
    let totalAllocated = 0;

    rows.forEach(r => {
      if (r.vendorId && r.slots > 0) {
        allocationsMap[r.vendorId] = (allocationsMap[r.vendorId] || 0) + r.slots;
        totalAllocated += r.slots;
      }
    });

    try {
      const res = await api.allocateSlots(req.id, {
        allocations: allocationsMap,
        status: totalAllocated >= req.requestedSlots ? 'CONFIRMED' : 'ALLOCATED'
      });

      showToast(res.data?.message || `Confirmed allocation for ${req.id} (${totalAllocated} of ${req.requestedSlots} slots).`);
      loadQueueData();
    } catch (e: any) {
      alert(`Allocation failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Submit Pre-Book Request (e.g. 50 slots for undecided employees)
  const handleSubmitPreBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newSlots <= 0) {
      alert('Please enter a valid number of slots (e.g. 50)');
      return;
    }

    try {
      setSubmittingPreBook(true);
      const matchedTest = masterTests.find(t => t.id === newTestId);
      const res = await api.createSlotRequest({
        title: matchedTest ? matchedTest.name : newTitle,
        testId: newTestId,
        department: newDept,
        plant: newPlant,
        requestedSlots: newSlots,
        needByDate: newNeedBy || undefined,
        note: newNote
      });

      showToast(`Created slot reservation ${res.data?.slotRequest?.id || 'new'} for ${newSlots} employees! Sent to Central Queue.`);
      setIsPreBookModalOpen(false);
      loadQueueData();
    } catch (e: any) {
      alert(`Pre-booking failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSubmittingPreBook(false);
    }
  };

  // Export Allocation Summary to CSV
  const handleExportSummary = () => {
    const headers = ['Slot Request ID', 'Test Protocol', 'Department', 'Requested Slots', 'Allocated Slots', 'Status'];
    const rows = queue.map(q => [
      q.id,
      q.title,
      q.department,
      q.requestedSlots,
      q.allocatedSlots,
      q.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Medical_Slot_Allocation_Queue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* 1. Portal Top Navigation Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-display font-extrabold text-slate-900 text-base">
            <span className="material-symbols-outlined text-secondary text-[22px]">calendar_month</span>
            <span>Medical Slot Portal</span>
          </div>
          <span className="text-slate-300">|</span>
          <span className="text-xs text-slate-500 font-medium">
            Central Medical Team Slot Allocation &amp; Clinic Dispatch
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-xl text-xs font-semibold text-orange-800">
            <span className="text-secondary font-normal">Console:</span>
            <span className="font-bold">Central Medical Team</span>
          </div>

          <button
            type="button"
            onClick={handleExportSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span>Export</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPreBookModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            <span>+ Pre-Book Slots</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-150 border border-slate-700">
          <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Main Portal Body: Left Dark Sidebar + Right Content Area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Dark Sidebar - Matches Expertise Dark Navy Theme */}
        <div className="w-64 bg-[#0A0F1D] text-white flex flex-col justify-between p-4 border-r border-slate-800 shrink-0 select-none overflow-y-auto">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">calendar_month</span>
                <span className="font-display font-extrabold text-sm text-white tracking-wide">Medical Slot Portal</span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium pl-7">
                Expertise workforce
              </div>
            </div>

            {/* Dropdown Selector */}
            <div className="relative">
              <select
                value={selectedRoleView}
                onChange={(e) => handleRoleViewChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg px-3 py-2 pr-7 appearance-none focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="Procurement central">Procurement central</option>
                <option value="Central Medical Team">Central Medical Team</option>
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-2.5 text-slate-400 text-[16px] pointer-events-none">
                expand_more
              </span>
            </div>

            {/* Nav Menu Items */}
            <nav className="space-y-1.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveMenu('queue')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'queue'
                    ? 'bg-secondary/15 text-secondary border border-secondary/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Allocation queue</span>
                <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-secondary text-white font-mono text-[10.5px] font-extrabold flex items-center justify-center">
                  {queue.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('by-clinic')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeMenu === 'by-clinic'
                    ? 'bg-secondary/15 text-secondary border border-secondary/30 shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>Allocations by clinic</span>
              </button>

              {!isHrRole && (
                <button
                  type="button"
                  onClick={() => setActiveMenu('price-comparison')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeMenu === 'price-comparison'
                      ? 'bg-secondary/15 text-secondary border border-secondary/30 shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>Price comparison</span>
                </button>
              )}
            </nav>
          </div>

          {/* Quick Pre-Book Card in Sidebar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs space-y-2 mt-4">
            <div className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-secondary">group_add</span>
              <span>Need Slots for 50?</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pre-book quota in advance when employee names are not yet decided.
            </p>
            <button
              type="button"
              onClick={() => setIsPreBookModalOpen(true)}
              className="w-full py-1.5 bg-secondary hover:bg-secondary-hover text-white font-extrabold rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
            >
              + Pre-Book 50 Slots
            </button>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* TAB 1: ALLOCATION QUEUE (CENTRAL MEDICAL TEAM VIEW) */}
          {activeMenu === 'queue' && (
            <div className="max-w-5xl mx-auto space-y-5">
              {/* Header Title & Subtitle */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-3 border-b border-slate-200/80">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                    Allocation queue
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any slot request below to assign slots across different clinics or the same clinic using dropdowns.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {expiredCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowExpired(prev => !prev);
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                        showExpired
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {showExpired ? 'visibility_off' : 'visibility'}
                      </span>
                      <span>{showExpired ? `Hide Disappeared (${expiredCount})` : `Show ${expiredCount} Disappeared`}</span>
                    </button>
                  )}
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    {queue.length} Requests in Queue
                  </span>
                  <button
                    type="button"
                    onClick={loadQueueData}
                    disabled={loading}
                    className="p-1.5 text-slate-500 hover:text-slate-900 bg-white border border-slate-200 rounded-lg cursor-pointer"
                    title="Refresh Queue"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
                  Loading slot allocation requests from database...
                </div>
              ) : queue.length === 0 ? (
                <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
                  <div className="text-sm font-bold text-slate-800">No Pending Slot Allocation Requests</div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All pre-booked employee slots have been allocated. Pre-book new capacity slots above.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queue.map((req) => {
                    const currentAllocated = getCardAllocatedSum(req.id);
                    const isFullyAllocated = currentAllocated === req.requestedSlots;
                    const isOverAllocated = currentAllocated > req.requestedSlots;
                    const isSelected = selectedReqId === req.id;
                    const currentRows = cardClinicRows[req.id] || [];

                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedReqId(isSelected ? null : req.id)}
                        className={`bg-white border rounded-2xl p-5 shadow-2xs space-y-4 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-secondary ring-2 ring-secondary/20 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {/* 1. Header: Matches screenshot (SR-1007 Sadara Medical [PMTA] 10 slots requested) */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-display font-extrabold text-slate-950 text-base">
                              {req.id}
                            </span>
                            <span className="font-display font-bold text-slate-800 text-base">
                              {req.title}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {req.department}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {req.requestedSlots} slots requested
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10.5px] font-bold bg-orange-50 text-orange-800 border border-orange-200">
                              {req.assignedSlots || 0}/{req.requestedSlots} assigned
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10.5px] font-bold border flex items-center gap-1 ${
                                req.isExpired
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : (req.daysRemaining !== undefined && req.daysRemaining <= 2)
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title={`Configured in Admin: Pre-booked slots disappear in ${slotExpiryDays} days`}
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {req.isExpired ? 'event_busy' : 'schedule'}
                              </span>
                              <span>{req.isExpired ? 'Disappeared / Expired' : `Disappears in ${req.daysRemaining ?? slotExpiryDays}d`}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {req.needByDate && (
                              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                                Need-by: {new Date(req.needByDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningSlotId(req.id);
                              }}
                              className="px-2.5 py-1 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              title="Assign or view employees for this slot quota"
                            >
                              <span className="material-symbols-outlined text-[14px]">group</span>
                              <span>Workforce ({req.assignedSlots || 0}/{req.requestedSlots})</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReqId(isSelected ? null : req.id);
                              }}
                              className="text-xs text-secondary font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isSelected ? 'Less info' : 'Details'}</span>
                              <span className="material-symbols-outlined text-[16px]">
                                {isSelected ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* 2. Clinic Columns Grid (EXACT MATCH TO SCREENSHOT WITH CLINIC DROPDOWNS) */}
                        <div
                          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {currentRows.map((row, colIndex) => {
                            const selectedClinic = allClinics.find(c => c.id === row.vendorId);
                            const displayName = selectedClinic ? selectedClinic.name : row.vendorId;

                            return (
                              <div key={colIndex} className="space-y-1.5">
                                {/* Clinic Dropdown: User can choose other clinics */}
                                <div className="relative">
                                  <select
                                    value={row.vendorId}
                                    disabled={isHrRole}
                                    onChange={(e) => handleUpdateRowClinic(req.id, colIndex, e.target.value)}
                                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 pr-7 focus:outline-none focus:border-secondary focus:bg-white transition-all cursor-pointer truncate disabled:bg-slate-100 disabled:cursor-not-allowed"
                                    title="Choose clinic for this allocation column"
                                  >
                                    {allClinics.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="material-symbols-outlined absolute right-1.5 top-1.5 text-slate-400 text-[16px] pointer-events-none">
                                    expand_more
                                  </span>
                                </div>

                                {/* Slot Number Input (Matches screenshot [ 10 ] [ 0 ] etc.) */}
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max={req.requestedSlots}
                                    value={row.slots}
                                    disabled={isHrRole}
                                    onChange={(e) => handleUpdateRowSlots(req.id, colIndex, e.target.value)}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/20 transition-all text-left disabled:bg-slate-50 disabled:cursor-not-allowed"
                                  />
                                </div>

                                {/* Quick Shortcuts when Central Team clicks/focuses */}
                                {isCentralOrAdmin && (
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAssignAllToThisColumn(req.id, colIndex, req.requestedSlots)}
                                      className="hover:text-secondary font-semibold hover:underline cursor-pointer"
                                      title="Assign 100% of the requested slots to this clinic"
                                    >
                                      All {req.requestedSlots} here
                                    </button>
                                    {currentRows.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveClinicRow(req.id, colIndex)}
                                        className="hover:text-red-600 cursor-pointer"
                                        title="Remove this clinic column"
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* 3. Bottom Action Bar: Pill + Confirm allocation + Split evenly */}
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Left: Status Pill (Exact match to screenshot pills) */}
                          <div className="flex items-center gap-2">
                            {isOverAllocated ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#FEE2E2] text-[#991B1B] border border-red-200">
                                <span className="h-2 w-2 rounded-full bg-red-600"></span>
                                <span>Over-allocated: {currentAllocated} of {req.requestedSlots}</span>
                              </span>
                            ) : isFullyAllocated ? (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#DCFCE7] text-[#166534] border border-emerald-200">
                                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                                <span>{currentAllocated} of {req.requestedSlots} allocated</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-amber-200">
                                <span className="h-2 w-2 rounded-full bg-amber-600"></span>
                                <span>{currentAllocated} of {req.requestedSlots} allocated</span>
                              </span>
                            )}

                            {isCentralOrAdmin && (
                              <button
                                type="button"
                                onClick={() => handleAddClinicRow(req.id)}
                                className="text-[11px] font-bold text-slate-500 hover:text-secondary flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Add another clinic column"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                <span>Add Clinic</span>
                              </button>
                            )}
                          </div>

                          {/* Right: Confirm Allocation + Split Evenly buttons */}
                          {isCentralOrAdmin && (
                            <div className="flex items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleConfirmAllocation(req)}
                                className="bg-secondary hover:bg-secondary-hover text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">check_circle</span>
                                <span>Confirm allocation</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSplitEvenly(req)}
                                className="bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2 rounded-lg border border-slate-300 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">balance</span>
                                <span>Split evenly</span>
                              </button>
                            </div>
                          )}

                          {isHrRole && (
                            <span className="text-xs text-slate-400 italic">
                              Clinic quotas confirmed and dispatched by Central Medical Team
                            </span>
                          )}
                        </div>

                        {/* 4. Collapsible Details Drawer */}
                        {isSelected && (
                          <div
                            className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                              {req.plant && (
                                <span>Facility: <strong className="text-slate-700">{req.plant}</strong></span>
                              )}
                              {req.needByDate && (
                                <span>Need-By: <strong className="text-slate-700">{new Date(req.needByDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
                              )}
                              <span>Requested by: <strong className="text-slate-700">{req.createdByName || 'HR Coordinator'}</strong></span>
                              {req.note && (
                                <span className="italic text-slate-400">Note: &quot;{req.note}&quot;</span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedReqId(null)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 underline cursor-pointer"
                            >
                              Close details
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALLOCATIONS BY CLINIC */}
          {activeMenu === 'by-clinic' && (
            <div className="max-w-5xl mx-auto space-y-5">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                  Allocations by clinic
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Active pre-booked quota assigned to approved medical centers.
                </p>
              </div>

              {clinicLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
                  Loading clinic breakdown...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clinicSummaries.map((clinic) => (
                    <div
                      key={clinic.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-base text-slate-900">{clinic.name}</h3>
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {clinic.code}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            CR: {clinic.crNumber || '2051028391'} &bull; SAP Vendor: {clinic.sapVendorNo || '1001502'}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Total Slots</span>
                          <span className="font-display font-extrabold text-2xl text-secondary">
                            {clinic.totalAllocatedSlots}
                          </span>
                        </div>
                      </div>

                      {/* Active Allocations List */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <span className="text-[10.5px] uppercase font-bold text-slate-400 tracking-wider">
                          Active Reservations ({clinic.allocationsCount})
                        </span>
                        {clinic.allocations.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-1">No slots allocated yet</div>
                        ) : (
                          clinic.allocations.map((alloc: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800">{alloc.slotRequestId}</span>
                                <span className="font-semibold text-slate-700">{alloc.testName}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                                  {alloc.department}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-primary">
                                {alloc.allocatedSlots} slots
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PRICE COMPARISON */}
          {activeMenu === 'price-comparison' && (
            <div className="max-w-5xl mx-auto space-y-5">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                  Price comparison matrix
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Compare agreed contract rates (SAR) across clinics to optimize quota allocation and cost savings.
                </p>
              </div>

              {priceLoading ? (
                <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
                  Loading contracted price comparison...
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#131B35] text-white uppercase text-[10.5px] font-bold tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Test Protocol / Package</th>
                          {priceData.clinics.map((c) => (
                            <th key={c.id} className="py-3 px-3 text-center">
                              <div>{c.name}</div>
                              <div className="text-[9.5px] text-slate-400 font-mono font-normal">({c.code})</div>
                            </th>
                          ))}
                          <th className="py-3 px-4 text-right">Optimal Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {priceData.tests.map((test) => (
                          <tr key={test.testId} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{test.testName}</div>
                              <div className="text-[10.5px] text-slate-400 font-mono">SAP Code: {test.testId}</div>
                            </td>

                            {priceData.clinics.map((c) => {
                              const rate = test.rates[c.id];
                              const isLowest = rate && rate === test.lowestRate;

                              return (
                                <td key={c.id} className="py-3 px-3 text-center font-mono">
                                  {rate ? (
                                    <span
                                      className={`inline-block px-2 py-0.5 rounded ${
                                        isLowest
                                          ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                                          : 'text-slate-700'
                                      }`}
                                    >
                                      SAR {rate.toFixed(2)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">—</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-3 px-4 text-right font-mono">
                              {test.lowestRate ? (
                                <div>
                                  <span className="font-bold text-secondary text-sm">
                                    SAR {test.lowestRate.toFixed(2)}
                                  </span>
                                  <div className="text-[10px] text-slate-400 truncate">
                                    {test.lowestClinicName}
                                  </div>
                                </div>
                              ) : (
                                '—'
                              )}
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
      </div>

      {/* 3. Pre-Book Advance Slots Modal (For HR or Central Team) */}
      {isPreBookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
            <div className="bg-[#131B35] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">Pre-Book Capacity Slots</h3>
                  <p className="text-[11px] text-slate-300">
                    Send slot booking request for unassigned employees to Central Medical Team
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPreBookModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitPreBook} className="p-6 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                    Number of Slots Needed
                  </label>
                  <div className="flex items-center gap-1">
                    {[10, 20, 50, 100].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setNewSlots(cnt)}
                        className={`text-[10.5px] px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                          newSlots === cnt ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  min="1"
                  value={newSlots}
                  onChange={(e) => setNewSlots(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 50"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-base font-extrabold text-slate-900 focus:outline-none focus:border-secondary"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Medical Test Package *
                </label>
                <select
                  value={newTestId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setNewTestId(tid);
                    const found = masterTests.find(t => t.id === tid);
                    if (found) setNewTitle(found.name);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-secondary"
                >
                  {masterTests.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.name} ({t.validityMonths > 0 ? `${t.validityMonths} Months Validity` : 'One-off/swab'})
                    </option>
                  ))}
                </select>
                {masterTests.find(t => t.id === newTestId) && (
                  <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>SAP Material Code: <strong className="text-slate-600 font-mono">{newTestId}</strong></span>
                    <span>Accredited Clinics: <strong className="text-slate-600">{masterTests.find(t => t.id === newTestId)?.ratedClinics || 'BAK, GAMC'}</strong></span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="PMTA">PMTA</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="LOGISTIC">LOGISTIC</option>
                    <option value="E&I">E&amp;I</option>
                    <option value="ISSD">ISSD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Need-By Date
                  </label>
                  <input
                    type="date"
                    value={newNeedBy}
                    onChange={(e) => setNewNeedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Industrial Facility / Site
                </label>
                <input
                  type="text"
                  value={newPlant}
                  onChange={(e) => setNewPlant(e.target.value)}
                  placeholder="e.g. Sadara Complex (Jubail) or Yanpet Plant"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Purpose / Notes
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Notes for Central Medical Team..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPreBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPreBook}
                  className="bg-secondary hover:bg-secondary-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingPreBook ? 'Submitting...' : `Send Request for ${newSlots} Slots`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workforce Slot Assignment Modal */}
      {assigningSlotId && (
        <SlotAssignmentModal
          slotId={assigningSlotId}
          isOpen={!!assigningSlotId}
          onClose={() => setAssigningSlotId(null)}
          onAssignmentUpdated={loadQueueData}
        />
      )}
    </div>
  );
};
