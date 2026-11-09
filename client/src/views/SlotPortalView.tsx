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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5 bg-[#F3F5F7] min-h-screen">
      {/* 1. Header with Title, Queue Counter & Action Buttons (Matching Page 2) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1B2430] tracking-tight">
            {activeMenu === 'queue' && 'Allocation queue'}
            {activeMenu === 'by-clinic' && 'Allocations by clinic'}
            {activeMenu === 'price-comparison' && 'Price comparison'}
          </h1>
          <div className="text-xs text-[#5A6472] mt-0.5">
            {activeMenu === 'queue' && 'Assign each slot request across clinics, starting with those expiring soon.'}
            {activeMenu === 'by-clinic' && 'Pre-booked quota currently assigned to each approved clinic.'}
            {activeMenu === 'price-comparison' && 'Compare agreed contract rates (SAR) across accredited partner clinics.'}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {activeMenu === 'queue' && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FDECD6] text-[#7A3A05]">
              {queue.length} requests in queue
            </span>
          )}

          <button
            type="button"
            onClick={loadQueueData}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-900 bg-white border border-[#DDE3E9] rounded-lg cursor-pointer shadow-2xs min-h-[44px] flex items-center justify-center"
            title="Refresh Queue"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportSummary}
            className="px-3.5 py-2 bg-white border border-[#DDE3E9] hover:bg-slate-50 text-[#1B2430] rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer min-h-[44px]"
          >
            Export
          </button>

          <button
            type="button"
            onClick={() => setIsPreBookModalOpen(true)}
            className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer min-h-[44px] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">add_box</span>
            <span>+ Pre-Book Slots</span>
          </button>
        </div>
      </div>

      {/* 2. Clean Pill Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveMenu('queue')}
          className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer min-h-[44px] flex items-center gap-2 ${
            activeMenu === 'queue'
              ? 'bg-[#0A0F1D] text-white shadow-xs'
              : 'bg-white border border-[#DDE3E9] text-[#1B2430] hover:bg-slate-50'
          }`}
        >
          <span>Allocation queue</span>
          <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#D8F0E3] text-[#0B5132]">
            {queue.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMenu('by-clinic')}
          className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer min-h-[44px] ${
            activeMenu === 'by-clinic'
              ? 'bg-[#0A0F1D] text-white shadow-xs'
              : 'bg-white border border-[#DDE3E9] text-[#1B2430] hover:bg-slate-50'
          }`}
        >
          Allocations by clinic
        </button>

        {!isHrRole && (
          <button
            type="button"
            onClick={() => setActiveMenu('price-comparison')}
            className={`px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer min-h-[44px] ${
              activeMenu === 'price-comparison'
                ? 'bg-[#0A0F1D] text-white shadow-xs'
                : 'bg-white border border-[#DDE3E9] text-[#1B2430] hover:bg-slate-50'
            }`}
          >
            Price comparison
          </button>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0A0F1D] text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-2 duration-150 border border-slate-700">
          <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3. Main Views */}
      {/* TAB 1: ALLOCATION QUEUE */}
      {activeMenu === 'queue' && (
        <div className="space-y-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-[#5A6472] font-semibold bg-white rounded-xl border border-[#DDE3E9]">
              Loading slot allocation requests from database...
            </div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-white rounded-xl border border-[#DDE3E9]">
              <div className="text-sm font-bold text-[#1B2430]">No Pending Slot Allocation Requests</div>
              <p className="text-xs text-[#5A6472] max-w-sm mx-auto">
                All pre-booked employee slots have been allocated across partner clinics.
              </p>
            </div>
          ) : (
            queue.map((req) => {
              const currentAllocated = getCardAllocatedSum(req.id);
              const isFullyAllocated = currentAllocated === req.requestedSlots;
              const isOverAllocated = currentAllocated > req.requestedSlots;
              const currentRows = cardClinicRows[req.id] || [];

              return (
                <div
                  key={req.id}
                  className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs space-y-4 transition-all"
                >
                  {/* Top Row: ID, Title, Dept Pill, requested / assigned summary */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <b className="text-[16px] text-[#1B2430] font-bold">{req.id}</b>
                      <span className="text-[15px] font-semibold text-[#1B2430]">{req.title}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-[#5A6472] border border-[#DDE3E9]">
                        {req.department}
                      </span>
                      {req.daysRemaining !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#FDECD6] text-[#7A3A05]">
                          Disappears in {req.daysRemaining}d
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#5A6472]">
                      {req.requestedSlots} slots requested &bull; {req.assignedSlots || 0}/{req.requestedSlots} assigned &bull; Need-by {req.needByDate ? new Date(req.needByDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '20 Nov'}
                    </div>
                  </div>

                  {/* Clinic Input Grid (Matching Page 2 prototype: .cl) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                    {currentRows.map((row, colIndex) => {
                      const clinicObj = allClinics.find(c => c.id === row.vendorId);
                      return (
                        <div key={colIndex} className="space-y-1">
                          <label className="block text-xs font-semibold text-[#1B2430] truncate" title={clinicObj?.name}>
                            {clinicObj?.name || `Clinic ${colIndex + 1}`}
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={req.requestedSlots}
                            value={row.slots}
                            onChange={(e) => handleUpdateRowSlots(req.id, colIndex, e.target.value)}
                            className="w-full border border-[#C5CED7] bg-white rounded-lg px-3 py-2 text-[13px] font-bold text-[#1B2430] min-h-[44px] focus:outline-none focus:border-secondary shadow-2xs"
                          />
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
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Action Bar: Status Pill + Actions (Matching Page 2 prototype) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EEF1F4]">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        isFullyAllocated
                          ? 'bg-[#D8F0E3] text-[#0B5132]'
                          : isOverAllocated
                          ? 'bg-[#FBE0DD] text-[#912018]'
                          : 'bg-[#FDECD6] text-[#7A3A05]'
                      }`}>
                        {currentAllocated} of {req.requestedSlots} allocated
                      </span>

                      {isCentralOrAdmin && (
                        <button
                          type="button"
                          onClick={() => handleAddClinicRow(req.id)}
                          className="text-xs font-semibold text-slate-500 hover:text-secondary flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Add another clinic column"
                        >
                          <span className="material-symbols-outlined text-[15px]">add</span>
                          <span>Add Clinic</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSplitEvenly(req)}
                        className="px-4 py-2 bg-white border border-[#DDE3E9] hover:bg-slate-50 text-[#1B2430] rounded-lg text-xs font-semibold transition-all min-h-[40px] cursor-pointer shadow-2xs"
                      >
                        Split evenly
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssigningSlotId(req.id)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-all min-h-[40px] cursor-pointer"
                        title="View and assign workforce to this quota"
                      >
                        Workforce ({req.assignedSlots || 0}/{req.requestedSlots})
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfirmAllocation(req)}
                        className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-xs font-semibold transition-all min-h-[40px] shadow-xs cursor-pointer"
                      >
                        Confirm allocation
                      </button>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="text-xs text-[#5A6472] pt-2 border-t border-[#EEF1F4]">
                    Facility: {req.plant || 'Sadara Complex (Jubail)'} &bull; Requested by System Administrator {req.note && `&bull; Note: "${req.note}"`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: ALLOCATIONS BY CLINIC (Matching Page 3) */}
      {activeMenu === 'by-clinic' && (
        <div>
          {clinicLoading ? (
            <div className="p-12 text-center text-xs text-[#5A6472] font-semibold bg-white rounded-xl border border-[#DDE3E9]">
              Loading clinic breakdown...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clinicSummaries.map((clinic) => (
                <div
                  key={clinic.id || clinic.code}
                  className="bg-white border border-[#DDE3E9] rounded-xl p-5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <b className="text-[16px] text-[#1B2430] font-bold block">{clinic.name}</b>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#5A6472] font-mono border border-[#DDE3E9]">
                          {clinic.code}
                        </span>
                        <span className="text-xs text-[#5A6472]">
                          Active reservations: {clinic.allocationsCount ?? (clinic.allocations?.length || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-[#5A6472]">Total slots</div>
                      <div className="text-[28px] font-bold text-primary leading-tight">
                        {clinic.totalAllocatedSlots ?? 0}
                      </div>
                    </div>
                  </div>

                  {/* Active Allocations List */}
                  <div className="divide-y divide-[#EEF1F4] pt-2 border-t border-[#EEF1F4]">
                    {(!clinic.allocations || clinic.allocations.length === 0) ? (
                      <div className="text-xs text-[#5A6472] italic py-2">No active reservations assigned yet</div>
                    ) : (
                      clinic.allocations.map((alloc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#1B2430]">{alloc.slotRequestId || `SR-${1007 + idx}`}</span>
                            <span className="text-[#5A6472]">{alloc.testName || 'Sadara medical test'}</span>
                          </div>
                          <b className="text-[#1B2430]">
                            {alloc.allocatedSlots} slots
                          </b>
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
        <div className="bg-white border border-[#DDE3E9] rounded-xl shadow-2xs overflow-hidden">
          {priceLoading ? (
            <div className="p-12 text-center text-xs text-[#5A6472] font-semibold">
              Loading contracted price comparison...
            </div>
          ) : (
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
                <tbody className="divide-y divide-[#EEF1F4] font-medium">
                  {priceData.tests.map((test) => (
                    <tr key={test.testId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1B2430]">{test.testName}</div>
                        <div className="text-[10.5px] text-[#5A6472] font-mono">SAP Code: {test.testId}</div>
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
                                    ? 'bg-[#D8F0E3] text-[#0B5132] font-bold'
                                    : 'text-[#1B2430]'
                                }`}
                              >
                                SAR {rate.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300">&mdash;</span>
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
                            <div className="text-[10px] text-[#5A6472] truncate">
                              {test.lowestClinicName}
                            </div>
                          </div>
                        ) : (
                          '&mdash;'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
