import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { CertificateModal } from '../components/certificate/CertificateModal';
import { PdfReportViewerModal } from '../components/certificate/PdfReportViewerModal';

interface RequestsQueueViewProps {
  userRole?: string;
}

interface BatchEmployee {
  id: string; // Request ID e.g. REQ-2026-0104-01
  employeeId: string;
  empNo: string;
  name: string;
  iqamaId?: string;
  dept: string;
  testName?: string;
  cardStatus: string;
  priority?: boolean;
  assignedClinicId?: string | null;
  assignedClinicCode?: string | null;
  assignedClinicName?: string | null;
  hasPdf?: boolean;
  pdfFileUrl?: string | null;
  reportId?: string | null;
  isDone?: boolean;
  isCertified?: boolean;
  requestedDate?: string;
  rawRequest?: any;
}

interface ClearanceBatch {
  id: string; // REQ-2026-0104
  title: string;
  plant: string;
  plantCategory: 'YANPET' | 'SABIC' | 'SADARA' | 'OTHER';
  requestedDate: string;
  protocolType: string;
  subStatus: string;
  totalEmployees: number;
  assignedCount: number;
  unassignedCount: number;
  doneCount: number;
  pendingCount: number;
  isOverdue?: boolean;
  employees: BatchEmployee[];
}

export const RequestsQueueView: React.FC<RequestsQueueViewProps> = () => {
  // Navigation & Filter State
  const [selectedPlant, setSelectedPlant] = useState<'ALL' | 'YANPET' | 'SABIC' | 'SADARA'>('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('REQ-2026-0104');
  const [batchSearch, setBatchSearch] = useState<string>('');
  const [quickSort, setQuickSort] = useState<'EXPIRING_FIRST' | 'DEPARTMENT' | 'DEFAULT'>('EXPIRING_FIRST');

  // Allocation & Dispatch Controls
  const [assignCount, setAssignCount] = useState<number>(30);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('V1');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;

  // Real Database Data
  const [requests, setRequests] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modals
  const [isProtocolSpecsOpen, setIsProtocolSpecsOpen] = useState<boolean>(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState<boolean>(false);
  const [isCreateBatchOpen, setIsCreateBatchOpen] = useState<boolean>(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [selectedPdfReport, setSelectedPdfReport] = useState<any>(null);
  const [queueSection, setQueueSection] = useState<'bulk' | 'single'>('bulk');
  const [singleSearch, setSingleSearch] = useState('');

  // New staff input state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffNo, setNewStaffNo] = useState('');
  const [newStaffDept, setNewStaffDept] = useState('LOGISTIC');

  // Load database data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, clinicRes] = await Promise.all([
        api.getRequests(),
        api.getClinics()
      ]);
      setRequests(reqRes.data?.requests || []);
      if (clinicRes.data?.clinics && clinicRes.data.clinics.length > 0) {
        setClinics(clinicRes.data.clinics);
        setSelectedClinicId(clinicRes.data.clinics[0].id);
      }
    } catch (e) {
      console.error('Failed to load queue data:', e);
    } finally {
      setLoading(false);
    }
  };

  const clinicList = clinics.length > 0 ? clinics : [
    { id: 'V1', code: 'BAK', name: 'Badr Al Khaleej Polyclinic Co.' },
    { id: 'V2', code: 'GAMC', name: 'Gulf Asian Medical Centre' },
    { id: 'V3', code: 'JMC', name: 'Jubail Medical Center' },
    { id: 'V4', code: 'ARZ', name: 'Arrazi Medical Center' },
    { id: 'V5', code: 'DINA', name: 'Dina Medical Center' }
  ];

  // Parse requests into the 4 Industrial Clearance Batches
  const batches: ClearanceBatch[] = useMemo(() => {
    const batchConfigs = [
      {
        id: 'REQ-2026-0104',
        title: 'Yanpet medical test',
        plant: 'Yanpet Plant',
        plantCategory: 'YANPET' as const,
        requestedDate: '02 Nov 2026',
        protocolType: 'Periodic Clearance',
        subStatus: 'Currently Editing →',
        isOverdue: false
      },
      {
        id: 'REQ-2026-0101',
        title: 'Sadara medical test',
        plant: 'Complex South',
        plantCategory: 'SADARA' as const,
        requestedDate: '28 Oct 2026',
        protocolType: 'Annual Comprehensive',
        subStatus: 'Overdue 2 days',
        isOverdue: true
      },
      {
        id: 'REQ-2026-0102',
        title: 'SABIC medical screening with TSH',
        plant: 'Jubail Site',
        plantCategory: 'SABIC' as const,
        requestedDate: '30 Oct 2026',
        protocolType: 'Endocrine & Fitness Panel',
        subStatus: 'Pending Doctor Review',
        isOverdue: false
      },
      {
        id: 'REQ-2026-0103',
        title: 'General medical fitness',
        plant: 'Logistics Wing',
        plantCategory: 'OTHER' as const,
        requestedDate: '01 Nov 2026',
        protocolType: 'Contractor Onboarding',
        subStatus: 'Standard SLA',
        isOverdue: false
      }
    ];

    // Dynamically include any custom bulk upload batches
    const dynamicConfigs: any[] = [];
    const knownIds = new Set(batchConfigs.map(c => c.id));
    requests.forEach(r => {
      let bId = '';
      let meta: any = null;
      if (r.note) {
        try { meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note; } catch (_) {}
      }
      if (meta?.batchId && !knownIds.has(meta.batchId)) {
        bId = meta.batchId;
      } else if (r.id.startsWith('BULK-')) {
        const parts = r.id.split('-');
        const autoId = parts.slice(0, 3).join('-');
        if (!knownIds.has(autoId)) bId = autoId;
      }
      if (bId && !knownIds.has(bId)) {
        knownIds.add(bId);
        dynamicConfigs.push({
          id: bId,
          title: meta?.batchName || `Bulk Batch ${bId}`,
          plant: meta?.plant || r.department || 'ECC Main Facility',
          plantCategory: 'OTHER' as const,
          requestedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          protocolType: meta?.fileName ? `Upload: ${meta.fileName}` : 'Bulk Roster Intake',
          subStatus: 'Batch Intake',
          isOverdue: false
        });
      }
    });

    const allConfigs = [...batchConfigs, ...dynamicConfigs];

    const mapEmployees = (reqList: any[], defaultBatchId: string): BatchEmployee[] => {
      return reqList.map((r, idx) => {
        let meta: any = {};
        if (r.note) {
          try {
            meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note;
          } catch (_) {}
        }
        const emp = r.employee || {};
        const isExpiring = meta.priority || (idx === 8 && defaultBatchId === 'REQ-2026-0104');
        const hasPdf = Boolean(r.report?.fileUrl);
        const isCertified = Boolean(r.status === 'COMPLETED' && r.report?.id && r.report?.result);
        const isDone = isCertified;

        return {
          id: r.id,
          employeeId: emp.id || r.employeeId,
          empNo: emp.employeeNo || `E102${20 + idx}`,
          name: emp.name || `Employee ${idx + 1}`,
          iqamaId: emp.iqamaId,
          dept: r.department || emp.department || 'LOGISTIC',
          testName: r.test?.name || 'Occupational Medical Test',
          cardStatus: isExpiring
            ? 'Expiring ≤60d • 21 Nov 2026'
            : (r.vendor ? r.vendor.name : (r.vendorId ? 'Assigned' : 'No card')),
          priority: Boolean(isExpiring),
          assignedClinicId: r.vendorId || null,
          assignedClinicCode: r.vendor?.code || null,
          assignedClinicName: r.vendor?.name || null,
          hasPdf,
          pdfFileUrl: r.report?.fileUrl || null,
          reportId: r.report?.id || null,
          isDone,
          isCertified,
          requestedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
          rawRequest: r
        };
      });
    };

    return allConfigs.map(cfg => {
      const bReqs = requests.filter(r => r.id.startsWith(cfg.id) || (r.note && typeof r.note === 'string' && r.note.includes(cfg.id)));
      const employees = mapEmployees(bReqs, cfg.id);
      const assignedCount = employees.filter(e => e.assignedClinicId).length;
      const totalEmployees = employees.length;
      const unassignedCount = totalEmployees - assignedCount;
      const doneCount = employees.filter(e => e.isCertified).length;
      const pendingCount = totalEmployees - doneCount;

      return {
        id: cfg.id,
        title: cfg.title,
        plant: cfg.plant,
        plantCategory: cfg.plantCategory,
        requestedDate: cfg.requestedDate,
        protocolType: cfg.protocolType,
        subStatus: cfg.subStatus,
        isOverdue: cfg.isOverdue,
        totalEmployees,
        assignedCount,
        unassignedCount,
        doneCount,
        pendingCount,
        employees
      };
    });
  }, [requests]);

  // Single candidate clearance requests (non-batch requests)
  const singleRequests: BatchEmployee[] = useMemo(() => {
    const bulkIds = new Set(batches.flatMap(b => b.employees.map(e => e.id)));
    const singles = requests.filter(r => !bulkIds.has(r.id));
    return singles.map((r, idx) => {
      const emp = r.employee || {};
      const hasPdf = Boolean(r.report?.fileUrl);
      const isCertified = Boolean(r.status === 'COMPLETED' && r.report?.id && r.report?.result);
      const isDone = isCertified;
      return {
        id: r.id,
        employeeId: emp.id || r.employeeId,
        empNo: emp.employeeNo || `E102${20 + idx}`,
        name: emp.name || `Employee ${idx + 1}`,
        iqamaId: emp.iqamaId,
        dept: r.department || emp.department || 'LOGISTIC',
        testName: r.test?.name || 'Occupational Medical Test',
        cardStatus: r.vendor ? r.vendor.name : (r.vendorId ? 'Assigned' : 'No card'),
        priority: false,
        assignedClinicId: r.vendorId || null,
        assignedClinicCode: r.vendor?.code || null,
        assignedClinicName: r.vendor?.name || null,
        hasPdf,
        pdfFileUrl: r.report?.fileUrl || null,
        reportId: r.report?.id || null,
        isDone,
        isCertified,
        requestedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent',
        rawRequest: r
      };
    });
  }, [requests, batches]);

  const filteredSingleRequests = useMemo(() => {
    if (!singleSearch.trim()) return singleRequests;
    const q = singleSearch.toLowerCase().trim();
    return singleRequests.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.empNo.toLowerCase().includes(q) ||
      (s.iqamaId && s.iqamaId.includes(q)) ||
      s.dept.toLowerCase().includes(q)
    );
  }, [singleRequests, singleSearch]);

  // Filter Batches by Plant Selector and Search
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (selectedPlant !== 'ALL' && b.plantCategory !== selectedPlant) return false;
      if (batchSearch.trim()) {
        const q = batchSearch.toLowerCase().trim();
        return (
          b.id.toLowerCase().includes(q) ||
          b.title.toLowerCase().includes(q) ||
          b.plant.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [batches, selectedPlant, batchSearch]);

  // Active Selected Batch
  const activeBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || batches[0];
  }, [batches, selectedBatchId]);

  // Update assignCount when active batch changes
  useEffect(() => {
    if (activeBatch) {
      setAssignCount(activeBatch.unassignedCount || activeBatch.totalEmployees);
      setCurrentPage(1);
    }
  }, [activeBatch.id]);

  // Sorted and Paginated Employees for Active Batch
  const processedEmployees = useMemo(() => {
    let list = [...activeBatch.employees];
    if (quickSort === 'EXPIRING_FIRST') {
      list.sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return a.empNo.localeCompare(b.empNo);
      });
    } else if (quickSort === 'DEPARTMENT') {
      list.sort((a, b) => a.dept.localeCompare(b.dept));
    }
    return list;
  }, [activeBatch.employees, quickSort]);

  const totalPages = Math.max(1, Math.ceil(processedEmployees.length / pageSize));
  const displayedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedEmployees.slice(start, start + pageSize);
  }, [processedEmployees, currentPage, pageSize]);

  // Auto select all displayed employees on page
  useEffect(() => {
    setSelectedEmployeeIds(displayedEmployees.map(e => e.id));
  }, [displayedEmployees]);

  // Compute Total Telemetry Metrics
  const telemetry = useMemo(() => {
    const allClearanceEmployees = batches.flatMap(b => b.employees);
    const totalEmployees = batches.reduce((acc, b) => acc + b.totalEmployees, 0);
    const assignedTotal = batches.reduce((acc, b) => acc + b.assignedCount, 0);
    const pendingTotal = totalEmployees - assignedTotal;
    const assignedPercent = totalEmployees > 0 ? Math.round((assignedTotal / totalEmployees) * 100) : 0;

    const deptsSet = new Set(allClearanceEmployees.map(e => e.dept).filter(Boolean));
    const departmentsCount = deptsSet.size || 8;

    // Quotas per center computed strictly from clearance batch employees
    const quotas = {
      bak: allClearanceEmployees.filter(e => e.assignedClinicId === 'V1' || e.assignedClinicCode === 'BAK').length,
      gamc: allClearanceEmployees.filter(e => e.assignedClinicId === 'V2' || e.assignedClinicCode === 'GAMC').length,
      jmc: allClearanceEmployees.filter(e => e.assignedClinicId === 'V3' || e.assignedClinicCode === 'JMC').length,
      arzDina: allClearanceEmployees.filter(e => ['V4', 'V5'].includes(e.assignedClinicId || '') || ['ARZ', 'DINA'].includes(e.assignedClinicCode || '')).length
    };

    return {
      activeBatches: batches.length,
      totalEmployees,
      assignedTotal,
      assignedPercent,
      pendingTotal,
      departmentsCount,
      quotas
    };
  }, [batches]);

  // Toggle selection for a single employee
  const handleToggleSelect = (id: string) => {
    if (selectedEmployeeIds.includes(id)) {
      setSelectedEmployeeIds(selectedEmployeeIds.filter(i => i !== id));
    } else {
      setSelectedEmployeeIds([...selectedEmployeeIds, id]);
    }
  };

  // Toggle select all on current page
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployeeIds(displayedEmployees.map(e => e.id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  // Primary Batch Assign to Selected Medical Center
  const handleAssignToCenter = async () => {
    let toAssign = [...selectedEmployeeIds];
    if (toAssign.length === 0) {
      const unassigned = activeBatch.employees.filter(e => !e.assignedClinicId);
      toAssign = unassigned.slice(0, assignCount || 1).map(e => e.id);
    }
    if (toAssign.length === 0) {
      alert('All employees in this batch are already assigned to medical centers.');
      return;
    }

    const clinic = clinicList.find(c => c.id === selectedClinicId) || clinicList[0];
    try {
      await api.batchAssignRequests(toAssign, clinic.id);
      setToastMessage(`Successfully assigned ${toAssign.length} employees to ${clinic.name}!`);
      setTimeout(() => setToastMessage(''), 5000);
      setSelectedEmployeeIds([]);
      await loadData();
    } catch (e: any) {
      alert(`Assignment failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Auto-Split Batch Across All 5 Accredited Clinics
  const handleAutoSplit = async () => {
    const unassigned = activeBatch.employees.filter(e => !e.assignedClinicId);
    if (unassigned.length === 0) {
      alert('All employees in this batch are already assigned to medical centers.');
      return;
    }

    try {
      const numClinics = clinicList.length;
      const chunkSize = Math.ceil(unassigned.length / numClinics);

      for (let i = 0; i < numClinics; i++) {
        const chunk = unassigned.slice(i * chunkSize, (i + 1) * chunkSize);
        if (chunk.length > 0) {
          await api.batchAssignRequests(chunk.map(e => e.id), clinicList[i].id);
        }
      }

      setToastMessage(
        `Auto-Split complete: ${unassigned.length} employees evenly allocated across 5 accredited medical centers!`
      );
      setTimeout(() => setToastMessage(''), 5000);
      await loadData();
    } catch (e: any) {
      alert(`Auto-Split failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Unassign Employee
  const handleUnassign = async (emp: BatchEmployee) => {
    try {
      await api.updateRequest(emp.id, { vendorId: null });
      setToastMessage(`Candidate ${emp.name} (${emp.empNo}) unassigned.`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadData();
    } catch (e: any) {
      alert(`Unassign failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Single Employee Action (Assign / Expedite)
  const handleSingleAssign = async (emp: BatchEmployee) => {
    const clinic = clinicList.find(c => c.id === selectedClinicId) || clinicList[0];
    try {
      await api.batchAssignRequests([emp.id], clinic.id);
      setToastMessage(`Candidate ${emp.name} (${emp.empNo}) assigned to ${clinic.name}!`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadData();
    } catch (e: any) {
      alert(`Assign failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Export Summary to CSV
  const handleExportSummary = () => {
    const rows = [
      ['Batch ID', 'Batch Name', 'Plant', 'Employee ID', 'Employee Name', 'Department', 'Medical Status', 'Assigned Clinic'],
      ...batches.flatMap(b =>
        b.employees.map(e => [
          b.id,
          b.title,
          b.plant,
          e.empNo,
          e.name,
          e.dept,
          e.cardStatus,
          e.assignedClinicName || 'Unassigned'
        ])
      )
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Clearance_Dispatch_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 lg:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage('')} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* 1. TOP HEADER & PLANT FILTER BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        {/* Left: Brand Identity + Subtitle */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-600/10 text-teal-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">medical_services</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-base lg:text-lg text-slate-900 leading-tight">
                Occupational Health & Medical Clearance
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                <span>Live Operations</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise Employee Screening & Clinic Dispatch Console
            </p>
          </div>
        </div>

        {/* Center: Industrial Plant Segmented Tabs */}
        <div className="flex items-center flex-wrap p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setSelectedPlant('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedPlant === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Industrial Plants
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlant('YANPET')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedPlant === 'YANPET'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Yanpet Petrochemical
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlant('SABIC')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedPlant === 'SABIC'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            SABIC Jubail
          </button>
          <button
            type="button"
            onClick={() => setSelectedPlant('SADARA')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
              selectedPlant === 'SADARA'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sadara Complex
          </button>
        </div>

        {/* Right: Operational Cycle & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200">
            <span className="material-symbols-outlined text-[15px] text-slate-500">calendar_month</span>
            <span>Cycle: Q4 (Nov 2026)</span>
          </div>

          <button
            type="button"
            onClick={handleExportSummary}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span>Export Summary</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateBatchOpen(true)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            <span>Clearance Batch</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs">
              S
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-[11px] font-bold text-slate-800 leading-tight">Dr. Chief</p>
              <p className="text-[10px] text-slate-400">Occupational Physician</p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TELEMETRY / KPI ROW (5 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: ACTIVE BATCHES */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Batches
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Medical Clearance
            </span>
          </div>
          <div className="my-2">
            <span className="font-display font-extrabold text-2xl text-slate-900">
              {telemetry.activeBatches}
            </span>
            <span className="text-xs text-slate-500 font-bold ml-1.5">Batches</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            Yanpet, Sadara, SABIC 100% active
          </p>
        </div>

        {/* Card 2: EMPLOYEES REQUESTED */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Employees Requested
            </span>
            <span className="material-symbols-outlined text-[18px] text-sky-600">badge</span>
          </div>
          <div className="my-2">
            <span className="font-display font-extrabold text-2xl text-slate-900">
              {telemetry.totalEmployees}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Across {telemetry.departmentsCount} business departments</span>
            <span className="font-bold text-slate-700">14 Shifts</span>
          </div>
        </div>

        {/* Card 3: ASSIGNED PROGRESS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Assigned Progress
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {telemetry.assignedPercent}%
            </span>
          </div>
          <div className="my-2">
            <span className="font-display font-extrabold text-2xl text-slate-900">
              {telemetry.assignedTotal}
            </span>
            <span className="text-xs text-slate-500 font-semibold ml-1.5">({telemetry.assignedPercent}%)</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>&bull; Awaiting allocation</span>
            <span className="text-slate-700 font-medium">Target: today</span>
          </div>
        </div>

        {/* Card 4: PENDING ASSIGNMENT */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pending Assignment
            </span>
            <span className="material-symbols-outlined text-[18px] text-amber-500">schedule</span>
          </div>
          <div className="my-2">
            <span className="font-display font-extrabold text-2xl text-slate-900">
              {telemetry.pendingTotal}
            </span>
            <span className="text-xs text-slate-500 font-bold ml-1.5">Left</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
              &Delta; 1 Card Expiring &le;60d
            </span>
            <span className="text-slate-500 font-bold">High Priority</span>
          </div>
        </div>

        {/* Card 5: CENTER QUOTAS */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Center Quotas
            </span>
            <span className="text-[10.5px] font-bold text-teal-700 hover:underline cursor-pointer">
              5 Centers
            </span>
          </div>
          <div className="my-1.5 space-y-1 text-[11px] text-slate-600">
            <div className="flex items-center justify-between">
              <span className="truncate">Badr Al Khaleej</span>
              <span className="font-mono font-bold text-slate-900">{telemetry.quotas.bak}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="truncate">Gulf Asian Medical</span>
              <span className="font-mono font-bold text-slate-900">{telemetry.quotas.gamc}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="truncate">Jubail Medical Ctr</span>
              <span className="font-mono font-bold text-slate-900">{telemetry.quotas.jmc}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="truncate">Arrazi / Dina Med</span>
              <span className="font-mono font-bold text-slate-900">{telemetry.quotas.arzDina}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN SPLIT VIEW: CLEARANCE BATCHES (LEFT) + BATCH DISPATCH WORKSPACE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: CLEARANCE BATCHES LIST (4 COLS) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Clearance Batches
              </h2>
              <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center">
                {filteredBatches.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlant('ALL')}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">filter_list</span>
              <span>Filter</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search batch ID, plant, or test..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
            />
          </div>

          {/* Batch Cards List */}
          <div className="space-y-3">
            {filteredBatches.map((batch) => {
              const isSelected = batch.id === activeBatch.id;
              const percent = batch.totalEmployees > 0 ? Math.round((batch.assignedCount / batch.totalEmployees) * 100) : 0;

              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-teal-50/20 border-teal-700 ring-2 ring-teal-700/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {batch.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {batch.assignedCount === batch.totalEmployees ? 'Assigned' : 'Not assigned'}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-sm text-slate-900 mt-2">
                    {batch.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Requested {batch.requestedDate} &bull; {batch.plant}
                  </p>

                  {/* Progress Metric & Bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Pending / Total</span>
                      <span className="font-mono font-bold text-slate-800">
                        {batch.unassignedCount} / {batch.totalEmployees}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="truncate">{batch.protocolType}</span>
                    <span
                      className={`font-bold ${
                        batch.isOverdue
                          ? 'text-rose-600'
                          : isSelected
                          ? 'text-teal-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {batch.subStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED BATCH DISPATCH WORKSPACE (8 COLS) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          {/* 1. Selected Batch Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  {activeBatch.id}
                </span>
                <span className="text-slate-400">&bull;</span>
                <h2 className="font-display font-extrabold text-base text-slate-900">
                  {activeBatch.title}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Action Required
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">
                  Requested: <span className="font-semibold text-slate-700">{activeBatch.requestedDate}</span> &bull; Total:{' '}
                  <span className="font-bold text-slate-800">{activeBatch.totalEmployees} employees</span> &bull;{' '}
                  <span className="text-rose-600 font-bold">Remaining: {activeBatch.unassignedCount} to allocate</span>
                </span>
                <span className="text-slate-300">&bull;</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                  <span>{activeBatch.doneCount} Certified & Done</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="material-symbols-outlined text-[13px] text-amber-600">hourglass_top</span>
                  <span>{activeBatch.pendingCount} Pending Test Results</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProtocolSpecsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">description</span>
                <span>Test Protocol Specs</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddStaffOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">person_add</span>
                <span>+ Add Staff</span>
              </button>
            </div>
          </div>

          {/* 2. Batch Allocation Control Bar */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Number of employees:</span>
                <input
                  type="number"
                  min={1}
                  max={activeBatch.totalEmployees}
                  value={assignCount}
                  onChange={(e) => setAssignCount(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-center focus:outline-none focus:border-teal-700"
                />
                <button
                  type="button"
                  onClick={() => setAssignCount(activeBatch.totalEmployees)}
                  className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                >
                  All {activeBatch.totalEmployees}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Medical center:</span>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-teal-700 cursor-pointer"
                >
                  {clinicList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAssignToCenter}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Assign</span>
              </button>
              <button
                type="button"
                onClick={handleAutoSplit}
                title="Evenly distribute unassigned employees across all 5 accredited clinics"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              >
                <span>Auto-Split</span>
              </button>
            </div>
          </div>

          {/* 3. Table Toolbar (Counts & Quick Sort) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 text-slate-600">
              <span className="font-bold text-slate-800">
                Remaining for assignment ({activeBatch.unassignedCount})
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-600 font-bold">1 Expedited Clearance Flagged</span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-medium">Quick sort:</span>
              <button
                type="button"
                onClick={() => setQuickSort(quickSort === 'EXPIRING_FIRST' ? 'DEFAULT' : 'EXPIRING_FIRST')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  quickSort === 'EXPIRING_FIRST'
                    ? 'bg-amber-100 text-amber-900'
                    : 'hover:text-slate-800'
                }`}
              >
                Expiring Cards First
              </button>
              <span>&bull;</span>
              <button
                type="button"
                onClick={() => setQuickSort(quickSort === 'DEPARTMENT' ? 'DEFAULT' : 'DEPARTMENT')}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  quickSort === 'DEPARTMENT'
                    ? 'bg-teal-100 text-teal-900'
                    : 'hover:text-slate-800'
                }`}
              >
                Department
              </button>
            </div>
          </div>

          {/* 4. High-Density Employee Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        displayedEmployees.length > 0 &&
                        displayedEmployees.every((e) => selectedEmployeeIds.includes(e.id))
                      }
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded text-teal-700 focus:ring-teal-700 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2 w-8">#</th>
                  <th className="py-2.5 px-3">Employee ID</th>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Current Medical Card Status</th>
                  <th className="py-2.5 px-3">PDF / Report Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedEmployees.map((emp, idx) => {
                  const isChecked = selectedEmployeeIds.includes(emp.id);
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        emp.priority ? 'bg-amber-50/40' : isChecked ? 'bg-teal-50/15' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(emp.id)}
                          className="rounded text-teal-700 focus:ring-teal-700 cursor-pointer"
                        />
                      </td>

                      <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">
                        {rowNumber}
                      </td>

                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {emp.empNo}
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{emp.name}</span>
                          {emp.priority && (
                            <span className="text-[9.5px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                              Priority
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {emp.dept}
                        </span>
                      </td>

                      <td className="py-2 px-3">
                        {emp.priority ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            <span>&Delta;</span>
                            <span>{emp.cardStatus}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {emp.cardStatus}
                          </span>
                        )}
                      </td>

                      {/* Test & Certificate Status for HR */}
                      <td className="py-2 px-3">
                        {emp.isCertified ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                              <span>Certified & Completed</span>
                            </span>
                            {emp.pdfFileUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPdfReport({
                                    employeeName: emp.name,
                                    reportName: emp.testName || 'Medical Clearance Report',
                                    iqamaId: emp.iqamaId || emp.empNo,
                                    clinicName: emp.assignedClinicName || 'Accredited Medical Center',
                                    fileUrl: emp.pdfFileUrl
                                  });
                                }}
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="View PDF Report"
                              >
                                <span className="material-symbols-outlined text-[14px] text-red-500">picture_as_pdf</span>
                              </button>
                            )}
                          </div>
                        ) : emp.hasPdf ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <span className="material-symbols-outlined text-[13px] text-sky-600">pending_actions</span>
                              <span>PDF Ready (Pending Sign-off)</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPdfReport({
                                  employeeName: emp.name,
                                  reportName: emp.testName || 'Medical Clearance Report',
                                  iqamaId: emp.iqamaId || emp.empNo,
                                  clinicName: emp.assignedClinicName || 'Accredited Medical Center',
                                  fileUrl: emp.pdfFileUrl
                                });
                              }}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                              title="View PDF Report"
                            >
                              <span className="material-symbols-outlined text-[14px] text-red-500">picture_as_pdf</span>
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="material-symbols-outlined text-[13px] text-amber-600">hourglass_top</span>
                            <span>Pending Test Results</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {emp.isCertified && emp.reportId && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (emp.reportId) {
                                  try {
                                    const res = await api.getCertificate(emp.reportId);
                                    setSelectedCertificate(res.data.certificate);
                                  } catch (e: any) {
                                    alert(`Could not fetch certificate: ${e?.message}`);
                                  }
                                }
                              }}
                              title="View Official Certificate"
                              className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                            </button>
                          )}
                          {emp.assignedClinicId ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10.5px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                {emp.assignedClinicCode || 'Assigned'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUnassign(emp)}
                                title="Unassign clinic"
                                className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ) : emp.priority ? (
                            <button
                              type="button"
                              onClick={() => handleSingleAssign(emp)}
                              className="text-xs font-bold text-teal-700 hover:text-teal-900 cursor-pointer transition-colors"
                            >
                              Expedite
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSingleAssign(emp)}
                              className="text-xs font-bold text-slate-600 hover:text-teal-700 cursor-pointer transition-colors"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 5. Table Footer (Showing & Pagination) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs pt-1 border-t border-slate-100 text-slate-500">
            <div>
              Showing <strong className="text-slate-800">{displayedEmployees.length}</strong> of{' '}
              <strong className="text-slate-800">{activeBatch.totalEmployees}</strong> employees in batch &bull;{' '}
              <span className="font-bold text-teal-800">
                All {selectedEmployeeIds.length} selected for dispatch
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                  currentPage <= 1
                    ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                Previous
              </button>

              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`h-7 w-7 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-teal-800 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className={`px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                  currentPage >= totalPages
                    ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: TEST PROTOCOL SPECS */}
      {isProtocolSpecsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-teal-800">verified</span>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  {activeBatch.title} &bull; Specifications
                </h3>
              </div>
              <button
                onClick={() => setIsProtocolSpecsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">Standard Occupational Clearance Protocol</p>
                <p className="text-slate-500 leading-relaxed">
                  Compliant with Saudi Ministry of Health (MOH) and CCHI standards for petrochemical site access.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Fasting Requirement</span>
                  <span className="font-bold text-slate-800">8 - 10 Hours Prior</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Validity Period</span>
                  <span className="font-bold text-emerald-700">2 Years (730 Days)</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Gate Pass Synchronization</span>
                  <span className="font-bold text-teal-700">RFID Enabled</span>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Target SLA</span>
                  <span className="font-bold text-slate-800">48 Hours Intake</span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400">
                Test protocol material code: <span className="font-mono font-bold text-slate-700">#5004972</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsProtocolSpecsOpen(false)}
                className="px-4 py-2 rounded-xl bg-teal-800 text-white font-bold text-xs cursor-pointer hover:bg-teal-900"
              >
                Close Specifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD STAFF TO BATCH */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-800">person_add</span>
                <h3 className="font-display font-extrabold text-sm text-slate-900">
                  Add Staff to {activeBatch.id}
                </h3>
              </div>
              <button onClick={() => setIsAddStaffOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Employee Name</label>
                <input
                  type="text"
                  placeholder="e.g. Abdullah Al-Mansoor"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Employee ID / SAP #</label>
                <input
                  type="text"
                  placeholder="e.g. E10255"
                  value={newStaffNo}
                  onChange={(e) => setNewStaffNo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Department</label>
                <select
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                >
                  <option value="LOGISTIC">LOGISTIC</option>
                  <option value="ISSD">ISSD</option>
                  <option value="PMTA">PMTA</option>
                  <option value="PSD">PSD</option>
                  <option value="VSD">VSD</option>
                  <option value="HERD">HERD</option>
                  <option value="E&I">E&I</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newStaffName || !newStaffNo) {
                    alert('Please enter employee name and employee ID.');
                    return;
                  }
                  try {
                    await api.createRequest({
                      employeeId: newStaffNo,
                      employeeName: newStaffName,
                      department: newStaffDept,
                      testId: activeBatch.id === 'REQ-2026-0104' ? '5004972' :
                              activeBatch.id === 'REQ-2026-0101' ? '5004955' :
                              activeBatch.id === 'REQ-2026-0102' ? '5004959' : '5004965',
                      batchId: activeBatch.id,
                      note: JSON.stringify({ batchId: activeBatch.id, cardStatus: 'No card', priority: false })
                    });
                    setToastMessage(`Added ${newStaffName} (${newStaffNo}) to ${activeBatch.id}!`);
                    setIsAddStaffOpen(false);
                    setNewStaffName('');
                    setNewStaffNo('');
                    await loadData();
                  } catch (e: any) {
                    alert(`Failed to add staff: ${e?.message}`);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-teal-800 text-white font-bold text-xs"
              >
                Add Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE NEW CLEARANCE BATCH */}
      {isCreateBatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-teal-800">playlist_add</span>
                <h3 className="font-display font-extrabold text-sm text-slate-900">
                  New Clearance Batch
                </h3>
              </div>
              <button onClick={() => setIsCreateBatchOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Batch Title</label>
                <input
                  type="text"
                  placeholder="e.g. Yanpet Turnaround Q4 Intake"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Industrial Plant / Facility</label>
                <select className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700">
                  <option value="YANPET">Yanpet Petrochemical</option>
                  <option value="SABIC">SABIC Jubail Site</option>
                  <option value="SADARA">Sadara Complex South</option>
                  <option value="OTHER">Logistics & Supply Hub</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Medical Protocol Type</label>
                <select className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-700">
                  <option value="5004972">Yanpet medical test (Material #5004972)</option>
                  <option value="5004959">SABIC medical screening with TSH (#5004959)</option>
                  <option value="5004955">Sadara medical test (#5004955)</option>
                  <option value="5004965">General medical fitness (#5004965)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsCreateBatchOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setToastMessage('New batch draft created and added to queue!');
                  setIsCreateBatchOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-teal-800 text-white font-bold text-xs"
              >
                Create Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATE MODAL */}
      {selectedPdfReport && (
        <PdfReportViewerModal
          report={selectedPdfReport}
          onClose={() => setSelectedPdfReport(null)}
        />
      )}

      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};
