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
  daysToExpiry?: number | null;
  expiresAt?: string | null;
  status: string; // 'WAITING' | 'SUBMITTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
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

interface SparklineProps {
  color: string;
  gradientId: string;
  linePath: string;
  areaPath: string;
  endX: number;
  endY: number;
}

const Sparkline: React.FC<SparklineProps> = ({
  color,
  gradientId,
  linePath,
  areaPath,
  endX,
  endY,
}) => (
  <div className="w-20 sm:w-24 h-8 shrink-0">
    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 36" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={endX} cy={endY} r="2.5" fill={color} />
      <circle cx={endX} cy={endY} r="5" fill={color} fillOpacity="0.25" className="animate-pulse" />
    </svg>
  </div>
);

export const RequestsQueueView: React.FC<RequestsQueueViewProps> = ({ userRole = 'HR' }) => {
  // Navigation & Filter State
  const [selectedPlant, setSelectedPlant] = useState<'ALL' | 'YANPET' | 'SABIC' | 'SADARA'>('ALL');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('REQ-2026-0104');
  const [batchSearch, setBatchSearch] = useState<string>('');

  // Table Filter & Sorting State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED' | 'EXPIRING' | 'WAITING' | 'SUBMITTED' | 'CANCELLED'>('ALL');
  const [clinicFilter, setClinicFilter] = useState<string>('ALL');
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  type SortField = 'UNASSIGNED_FIRST' | 'EXPIRING_FIRST' | 'CLINIC' | 'DEPARTMENT' | 'EMP_NO' | 'NAME';
  const [sortField, setSortField] = useState<SortField>('UNASSIGNED_FIRST');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // New batch input state
  const [newBatchTitle, setNewBatchTitle] = useState('Yanpet Turnaround Q4 Intake');
  const [newBatchPlant, setNewBatchPlant] = useState<'YANPET' | 'SABIC' | 'SADARA' | 'OTHER'>('YANPET');
  const [newBatchTestId, setNewBatchTestId] = useState('5004972');
  const [newBatchEmpNo, setNewBatchEmpNo] = useState('11000018');
  const [newBatchEmpName, setNewBatchEmpName] = useState('Lead Turnaround Technician');

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
      if (meta?.slotRequestId && !knownIds.has(meta.slotRequestId)) {
        bId = meta.slotRequestId;
      } else if (meta?.batchId && !knownIds.has(meta.batchId)) {
        bId = meta.batchId;
      } else if (r.id.startsWith('SR-')) {
        const parts = r.id.split('-');
        const autoId = parts.slice(0, 2).join('-');
        if (!knownIds.has(autoId)) bId = autoId;
      } else if (r.id.startsWith('BULK-')) {
        const parts = r.id.split('-');
        const autoId = parts.slice(0, 3).join('-');
        if (!knownIds.has(autoId)) bId = autoId;
      }
      if (bId && !knownIds.has(bId)) {
        knownIds.add(bId);
        const isSlotBatch = bId.startsWith('SR-') || Boolean(meta?.slotRequestId);
        const plantStr = meta?.plant || r.department || (isSlotBatch ? 'Sadara Complex (Jubail)' : 'ECC Main Facility');
        let plantCategory: 'YANPET' | 'SABIC' | 'SADARA' | 'OTHER' = 'OTHER';
        if (/yanpet/i.test(plantStr)) plantCategory = 'YANPET';
        else if (/sabic/i.test(plantStr)) plantCategory = 'SABIC';
        else if (/sadara/i.test(plantStr)) plantCategory = 'SADARA';

        dynamicConfigs.push({
          id: bId,
          title: meta?.slotTitle || meta?.batchName || (isSlotBatch ? `Pre-Booked Slot Batch ${bId}` : `Bulk Batch ${bId}`),
          plant: plantStr,
          plantCategory,
          requestedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          protocolType: meta?.slotTitle || (meta?.fileName ? `Upload: ${meta.fileName}` : (isSlotBatch ? (r.test?.name || 'Pre-Booked Quota Clearance') : 'Bulk Roster Intake')),
          subStatus: isSlotBatch ? 'Pre-Booked Quota' : 'Batch Intake',
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
        const expiresAtDate = r.report?.expiresAt ? new Date(r.report.expiresAt) : null;
        const daysToExpiry = expiresAtDate ? Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
        const isExpiring = Boolean(meta.priority || (daysToExpiry !== null && daysToExpiry <= 60));
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
            ? `Expiring ≤60d${expiresAtDate ? ` • ${expiresAtDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`
            : (r.vendor ? r.vendor.name : (r.vendorId ? 'Assigned' : 'No card')),
          priority: Boolean(isExpiring),
          daysToExpiry,
          expiresAt: r.report?.expiresAt || null,
          status: r.status || 'WAITING',
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
      const assignedCount = employees.filter(e => Boolean(e.assignedClinicId || e.assignedClinicCode)).length;
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
      let meta: any = {};
      if (r.note) {
        try {
          meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note;
        } catch (_) {}
      }
      const emp = r.employee || {};
      const expiresAtDate = r.report?.expiresAt ? new Date(r.report.expiresAt) : null;
      const daysToExpiry = expiresAtDate ? Math.ceil((expiresAtDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const isExpiring = Boolean(meta.priority || (daysToExpiry !== null && daysToExpiry <= 60));
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
          ? `Expiring ≤60d${expiresAtDate ? ` • ${expiresAtDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`
          : (r.vendor ? r.vendor.name : (r.vendorId ? 'Assigned' : 'No card')),
        priority: Boolean(isExpiring),
        daysToExpiry,
        expiresAt: r.report?.expiresAt || null,
        status: r.status || 'WAITING',
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
    let list = singleRequests;
    if (singleSearch.trim()) {
      const q = singleSearch.toLowerCase().trim();
      list = singleRequests.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.empNo.toLowerCase().includes(q) ||
        (s.iqamaId && s.iqamaId.includes(q)) ||
        s.dept.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aAssigned = Boolean(a.assignedClinicId || a.assignedClinicCode);
      const bAssigned = Boolean(b.assignedClinicId || b.assignedClinicCode);
      if (!aAssigned && bAssigned) return -1;
      if (aAssigned && !bAssigned) return 1;

      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;

      return (a.empNo || '').localeCompare(b.empNo || '');
    });
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
      setAssignCount(activeBatch.unassignedCount ?? 0);
      setCurrentPage(1);
    }
  }, [activeBatch.id]);

  // Filter counts for active batch
  const filterCounts = useMemo(() => {
    const employees = activeBatch?.employees || [];
    const total = employees.length;
    const unassigned = employees.filter(e => !e.assignedClinicId && !e.assignedClinicCode && e.status !== 'CANCELLED').length;
    const assigned = employees.filter(e => Boolean(e.assignedClinicId || e.assignedClinicCode) && e.status !== 'CANCELLED').length;
    const waiting = employees.filter(e => e.status === 'WAITING').length;
    const submitted = employees.filter(e => e.status === 'SUBMITTED').length;
    const cancelled = employees.filter(e => e.status === 'CANCELLED').length;
    const expiring = employees.filter(e =>
      Boolean(
        e.priority ||
        (typeof e.daysToExpiry === 'number' && e.daysToExpiry <= 60) ||
        (e.cardStatus && /expir/i.test(e.cardStatus))
      ) && e.status !== 'CANCELLED'
    ).length;

    const clinicCounts: Record<string, number> = {};
    clinicList.forEach(c => {
      clinicCounts[c.id] = employees.filter(e =>
        e.status !== 'CANCELLED' && (
          e.assignedClinicId === c.id ||
          e.assignedClinicCode === c.code ||
          (e.assignedClinicName && e.assignedClinicName.toLowerCase().includes(c.name.toLowerCase()))
        )
      ).length;
    });

    return {
      total,
      unassigned,
      assigned,
      waiting,
      submitted,
      cancelled,
      expiring,
      clinicCounts
    };
  }, [activeBatch?.employees, clinicList]);

  // Filter Reset Handler
  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setClinicFilter('ALL');
    setEmployeeSearch('');
    setSortField('UNASSIGNED_FIRST');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  // Sort Toggle Handler
  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Filtered, Sorted and Paginated Employees for Active Batch
  const processedEmployees = useMemo(() => {
    let list = [...(activeBatch?.employees || [])];

    // 1. Filter by Assignment & Request Status
    if (statusFilter === 'UNASSIGNED') {
      list = list.filter(e => !e.assignedClinicId && !e.assignedClinicCode && e.status !== 'CANCELLED');
    } else if (statusFilter === 'ASSIGNED') {
      list = list.filter(e => Boolean(e.assignedClinicId || e.assignedClinicCode) && e.status !== 'CANCELLED');
    } else if (statusFilter === 'WAITING') {
      list = list.filter(e => e.status === 'WAITING');
    } else if (statusFilter === 'SUBMITTED') {
      list = list.filter(e => e.status === 'SUBMITTED');
    } else if (statusFilter === 'CANCELLED') {
      list = list.filter(e => e.status === 'CANCELLED');
    } else if (statusFilter === 'EXPIRING') {
      list = list.filter(e =>
        Boolean(
          e.priority ||
          (typeof e.daysToExpiry === 'number' && e.daysToExpiry <= 60) ||
          (e.cardStatus && /expir/i.test(e.cardStatus))
        ) && e.status !== 'CANCELLED'
      );
    }

    // 2. Filter by Clinic
    if (clinicFilter !== 'ALL') {
      if (clinicFilter === 'UNASSIGNED') {
        list = list.filter(e => !e.assignedClinicId && !e.assignedClinicCode);
      } else {
        list = list.filter(e =>
          e.assignedClinicId === clinicFilter ||
          e.assignedClinicCode === clinicFilter ||
          (e.assignedClinicName && e.assignedClinicName.toLowerCase().includes(clinicFilter.toLowerCase()))
        );
      }
    }

    // 3. Search Filter
    if (employeeSearch.trim()) {
      const q = employeeSearch.toLowerCase().trim();
      list = list.filter(e =>
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.empNo && e.empNo.toLowerCase().includes(q)) ||
        (e.iqamaId && e.iqamaId.includes(q)) ||
        (e.dept && e.dept.toLowerCase().includes(q)) ||
        (e.assignedClinicName && e.assignedClinicName.toLowerCase().includes(q)) ||
        (e.assignedClinicCode && e.assignedClinicCode.toLowerCase().includes(q)) ||
        (e.cardStatus && e.cardStatus.toLowerCase().includes(q)) ||
        (e.status && e.status.toLowerCase().includes(q))
      );
    }

    // 4. Sorting
    list.sort((a, b) => {
      let comp = 0;

      if (sortField === 'CLINIC') {
        const aClinic = a.assignedClinicName || a.assignedClinicCode || (a.assignedClinicId ? 'Assigned' : 'ZZZ_Unassigned');
        const bClinic = b.assignedClinicName || b.assignedClinicCode || (b.assignedClinicId ? 'Assigned' : 'ZZZ_Unassigned');
        comp = aClinic.localeCompare(bClinic);
        if (comp === 0) {
          comp = (a.empNo || '').localeCompare(b.empNo || '');
        }
      } else if (sortField === 'DEPARTMENT') {
        comp = (a.dept || '').localeCompare(b.dept || '');
        if (comp === 0) {
          const aAssigned = Boolean(a.assignedClinicId || a.assignedClinicCode);
          const bAssigned = Boolean(b.assignedClinicId || b.assignedClinicCode);
          if (!aAssigned && bAssigned) return -1;
          if (aAssigned && !bAssigned) return 1;
          comp = (a.empNo || '').localeCompare(b.empNo || '');
        }
      } else if (sortField === 'EMP_NO') {
        comp = (a.empNo || '').localeCompare(b.empNo || '');
      } else if (sortField === 'NAME') {
        comp = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'EXPIRING_FIRST') {
        const aExp = Boolean(
          a.priority ||
          (typeof a.daysToExpiry === 'number' && a.daysToExpiry <= 60) ||
          (a.cardStatus && /expir/i.test(a.cardStatus))
        );
        const bExp = Boolean(
          b.priority ||
          (typeof b.daysToExpiry === 'number' && b.daysToExpiry <= 60) ||
          (b.cardStatus && /expir/i.test(b.cardStatus))
        );
        if (aExp && !bExp) comp = -1;
        else if (!aExp && bExp) comp = 1;
        else if (aExp && bExp) {
          const aDays = typeof a.daysToExpiry === 'number' ? a.daysToExpiry : 9999;
          const bDays = typeof b.daysToExpiry === 'number' ? b.daysToExpiry : 9999;
          comp = aDays - bDays;
        }
        if (comp === 0) {
          const aAssigned = Boolean(a.assignedClinicId || a.assignedClinicCode);
          const bAssigned = Boolean(b.assignedClinicId || b.assignedClinicCode);
          if (!aAssigned && bAssigned) return -1;
          if (aAssigned && !bAssigned) return 1;
          comp = (a.empNo || '').localeCompare(b.empNo || '');
        }
      } else {
        // UNASSIGNED_FIRST (Default & recommended view)
        const aAssigned = Boolean(a.assignedClinicId || a.assignedClinicCode);
        const bAssigned = Boolean(b.assignedClinicId || b.assignedClinicCode);
        if (!aAssigned && bAssigned) return -1;
        if (aAssigned && !bAssigned) return 1;

        const aExpiring = Boolean(
          a.priority ||
          (typeof a.daysToExpiry === 'number' && a.daysToExpiry <= 60) ||
          (a.cardStatus && /expir/i.test(a.cardStatus))
        );
        const bExpiring = Boolean(
          b.priority ||
          (typeof b.daysToExpiry === 'number' && b.daysToExpiry <= 60) ||
          (b.cardStatus && /expir/i.test(b.cardStatus))
        );
        if (aExpiring && !bExpiring) return -1;
        if (!aExpiring && bExpiring) return 1;

        if (aExpiring && bExpiring) {
          const aDays = typeof a.daysToExpiry === 'number' ? a.daysToExpiry : 9999;
          const bDays = typeof b.daysToExpiry === 'number' ? b.daysToExpiry : 9999;
          if (aDays !== bDays) {
            return aDays - bDays;
          }
        }

        comp = (a.empNo || '').localeCompare(b.empNo || '');
      }

      return sortOrder === 'desc' ? -comp : comp;
    });

    return list;
  }, [activeBatch?.employees, statusFilter, clinicFilter, employeeSearch, sortField, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(processedEmployees.length / pageSize));
  const displayedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedEmployees.slice(start, start + pageSize);
  }, [processedEmployees, currentPage, pageSize]);

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
    let updated: string[];
    if (selectedEmployeeIds.includes(id)) {
      updated = selectedEmployeeIds.filter(i => i !== id);
    } else {
      updated = [...selectedEmployeeIds, id];
    }
    setSelectedEmployeeIds(updated);
    setAssignCount(updated.length);
  };

  // Toggle select all on current page
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = displayedEmployees.map(e => e.id);
      setSelectedEmployeeIds(allIds);
      setAssignCount(allIds.length);
    } else {
      setSelectedEmployeeIds([]);
      setAssignCount(0);
    }
  };

  // Dedicated Deselect All
  const handleDeselectAll = () => {
    setSelectedEmployeeIds([]);
    setAssignCount(0);
  };

  // Dedicated Select All
  const handleSelectAll = () => {
    const allIds = displayedEmployees.map(e => e.id);
    setSelectedEmployeeIds(allIds);
    setAssignCount(allIds.length);
  };

  // Handle manual input of assign count
  const handleAssignCountChange = (val: number) => {
    const count = Math.max(0, Math.min(val, activeBatch.totalEmployees));
    setAssignCount(count);
    if (count === 0) {
      setSelectedEmployeeIds([]);
    } else {
      setSelectedEmployeeIds(displayedEmployees.slice(0, count).map(e => e.id));
    }
  };

  // Primary Batch Assign to Selected Medical Center
  const handleAssignToCenter = async () => {
    let toAssign = [...selectedEmployeeIds];
    if (toAssign.length === 0) {
      const unassigned = processedEmployees.filter(e => !e.assignedClinicId && !e.assignedClinicCode);
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
      setAssignCount(0);
      await loadData();
    } catch (e: any) {
      alert(`Assignment failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Auto-Split Batch Across All 5 Accredited Clinics
  const handleAutoSplit = async () => {
    const unassigned = processedEmployees.filter(e => !e.assignedClinicId && !e.assignedClinicCode);
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
      setSelectedEmployeeIds([]);
      setAssignCount(0);
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

  // Cancel Request (HR / Requester)
  const handleCancelRequest = async (emp: BatchEmployee) => {
    if (!window.confirm(`Are you sure you want to cancel medical clearance request for ${emp.name} (${emp.empNo})?`)) {
      return;
    }
    try {
      await api.cancelRequest(emp.id);
      setToastMessage(`Request for ${emp.name} was successfully cancelled.`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadData();
    } catch (e: any) {
      alert(`Cancel failed: ${e.response?.data?.error || e.message}`);
    }
  };

  // Reject Request (Central Team)
  const handleRejectRequest = async (emp: BatchEmployee) => {
    const reason = window.prompt(`Enter rejection reason for candidate ${emp.name} (${emp.empNo}):`, 'Incomplete documentation');
    if (reason === null) return;
    try {
      await api.rejectRequest(emp.id, reason);
      setToastMessage(`Request for ${emp.name} has been rejected with reason: "${reason}".`);
      setTimeout(() => setToastMessage(''), 5000);
      await loadData();
    } catch (e: any) {
      alert(`Reject failed: ${e.response?.data?.error || e.message}`);
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
    <div className="p-3 sm:p-4 lg:p-5 max-w-[1780px] mx-auto space-y-5">
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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Brand Identity + Subtitle */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">medical_services</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-base lg:text-lg text-slate-900 leading-tight">
              Occupational Health & Medical Clearance
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enterprise Employee Screening & Clinic Dispatch Console
            </p>
          </div>
        </div>

        {/* Industrial Plant Segmented Tabs */}
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
      </div>

      {/* 2. TELEMETRY / KPI ROW (5 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: ACTIVE BATCHES */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Batches
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 my-1.5">
            <div>
              <span className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                {telemetry.activeBatches}
              </span>
              <span className="text-xs text-slate-500 font-bold ml-1.5">Batches</span>
            </div>
            <Sparkline
              color="#0f766e"
              gradientId="grad-active-batches"
              linePath="M 0 26 C 15 26, 25 21, 40 21 C 55 21, 65 24, 75 16 C 85 9, 93 7, 100 7"
              areaPath="M 0 26 C 15 26, 25 21, 40 21 C 55 21, 65 24, 75 16 C 85 9, 93 7, 100 7 L 100 36 L 0 36 Z"
              endX={100}
              endY={7}
            />
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
          </div>
          <div className="flex items-end justify-between gap-2 my-1.5">
            <div>
              <span className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                {telemetry.totalEmployees}
              </span>
            </div>
            <Sparkline
              color="#0284c7"
              gradientId="grad-emp-req"
              linePath="M 0 28 C 15 28, 25 24, 40 20 C 55 16, 65 18, 75 13 C 85 8, 92 6, 100 6"
              areaPath="M 0 28 C 15 28, 25 24, 40 20 C 55 16, 65 18, 75 13 C 85 8, 92 6, 100 6 L 100 36 L 0 36 Z"
              endX={100}
              endY={6}
            />
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
          </div>
          <div className="flex items-end justify-between gap-2 my-1.5">
            <div>
              <span className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                {telemetry.assignedTotal}
              </span>
              <span className="text-xs text-slate-500 font-semibold ml-1.5">({telemetry.assignedPercent}%)</span>
            </div>
            <Sparkline
              color="#16a34a"
              gradientId="grad-assigned-prog"
              linePath="M 0 30 C 15 30, 25 25, 40 22 C 55 19, 68 12, 80 9 C 90 6, 95 5, 100 5"
              areaPath="M 0 30 C 15 30, 25 25, 40 22 C 55 19, 68 12, 80 9 C 90 6, 95 5, 100 5 L 100 36 L 0 36 Z"
              endX={100}
              endY={5}
            />
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
          </div>
          <div className="flex items-end justify-between gap-2 my-1.5">
            <div>
              <span className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                {telemetry.pendingTotal}
              </span>
              <span className="text-xs text-slate-500 font-bold ml-1.5">Left</span>
            </div>
            <Sparkline
              color="#f59e0b"
              gradientId="grad-pending-assign"
              linePath="M 0 7 C 15 7, 25 11, 40 14 C 55 17, 65 19, 75 24 C 85 29, 93 29, 100 29"
              areaPath="M 0 7 C 15 7, 25 11, 40 14 C 55 17, 65 19, 75 24 C 85 29, 93 29, 100 29 L 100 36 L 0 36 Z"
              endX={100}
              endY={29}
            />
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
      <div className="flex flex-col lg:flex-row gap-4 items-start w-full">
        {/* LEFT COLUMN: CLEARANCE BATCHES LIST - Compact width so table workspace gets maximum space */}
        <div className="w-full lg:w-[275px] xl:w-[290px] shrink-0 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col h-[780px]">
          {/* Header */}
          <div className="flex items-center justify-between shrink-0 mb-3">
            <div className="flex items-center gap-1.5">
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
          <div className="relative shrink-0 mb-3">
            <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[15px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search batches..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
              className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary"
            />
          </div>

          {/* Batch Cards List - Scrollable Container */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
            {filteredBatches.map((batch) => {
              const isSelected = batch.id === activeBatch.id;
              const percent = batch.totalEmployees > 0 ? Math.round((batch.assignedCount / batch.totalEmployees) * 100) : 0;

              return (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-orange-50/20 border-secondary ring-2 ring-secondary/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="font-mono text-[11px] font-extrabold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {batch.id}
                    </span>
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                      batch.assignedCount === batch.totalEmployees
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : batch.assignedCount > 0
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {batch.assignedCount === batch.totalEmployees
                        ? 'Assigned'
                        : batch.assignedCount > 0
                        ? `Assigned (${batch.assignedCount}/${batch.totalEmployees})`
                        : 'Not assigned'}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-xs text-slate-900 mt-1.5 truncate" title={batch.title}>
                    {batch.title}
                  </h3>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 truncate" title={`${batch.requestedDate} • ${batch.plant}`}>
                    Requested {batch.requestedDate} &bull; {batch.plant}
                  </p>

                  {/* Progress Metric & Bar */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-slate-500">Pending / Total</span>
                      <span className="font-mono font-bold text-slate-800">
                        {batch.unassignedCount} / {batch.totalEmployees}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10.5px] text-slate-500 font-medium">
                    <span className="truncate max-w-[110px]" title={batch.protocolType}>{batch.protocolType}</span>
                    <span
                      className={`font-bold whitespace-nowrap ${
                        batch.isOverdue
                          ? 'text-rose-600'
                          : isSelected
                          ? 'text-secondary'
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

        {/* RIGHT COLUMN: SELECTED BATCH DISPATCH WORKSPACE - Expanded to fit table without horizontal scroll */}
        <div className="flex-1 min-w-0 w-full bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4">
          {/* 1. Selected Batch Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
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
                  min={0}
                  max={activeBatch.totalEmployees}
                  value={assignCount}
                  onChange={(e) => handleAssignCountChange(Number(e.target.value))}
                  className="w-16 px-2.5 py-1 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-center focus:outline-none focus:border-secondary"
                />
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors"
                >
                  All {activeBatch.totalEmployees}
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] cursor-pointer transition-colors flex items-center gap-1"
                  title="Deselect all employees"
                >
                  <span className="material-symbols-outlined text-[13px]">check_box_outline_blank</span>
                  <span>Deselect All</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-600">Medical center:</span>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="px-3 py-1 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:outline-none focus:border-secondary cursor-pointer"
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
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
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

          {/* 3. Table Toolbar (Filters, Search & Sorting Controls) */}
          <div className="space-y-2.5 pt-1">
            {/* Row 1: Status Filters Pills & Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'ALL' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {filterCounts.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter('WAITING'); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'WAITING'
                      ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs'
                      : 'text-slate-600 hover:text-amber-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Waiting Central</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'WAITING' ? 'bg-amber-200 text-amber-900' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {filterCounts.waiting}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter('SUBMITTED'); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'SUBMITTED'
                      ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs'
                      : 'text-slate-600 hover:text-blue-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Submitted</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'SUBMITTED' ? 'bg-blue-200 text-blue-900' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {filterCounts.submitted}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter('UNASSIGNED'); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'UNASSIGNED'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Unassigned</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'UNASSIGNED' ? 'bg-slate-200 text-slate-900' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {filterCounts.unassigned}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter('ASSIGNED'); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'ASSIGNED'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Assigned</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'ASSIGNED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {filterCounts.assigned}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStatusFilter('EXPIRING'); setCurrentPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'EXPIRING'
                      ? 'bg-rose-50 text-rose-900 border border-rose-300 shadow-2xs'
                      : 'text-slate-600 hover:text-rose-900'
                  }`}
                >
                  <span>Expiring ≤60d</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    statusFilter === 'EXPIRING' ? 'bg-rose-200 text-rose-900' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {filterCounts.expiring}
                  </span>
                </button>

                {filterCounts.cancelled > 0 && (
                  <button
                    type="button"
                    onClick={() => { setStatusFilter('CANCELLED'); setCurrentPage(1); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      statusFilter === 'CANCELLED'
                        ? 'bg-slate-200 text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>Cancelled</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-300 text-slate-700">
                      {filterCounts.cancelled}
                    </span>
                  </button>
                )}
              </div>

              {/* Counts & Selection Bar */}
              <div className="flex items-center gap-2 text-slate-500 flex-wrap">
                <span className="text-[11px]">
                  Showing <strong className="text-slate-800">{processedEmployees.length}</strong> of{' '}
                  <strong className="text-slate-800">{activeBatch.totalEmployees}</strong>
                </span>

                {selectedEmployeeIds.length > 0 && (
                  <>
                    <span className="text-slate-300">|</span>
                    <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-950 font-bold text-[11px]">
                      {selectedEmployeeIds.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-secondary hover:text-orange-700 text-[11px] font-bold cursor-pointer transition-colors hover:underline"
                    >
                      Deselect All
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Clinic Filter, Instant Search & Sort Options */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[300px]">
                {/* Medical Center / Clinic Filter Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">local_hospital</span>
                  <select
                    value={clinicFilter}
                    onChange={(e) => { setClinicFilter(e.target.value); setCurrentPage(1); }}
                    className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="ALL">All Medical Centers ({filterCounts.total})</option>
                    <option value="UNASSIGNED">Unassigned Only ({filterCounts.unassigned})</option>
                    <optgroup label="Assigned Clinics">
                      {clinicList.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code}) — {filterCounts.clinicCounts[c.id] || 0}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Instant Candidate Search */}
                <div className="relative flex-1 min-w-[170px] max-w-xs">
                  <span className="material-symbols-outlined text-[15px] text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => { setEmployeeSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Filter ID, name, dept..."
                    className="w-full pl-8 pr-7 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-secondary placeholder:text-slate-400"
                  />
                  {employeeSearch && (
                    <button
                      type="button"
                      onClick={() => { setEmployeeSearch(''); setCurrentPage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[12px] font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Clear / Reset Filters Button */}
                {(statusFilter !== 'ALL' || clinicFilter !== 'ALL' || employeeSearch.trim() !== '' || sortField !== 'UNASSIGNED_FIRST' || sortOrder !== 'asc') && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 transition-colors cursor-pointer"
                    title="Reset all filters and sort order"
                  >
                    <span className="material-symbols-outlined text-[13px]">restart_alt</span>
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Sort By Dropdown & Direction Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-slate-500">Sort by:</span>
                <select
                  value={sortField}
                  onChange={(e) => { setSortField(e.target.value as any); setCurrentPage(1); }}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary cursor-pointer"
                >
                  <option value="UNASSIGNED_FIRST">Unassigned First (Recommended)</option>
                  <option value="EXPIRING_FIRST">Expiring Cards First</option>
                  <option value="CLINIC">Assigned Medical Center</option>
                  <option value="DEPARTMENT">Department</option>
                  <option value="EMP_NO">Employee ID</option>
                  <option value="NAME">Employee Name</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center w-7 h-7"
                  title={`Toggle sort direction (current: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'})`}
                >
                  {sortOrder === 'asc' ? '▲' : '▼'}
                </button>
              </div>
            </div>
          </div>

          {/* 4. High-Density Employee Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-2 px-2 w-7">
                    <input
                      type="checkbox"
                      checked={
                        displayedEmployees.length > 0 &&
                        displayedEmployees.every((e) => selectedEmployeeIds.includes(e.id))
                      }
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded text-secondary focus:ring-secondary cursor-pointer"
                    />
                  </th>
                  <th className="py-2 px-1.5 w-7 text-center">#</th>
                  <th
                    onClick={() => handleSortChange('EMP_NO')}
                    className="py-2 px-2 cursor-pointer hover:text-slate-800 transition-colors select-none whitespace-nowrap"
                    title="Click to sort by Employee ID"
                  >
                    <div className="flex items-center gap-1">
                      <span>Employee ID</span>
                      {sortField === 'EMP_NO' && (
                        <span className="text-[11px] text-secondary font-bold">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('NAME')}
                    className="py-2 px-2 cursor-pointer hover:text-slate-800 transition-colors select-none whitespace-nowrap"
                    title="Click to sort by Employee Name"
                  >
                    <div className="flex items-center gap-1">
                      <span>Employee Name</span>
                      {sortField === 'NAME' && (
                        <span className="text-[11px] text-secondary font-bold">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('DEPARTMENT')}
                    className="py-2 px-2 cursor-pointer hover:text-slate-800 transition-colors select-none whitespace-nowrap"
                    title="Click to sort by Department"
                  >
                    <div className="flex items-center gap-1">
                      <span>Department</span>
                      {sortField === 'DEPARTMENT' && (
                        <span className="text-[11px] text-secondary font-bold">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortChange('EXPIRING_FIRST')}
                    className="py-2 px-2 cursor-pointer hover:text-slate-800 transition-colors select-none whitespace-nowrap"
                    title="Click to sort by Medical Card Status / Expiry"
                  >
                    <div className="flex items-center gap-1">
                      <span>Card Status</span>
                      {sortField === 'EXPIRING_FIRST' && (
                        <span className="text-[11px] text-secondary font-bold">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-2 px-2 whitespace-nowrap">Workflow Status</th>
                  <th
                    onClick={() => handleSortChange('CLINIC')}
                    className="py-2 px-2 cursor-pointer hover:text-slate-800 transition-colors select-none whitespace-nowrap"
                    title="Click to sort by Medical Center / Clinic"
                  >
                    <div className="flex items-center gap-1">
                      <span>Assigned Clinic</span>
                      {sortField === 'CLINIC' && (
                        <span className="text-[11px] text-secondary font-bold">
                          {sortOrder === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="py-2 px-2 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {displayedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-4xl text-slate-300">filter_alt_off</span>
                        <p className="font-semibold text-slate-700 text-sm">No employees match the current filters</p>
                        <p className="text-xs text-slate-400">Try changing your medical center or status filter</p>
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedEmployees.map((emp, idx) => {
                  const isChecked = selectedEmployeeIds.includes(emp.id);
                  const rowNumber = (currentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        emp.priority ? 'bg-amber-50/40' : isChecked ? 'bg-orange-50/20' : ''
                      }`}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(emp.id)}
                          className="rounded text-secondary focus:ring-secondary cursor-pointer"
                        />
                      </td>

                      <td className="py-2 px-1.5 text-slate-400 font-mono text-[11px] text-center">
                        {rowNumber}
                      </td>

                      <td className="py-2 px-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {emp.empNo}
                      </td>

                      <td className="py-2 px-2">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{emp.name}</span>
                          {emp.priority && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 border border-amber-300">
                              Priority
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {emp.dept}
                        </span>
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        {emp.priority ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            <span>&Delta;</span>
                            <span>{emp.cardStatus}</span>
                          </span>
                        ) : (!emp.assignedClinicId && !emp.assignedClinicCode) ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded bg-amber-50/70 text-amber-800 border border-amber-200">
                            <span>{emp.cardStatus && emp.cardStatus !== 'No card' ? emp.cardStatus : 'Unassigned'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {emp.cardStatus}
                          </span>
                        )}
                      </td>

                      {/* Workflow & Report Status */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-nowrap">
                          {/* Workflow Request Status Badge */}
                          {emp.status === 'CANCELLED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-300">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">cancel</span>
                              <span>CANCELLED</span>
                            </span>
                          ) : emp.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="material-symbols-outlined text-[12px] text-rose-500">block</span>
                              <span>REJECTED</span>
                            </span>
                          ) : emp.status === 'SUBMITTED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span>SUBMITTED</span>
                            </span>
                          ) : emp.status === 'WAITING' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="WAITING_CENTRAL">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              <span>WAITING CENTRAL</span>
                            </span>
                          ) : emp.status === 'SCHEDULED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                              <span>SCHEDULED</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{emp.status || 'COMPLETED'}</span>
                            </span>
                          )}

                          {/* Medical Result Badge */}
                          {emp.isCertified ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="material-symbols-outlined text-[12px] text-emerald-600">verified</span>
                                <span>Fit</span>
                              </span>
                              {emp.pdfFileUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedPdfReport({
                                      id: emp.reportId || emp.id,
                                      employeeName: emp.name,
                                      reportName: emp.testName || 'Medical Clearance Report',
                                      iqamaId: emp.iqamaId || emp.empNo,
                                      clinicName: emp.assignedClinicName || 'Accredited Medical Center',
                                      fileUrl: emp.pdfFileUrl
                                    });
                                  }}
                                  className="p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                  title="View PDF Report"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-red-500">picture_as_pdf</span>
                                </button>
                              )}
                            </div>
                          ) : emp.hasPdf ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                <span className="material-symbols-outlined text-[12px] text-sky-600">pending_actions</span>
                                <span>PDF Ready</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPdfReport({
                                    id: emp.reportId || emp.id,
                                    employeeName: emp.name,
                                    reportName: emp.testName || 'Medical Clearance Report',
                                    iqamaId: emp.iqamaId || emp.empNo,
                                    clinicName: emp.assignedClinicName || 'Accredited Medical Center',
                                    fileUrl: emp.pdfFileUrl
                                  });
                                }}
                                className="p-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                                title="View PDF Report"
                              >
                                <span className="material-symbols-outlined text-[13px] text-red-500">picture_as_pdf</span>
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* 8. Assigned Clinic */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        {(emp.assignedClinicId || emp.assignedClinicCode) ? (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100/90 border border-slate-200 text-xs font-semibold text-slate-800">
                            <span className="font-mono font-bold text-[10.5px] bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-900 shadow-2xs">
                              {emp.assignedClinicCode || 'ARZ'}
                            </span>
                            <span className="text-slate-700 truncate max-w-[100px]" title={emp.assignedClinicName || undefined}>
                              {emp.assignedClinicName?.replace(/ (Polyclinic|Medical Center|Medical Centre|Co\.).*/i, '') || 'Assigned'}
                            </span>
                            {emp.status !== 'CANCELLED' && emp.status !== 'REJECTED' && (
                              <button
                                type="button"
                                onClick={() => handleUnassign(emp)}
                                title="Unassign clinic"
                                className="text-slate-400 hover:text-rose-600 transition-colors ml-0.5 cursor-pointer text-xs p-0.5"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ) : emp.status !== 'CANCELLED' && emp.status !== 'REJECTED' ? (
                          emp.priority ? (
                            <button
                              type="button"
                              onClick={() => handleSingleAssign(emp)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[13px]">bolt</span>
                              <span>Expedite</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSingleAssign(emp)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white hover:bg-orange-50 text-secondary hover:text-orange-700 border border-orange-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[13px]">add</span>
                              <span>Assign</span>
                            </button>
                          )
                        ) : (
                          <span className="text-slate-300 text-xs font-mono">—</span>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
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
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                            >
                              <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                              <span>Certificate</span>
                            </button>
                          )}

                          {emp.status === 'CANCELLED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400 bg-slate-50 border border-slate-200">
                              Cancelled
                            </span>
                          ) : emp.status === 'REJECTED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-rose-500 bg-rose-50 border border-rose-200">
                              Rejected
                            </span>
                          ) : emp.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200">
                              Cleared
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCancelRequest(emp)}
                                title="Cancel medical clearance request"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                              >
                                <span className="material-symbols-outlined text-[12px] text-slate-400">cancel</span>
                                <span>Cancel Request</span>
                              </button>

                              {(userRole === 'CENTRAL' || userRole === 'ADMIN') && (
                                <button
                                  type="button"
                                  onClick={() => handleRejectRequest(emp)}
                                  title="Reject Request with reason"
                                  className="inline-flex items-center px-2 py-0.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              </tbody>
            </table>
          </div>

          {/* 5. Table Footer (Showing & Pagination) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs pt-1 border-t border-slate-100 text-slate-500">
            <div>
              Showing <strong className="text-slate-800">{displayedEmployees.length}</strong> of{' '}
              <strong className="text-slate-800">{processedEmployees.length}</strong>
              {processedEmployees.length !== activeBatch.totalEmployees && (
                <span className="text-slate-400"> (filtered from {activeBatch.totalEmployees})</span>
              )}{' '}
              candidates &bull;{' '}
              <span className="font-bold text-slate-800">
                {selectedEmployeeIds.length} selected for dispatch
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
                      ? 'bg-secondary text-white shadow-2xs'
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
                <span className="material-symbols-outlined text-[22px] text-secondary">verified</span>
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
                  <span className="font-bold text-slate-800">RFID Enabled</span>
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
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
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
                <span className="material-symbols-outlined text-[20px] text-secondary">person_add</span>
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
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Employee ID / SAP #</label>
                <input
                  type="text"
                  placeholder="e.g. E10255"
                  value={newStaffNo}
                  onChange={(e) => setNewStaffNo(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Department</label>
                <select
                  value={newStaffDept}
                  onChange={(e) => setNewStaffDept(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
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
                className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary-hover text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
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
                <span className="material-symbols-outlined text-[20px] text-secondary">playlist_add</span>
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
                  value={newBatchTitle}
                  onChange={(e) => setNewBatchTitle(e.target.value)}
                  placeholder="e.g. Yanpet Turnaround Q4 Intake"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Industrial Plant / Facility</label>
                <select
                  value={newBatchPlant}
                  onChange={(e) => setNewBatchPlant(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                >
                  <option value="YANPET">Yanpet Petrochemical</option>
                  <option value="SABIC">SABIC Jubail Site</option>
                  <option value="SADARA">Sadara Complex South</option>
                  <option value="OTHER">Logistics & Supply Hub</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Medical Protocol Type</label>
                <select
                  value={newBatchTestId}
                  onChange={(e) => setNewBatchTestId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                >
                  <option value="5004972">Yanpet medical test (Material #5004972)</option>
                  <option value="5004959">SABIC medical screening with TSH (#5004959)</option>
                  <option value="5004955">Sadara medical test (#5004955)</option>
                  <option value="5004965">General medical fitness (#5004965)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Lead Employee Badge</label>
                  <input
                    type="text"
                    value={newBatchEmpNo}
                    onChange={(e) => setNewBatchEmpNo(e.target.value)}
                    placeholder="e.g. 11000018"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Lead Employee Name</label>
                  <input
                    type="text"
                    value={newBatchEmpName}
                    onChange={(e) => setNewBatchEmpName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                  />
                </div>
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
                onClick={async () => {
                  const batchId = `REQ-2026-${Math.floor(1000 + Math.random() * 9000)}`;
                  const plantNameMap: Record<string, string> = {
                    YANPET: 'Yanpet Plant',
                    SABIC: 'Jubail Site',
                    SADARA: 'Complex South',
                    OTHER: 'Logistics Wing'
                  };
                  try {
                    await api.createRequest({
                      employeeNo: newBatchEmpNo.trim() || `E${Math.floor(10000 + Math.random() * 89999)}`,
                      name: newBatchEmpName.trim() || 'Batch Lead Personnel',
                      department: newBatchPlant === 'OTHER' ? 'LOGISTIC' : 'PMTA',
                      testId: newBatchTestId,
                      note: JSON.stringify({
                        batchId,
                        batchName: newBatchTitle.trim() || `Clearance Batch ${batchId}`,
                        plant: plantNameMap[newBatchPlant] || 'Main Facility',
                        plantCategory: newBatchPlant
                      })
                    });
                    await loadData();
                    setSelectedBatchId(batchId);
                    setToastMessage(`Batch ${batchId} (${newBatchTitle}) created and persisted to database!`);
                    setIsCreateBatchOpen(false);
                  } catch (e: any) {
                    setToastMessage(e?.response?.data?.error || 'Failed to create batch on server');
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-secondary hover:bg-secondary-hover text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
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
