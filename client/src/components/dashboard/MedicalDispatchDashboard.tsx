import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { api } from '../../api/client';
import { CertificateModal } from '../certificate/CertificateModal';
import { PdfReportViewerModal } from '../certificate/PdfReportViewerModal';

interface MedicalDispatchDashboardProps {
  userRole?: string;
  vendorId?: string | null;
  onNavigateToTab?: (tab: string) => void;
}

interface ClinicRecord {
  id: string;
  code: string;
  name: string;
  sapVendorNo?: string;
  crNumber?: string;
  location?: string;
  notes?: string;
  contractNo?: string;
}

interface LabData {
  cbc: {
    glucose: string;
    hemoglobin: string;
    cholesterol: string;
    alt: string;
  };
  spiro: {
    fev1Fvc: string;
    fvc: string;
    fev1: string;
    quality: string;
  };
  audio: {
    threshold: string;
    status: string;
  };
  vision: {
    snellen: string;
    ishihara: string;
    clearance: string;
  };
  drug: {
    panel: string;
    alcohol: string;
    compliance: string;
  };
  xray: {
    paView: string;
    findings: string;
    radiologist: string;
  };
}

export const STANDARD_BASELINE_LAB: LabData = {
  cbc: {
    glucose: '96 mg/dL',
    hemoglobin: '15.4 g/dL',
    cholesterol: '188 mg/dL',
    alt: '32 U/L'
  },
  spiro: {
    fev1Fvc: '98% Normal',
    fvc: '4.82L (102% pred)',
    fev1: '3.94L (99% pred)',
    quality: 'Grade A Quality'
  },
  audio: {
    threshold: '500Hz - 8000Hz Bilateral ≤ 15dB loss',
    status: 'Clear for High Noise Zones'
  },
  vision: {
    snellen: '20/20 Snellen (Bilateral)',
    ishihara: 'Ishihara 14-Plate: 14/14 Cleared',
    clearance: 'Heavy Fleet Authorized'
  },
  drug: {
    panel: '10-Panel Rapid: NEGATIVE',
    alcohol: 'Breath Alcohol: 0.000% BAC',
    compliance: 'SAMHSA Compliant'
  },
  xray: {
    paView: 'Normal Findings',
    findings: 'No active lesions or cardiomegaly',
    radiologist: 'Rad: Dr. Tariq Mansoor'
  }
};

export const EMPTY_LAB: LabData = {
  cbc: {
    glucose: '',
    hemoglobin: '',
    cholesterol: '',
    alt: ''
  },
  spiro: {
    fev1Fvc: '',
    fvc: '',
    fev1: '',
    quality: ''
  },
  audio: {
    threshold: '',
    status: ''
  },
  vision: {
    snellen: '',
    ishihara: '',
    clearance: ''
  },
  drug: {
    panel: '',
    alcohol: '',
    compliance: ''
  },
  xray: {
    paView: '',
    findings: '',
    radiologist: ''
  }
};

export const isCbcRecorded = (cbc?: LabData['cbc']) =>
  Boolean(cbc && (cbc.glucose?.trim() || cbc.hemoglobin?.trim() || cbc.cholesterol?.trim() || cbc.alt?.trim()));

export const isSpiroRecorded = (spiro?: LabData['spiro']) =>
  Boolean(spiro && (spiro.fev1Fvc?.trim() || spiro.fvc?.trim() || spiro.fev1?.trim()) && spiro.fev1Fvc !== 'Pending Intake');

export const isAudioRecorded = (audio?: LabData['audio']) =>
  Boolean(audio && audio.threshold?.trim() && audio.status?.trim());

export const isVisionRecorded = (vision?: LabData['vision']) =>
  Boolean(vision && (vision.snellen?.trim() || vision.ishihara?.trim()));

export const isDrugRecorded = (drug?: LabData['drug']) =>
  Boolean(drug && (drug.panel?.trim() || drug.compliance?.trim()));

export const isXrayRecorded = (xray?: LabData['xray']) =>
  Boolean(xray && (xray.findings?.trim() || xray.paView?.trim()));

export const getRecordedCount = (lab?: LabData): number => {
  if (!lab) return 0;
  let count = 0;
  if (isCbcRecorded(lab.cbc)) count++;
  if (isSpiroRecorded(lab.spiro)) count++;
  if (isAudioRecorded(lab.audio)) count++;
  if (isVisionRecorded(lab.vision)) count++;
  if (isDrugRecorded(lab.drug)) count++;
  if (isXrayRecorded(lab.xray)) count++;
  return count;
};

interface ParsedCandidate {
  id: string;
  employeeId: string;
  employeeNo: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  roleDept: string;
  deptFull: string;
  company: string;
  iqamaId: string;
  bloodGroup: string;
  gender: string;
  age: number;
  protocol: string;
  batchAuth: string;
  statusBadge: 'ACTIVE' | 'IN QUEUE' | 'EXP <= 42d' | 'DRAFT' | 'COMPLETED';
  stageText: string;
  stageProgress: string;
  fitStatus: 'FIT' | 'CONDITIONAL' | 'UNFIT';
  validityTerm: string;
  issueDate: string;
  expiryDate: string;
  targetCards: {
    iqama: boolean;
    yanpetRfid: boolean;
    heavyVehicle: boolean;
    sabicAccess: boolean;
  };
  notes: string;
  labData: LabData;
  pdfFileUrl?: string;
  isCertified: boolean;
  rawRequest: any;
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
  <div className="w-16 sm:w-20 h-7 shrink-0">
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

export const MedicalDispatchDashboard: React.FC<MedicalDispatchDashboardProps> = ({
  userRole = 'ADMIN',
  vendorId,
  onNavigateToTab
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'entry' | 'inbound' | 'slots' | 'invoice'>('entry');
  const [viewMode, setViewMode] = useState<'table' | 'workspace'>('table');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [clinics, setClinics] = useState<ClinicRecord[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendorId || 'V1');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCandidateId, setActiveCandidateId] = useState<string>('');
  const [filterFitState, setFilterFitState] = useState<'ALL' | 'FIT' | 'CONDITIONAL' | 'UNFIT' | 'EXPIRING'>('ALL');
  const [tableSection, setTableSection] = useState<'single' | 'bulk'>('single');
  // Horizontal Split & Filters State (Top: Bulk Upload, Bottom: Choose One by One)
  const [bulkSearch, setBulkSearch] = useState<string>('');
  const [oneByOneIdSearch, setOneByOneIdSearch] = useState<string>('');
  const [oneByOneProtocolFilter, setOneByOneProtocolFilter] = useState<string>('ALL');
  const [oneByOneDeptFilter, setOneByOneDeptFilter] = useState<string>('ALL');
  const [oneByOneStatusFilter, setOneByOneStatusFilter] = useState<string>('ALL');
  // Confirm Test & Certificate Issuance Modal State
  const [confirmCandidate, setConfirmCandidate] = useState<ParsedCandidate | null>(null);
  const [confirmResult, setConfirmResult] = useState<'FIT' | 'CONDITIONAL' | 'UNFIT'>('FIT');
  const [confirmDoctor, setConfirmDoctor] = useState<string>('Dr. Farooq Al-Zahrani, MD');
  const [confirmDate, setConfirmDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [confirmValidityTerm, setConfirmValidityTerm] = useState<string>('2 Years (Petro)');
  const [confirmRemarks, setConfirmRemarks] = useState<string>('All occupational diagnostics verified normal. Clinically cleared for unrestricted duty.');
  const [shouldGenerateCertificate, setShouldGenerateCertificate] = useState<boolean>(true);
  const [confirmingLoading, setConfirmingLoading] = useState<boolean>(false);
  const [expandedDateGroups, setExpandedDateGroups] = useState<Record<string, boolean>>({});

  // Interactive Form State for Active Candidate
  const [selectedFitStatus, setSelectedFitStatus] = useState<'FIT' | 'CONDITIONAL' | 'UNFIT'>('FIT');
  const [selectedValidityTerm, setSelectedValidityTerm] = useState<string>('2 Years (Petro)');
  const [customExpiryDate, setCustomExpiryDate] = useState<string>('');
  const [targetCards, setTargetCards] = useState({
    iqama: true,
    yanpetRfid: true,
    heavyVehicle: true,
    sabicAccess: false
  });
  const [physicianRemarks, setPhysicianRemarks] = useState('');
  const [examiningDoctor, setExaminingDoctor] = useState('Dr. Farooq Al-Zahrani, MD');

  // Execution states
  const [issuingCard, setIssuingCard] = useState<boolean>(false);
  const [issuedSuccess, setIssuedSuccess] = useState<boolean>(false);
  const [issuanceReceipt, setIssuanceReceipt] = useState<string>('');

  // PDF Viewer Modal State
  const [selectedPdfReport, setSelectedPdfReport] = useState<any>(null);

  // Bulk PDF Folder Upload State
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState<boolean>(false);
  const [selectedPdfFiles, setSelectedPdfFiles] = useState<File[]>([]);
  const [bulkTestId, setBulkTestId] = useState<string>('5004972');
  const [bulkIssueDate, setBulkIssueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bulkValidityMonths, setBulkValidityMonths] = useState<number>(24);
  const [uploadingPdfs, setUploadingPdfs] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [testsList, setTestsList] = useState<any[]>([]);

  // File Input References
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Comprehensive Clinical Diagnostics Intake State
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState<boolean>(false);
  const [activeModalTab, setActiveModalTab] = useState<'cbc' | 'spiro' | 'audio' | 'vision' | 'drug' | 'xray'>('cbc');
  const [activeLabForm, setActiveLabForm] = useState<LabData>(EMPTY_LAB);
  const [savingLab, setSavingLab] = useState<boolean>(false);

  // Inbound Scheduling
  const [apptModalId, setApptModalId] = useState<string | null>(null);
  const [apptDate, setApptDate] = useState('');

  // Invoicing
  const [billableRequests, setBillableRequests] = useState<string[]>([]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);
  const [invoiceSuccess, setInvoiceSuccess] = useState('');
  const [invoiceGroupingMode, setInvoiceGroupingMode] = useState<'batch' | 'flat'>('batch');
  const [expandedInvoiceBatches, setExpandedInvoiceBatches] = useState<Record<string, boolean>>({});
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState('');
  const [selectedInvoiceBatchFilter, setSelectedInvoiceBatchFilter] = useState<string>('ALL');
  const [invoiceReqIdFilter, setInvoiceReqIdFilter] = useState<string>('');
  const [invoiceTestFilter, setInvoiceTestFilter] = useState<string>('ALL');
  const [invoiceClinicFilter, setInvoiceClinicFilter] = useState<string>('ALL');

  // Inbound Requests Filters
  const [inboundReqIdFilter, setInboundReqIdFilter] = useState<string>('');
  const [inboundTestFilter, setInboundTestFilter] = useState<string>('ALL');
  const [inboundClinicFilter, setInboundClinicFilter] = useState<string>('ALL');
  const [inboundStatusFilter, setInboundStatusFilter] = useState<string>('ALL');
  const [inboundSearchQuery, setInboundSearchQuery] = useState<string>('');

  // Clinic Slot Scheduler State
  const [schedulerDateFilter, setSchedulerDateFilter] = useState<'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'CUSTOM'>('ALL');
  const [schedulerCustomDate, setSchedulerCustomDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [schedulerStatusFilter, setSchedulerStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'PENDING' | 'COMPLETED'>('ALL');
  const [schedulerSearch, setSchedulerSearch] = useState<string>('');
  const [schedulerViewMode, setSchedulerViewMode] = useState<'shifts' | 'list'>('shifts');
  const [apptShift, setApptShift] = useState<string>('Morning (08:00 - 12:00)');
  const [apptNote, setApptNote] = useState<string>('');

  // Official Certificate Modal
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

  // 1. Fetch Master Clinics on Mount
  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    try {
      const res = await api.getClinics();
      if (res.data?.clinics && Array.isArray(res.data.clinics)) {
        const mappedClinics: ClinicRecord[] = res.data.clinics.map((c: any) => ({
          id: c.id,
          code: c.code || 'CLINIC',
          name: c.name || 'Medical Center',
          sapVendorNo: c.sapVendorNo || c.id,
          crNumber: c.crNumber || 'KSA-CCHI-9921-A',
          location: c.notes || 'Industrial Hub, Eastern Province',
          contractNo: c.contracts?.[0]?.contractNo || '4620000318'
        }));
        setClinics(mappedClinics);

        // Set initial selected clinic if not provided
        if (!vendorId && mappedClinics.length > 0) {
          const defaultClinic = mappedClinics.find(c => c.id === 'V1') || mappedClinics[0];
          setSelectedVendorId(defaultClinic.id);
        }
      }

      // Fetch master test types for bulk upload selection
      const testsRes = await api.getTests();
      if (testsRes.data?.tests && Array.isArray(testsRes.data.tests)) {
        setTestsList(testsRes.data.tests);
        if (testsRes.data.tests.length > 0) {
          setBulkTestId(testsRes.data.tests[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch clinics or tests:', e);
    }
  };

  useEffect(() => {
    if (vendorId) {
      setSelectedVendorId(vendorId);
    }
  }, [vendorId]);

  const currentClinic = useMemo(() => {
    return (
      clinics.find(c => c.id === selectedVendorId) || {
        id: selectedVendorId || 'V1',
        code: 'BAK',
        name: 'Badr Al Khaleej Diagnostic & Clinic',
        sapVendorNo: '1001502',
        crNumber: 'KSA-CCHI-9921-A',
        location: 'Jubail Industrial City',
        contractNo: '4620000318'
      }
    );
  }, [clinics, selectedVendorId]);

  // 2. Fetch Requests when clinic changes
  useEffect(() => {
    loadClinicData(selectedVendorId);
    setInvoiceNo(`${currentClinic.code || 'INV'}-2026-${String(Math.floor(100 + Math.random() * 900))}`);
    setSelectedInvoiceBatchFilter('ALL');
    setInvoiceSearchQuery('');
    setInvoiceReqIdFilter('');
    setInvoiceTestFilter('ALL');
    setInvoiceClinicFilter(selectedVendorId || 'ALL');
    setBillableRequests([]);
    // Inbound filters reset
    setInboundReqIdFilter('');
    setInboundTestFilter('ALL');
    setInboundClinicFilter(selectedVendorId || 'ALL');
    setInboundStatusFilter('ALL');
    setInboundSearchQuery('');
  }, [selectedVendorId, currentClinic.code]);

  const loadClinicData = async (vId = selectedVendorId) => {
    setLoading(true);
    try {
      const res = await api.getRequests({ vendorId: vId });
      const reqList = res.data?.requests || [];
      setRequests(reqList);

      // Auto-select first request if active candidate is not in list
      if (reqList.length > 0) {
        if (!activeCandidateId || !reqList.some((r: any) => r.id === activeCandidateId)) {
          setActiveCandidateId(reqList[0].id);
        }
      } else {
        setActiveCandidateId('');
      }
    } catch (e) {
      console.error('Failed to load clinic requests:', e);
    } finally {
      setLoading(false);
    }
  };

  // 3. Helper to parse diagnostic lab values from request report or notes
  const parseLabData = (r: any): LabData => {
    let parsed: any = null;
    if (r.report?.labData) {
      parsed = r.report.labData;
    }
    if (!parsed && r.report?.remarks) {
      try {
        const jsonMatch = r.report.remarks.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }
    if (!parsed && r.note) {
      try {
        const jsonMatch = r.note.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (_) {}
    }

    const labObj = parsed?.labData || parsed;

    // If candidate has entered lab data, hydrate with recorded values
    if (labObj && (labObj.cbc || labObj.spiro || labObj.audio || labObj.vision || labObj.drug || labObj.xray)) {
      return {
        cbc: {
          glucose: labObj.cbc?.glucose || '',
          hemoglobin: labObj.cbc?.hemoglobin || '',
          cholesterol: labObj.cbc?.cholesterol || '',
          alt: labObj.cbc?.alt || ''
        },
        spiro: {
          fev1Fvc: labObj.spiro?.fev1Fvc || '',
          fvc: labObj.spiro?.fvc || '',
          fev1: labObj.spiro?.fev1 || '',
          quality: labObj.spiro?.quality || ''
        },
        audio: {
          threshold: labObj.audio?.threshold || '',
          status: labObj.audio?.status || ''
        },
        vision: {
          snellen: labObj.vision?.snellen || '',
          ishihara: labObj.vision?.ishihara || '',
          clearance: labObj.vision?.clearance || ''
        },
        drug: {
          panel: labObj.drug?.panel || '',
          alcohol: labObj.drug?.alcohol || '',
          compliance: labObj.drug?.compliance || ''
        },
        xray: {
          paView: labObj.xray?.paView || '',
          findings: labObj.xray?.findings || '',
          radiologist: labObj.xray?.radiologist || ''
        }
      };
    }

    // Historical completed record fallback
    if (r.status === 'COMPLETED' || r.report?.result) {
      return STANDARD_BASELINE_LAB;
    }

    // Pending/scheduled candidates start blank so clinicians can record real data
    return EMPTY_LAB;
  };

  // 4. Map DB Requests to Candidate Items
  const candidates: ParsedCandidate[] = useMemo(() => {
    return requests.map((r: any) => {
      const emp = r.employee || {};
      const rep = r.report || {};
      const initials = emp.name
        ? emp.name
            .split(' ')
            .map((p: string) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
        : 'WR';

      const labData = parseLabData(r);
      const recordedCount = getRecordedCount(labData);
      const pdfFileUrl = rep.fileUrl || undefined;

      const issueDateFormatted = rep.testDate
        ? new Date(rep.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      let statusBadge: 'ACTIVE' | 'IN QUEUE' | 'EXP <= 42d' | 'DRAFT' | 'COMPLETED' = 'DRAFT';
      let stageText = pdfFileUrl ? 'Stage: PDF Certificate Attached' : 'Stage: Awaiting PDF Report';
      let stageProgress = pdfFileUrl ? 'PDF Ready' : 'Awaiting File';

      if (r.status === 'COMPLETED' || rep.result || pdfFileUrl) {
        statusBadge = 'COMPLETED';
        stageText = 'Stage: PDF Certificate Attached';
        stageProgress = 'PDF Ready';
      } else if (r.status === 'SCHEDULED') {
        statusBadge = 'ACTIVE';
        stageText = 'Stage: Scheduled Intake';
        stageProgress = 'Awaiting File';
      } else if (r.status === 'SUBMITTED' || r.status === 'WAITING') {
        statusBadge = 'IN QUEUE';
        stageText = 'Stage: Inbound Queue';
        stageProgress = 'Awaiting File';
      }

      // Check for impending expiration
      if (rep.validUntil) {
        const diffDays = Math.ceil((new Date(rep.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 45 && diffDays > 0) {
          statusBadge = 'EXP <= 42d';
        }
      }

      const expiryFormatted = rep.validUntil
        ? new Date(rep.validUntil).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date(Date.now() + 730 * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      // Clean physician remarks - no hardcoded placeholder
      let cleanNotes = '';
      if (rep.remarks) {
        cleanNotes = rep.remarks;
      } else if (r.note) {
        cleanNotes = r.note;
      }
      if (cleanNotes.includes('[Examining Physician:')) {
        cleanNotes = cleanNotes.replace(/\[Examining Physician:[^\]]+\]\s*/, '').trim();
      }
      if (cleanNotes.startsWith('{') && cleanNotes.endsWith('}')) {
        try {
          const p = JSON.parse(cleanNotes);
          cleanNotes = p.notes || '';
        } catch (_) {}
      }

      return {
        id: r.id,
        employeeId: emp.id || r.employeeId,
        employeeNo: emp.employeeNo || r.employeeId,
        name: emp.name || 'Worker',
        initials,
        avatarUrl: emp.photoUrl || undefined,
        roleDept: `#${emp.employeeNo || r.id} • ${emp.position || r.department || emp.department || 'Logistics'}`,
        deptFull: `${r.department || emp.department || emp.division || 'LOGISTICS'} • ${emp.position || emp.jobDesc || 'Staff'}`,
        company: emp.division?.includes('Yanpet') ? 'Yanpet Petrochem' : (emp.division || 'Yanpet Petrochem'),
        iqamaId: emp.iqamaId || emp.employeeNo || '—',
        bloodGroup: 'O+ POS',
        gender: emp.gender || 'Male',
        age: 39,
        protocol: r.test?.name || 'Periodic Fitness & Site Gate Entry',
        batchAuth: r.note?.includes('slotRequestId')
          ? (() => {
              try {
                const parsed = typeof r.note === 'string' ? JSON.parse(r.note) : r.note;
                return parsed.slotRequestId || 'SR-1010';
              } catch (_) {
                return 'SR-1010';
              }
            })()
          : r.note?.includes('[Batch')
          ? (r.note.match(/\[Batch\s+([^\]]+)\]/)?.[1] || 'YAN-2026-0104-R')
          : r.id?.startsWith('SR-')
          ? r.id.split('-').slice(0, 2).join('-')
          : 'YAN-2026-0104-R',
        statusBadge,
        stageText,
        stageProgress,
        fitStatus: (rep.result as any) || 'FIT',
        validityTerm: '2 Years (Petro)',
        issueDate: issueDateFormatted,
        expiryDate: expiryFormatted,
        targetCards: {
          iqama: true,
          yanpetRfid: true,
          heavyVehicle: true,
          sabicAccess: false
        },
        notes: cleanNotes,
        labData,
        pdfFileUrl,
        isCertified: Boolean(r.status === 'COMPLETED' && rep.id && rep.result),
        rawRequest: r
      };
    });
  }, [requests]);

  // Filtered candidate list
  const filteredCandidates = useMemo(() => {
    if (filterFitState === 'ALL') return candidates;
    if (filterFitState === 'FIT') return candidates.filter(c => c.fitStatus === 'FIT');
    if (filterFitState === 'CONDITIONAL') return candidates.filter(c => c.fitStatus === 'CONDITIONAL');
    if (filterFitState === 'UNFIT') return candidates.filter(c => c.fitStatus === 'UNFIT');
    if (filterFitState === 'EXPIRING') return candidates.filter(c => c.statusBadge === 'EXP <= 42d');
    return candidates;
  }, [candidates, filterFitState]);

  // Filtered table candidates (for the simplified 6-field report table)
  const filteredTableCandidates = useMemo(() => {
    let list = filteredCandidates;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.iqamaId.toLowerCase().includes(q) ||
        c.employeeNo.toLowerCase().includes(q) ||
        c.protocol.toLowerCase().includes(q)
      );
    }
    return list;
  }, [filteredCandidates, tableSearch]);

  // Helper to distinguish bulk roster candidates from single clearance requests
  const isCandidateBulk = (c: ParsedCandidate) => {
    const r = c.rawRequest;
    if (!r) return false;
    if (r.id?.startsWith('BULK-') || r.id?.startsWith('REQ-') || r.id?.startsWith('SR-')) return true;
    if (r.note && (r.note.includes('batchId') || r.note.includes('slotRequestId') || r.note.includes('[Batch') || r.note.startsWith('{'))) return true;
    return false;
  };

  // Segregate single candidates vs bulk candidates
  const singleCandidates = useMemo(() => {
    return filteredCandidates.filter(c => !isCandidateBulk(c));
  }, [filteredCandidates]);

  const bulkCandidates = useMemo(() => {
    return filteredCandidates.filter(c => isCandidateBulk(c));
  }, [filteredCandidates]);

  // Bulk candidates filtered by bulk search input and dropdown filters
  const filteredBulkCandidates = useMemo(() => {
    return bulkCandidates.filter(c => {
      // 1. Search Query
      if (bulkSearch.trim()) {
        const q = bulkSearch.toLowerCase().trim();
        const matches =
          c.name.toLowerCase().includes(q) ||
          c.iqamaId.toLowerCase().includes(q) ||
          c.employeeNo.toLowerCase().includes(q) ||
          c.protocol.toLowerCase().includes(q) ||
          (c.rawRequest?.note && c.rawRequest.note.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Protocol Filter
      if (oneByOneProtocolFilter !== 'ALL') {
        const target = oneByOneProtocolFilter.trim().toLowerCase();
        const candProto = (c.protocol || '').trim().toLowerCase();
        if (candProto !== target) return false;
      }

      // 3. Department Filter
      if (oneByOneDeptFilter !== 'ALL') {
        const targetDept = oneByOneDeptFilter.trim().toLowerCase();
        const candDept = `${c.deptFull || ''} ${c.roleDept || ''} ${c.rawRequest?.department || ''} ${c.rawRequest?.employee?.department || ''}`.toLowerCase();
        if (!candDept.includes(targetDept)) return false;
      }

      // 4. Status Filter
      if (oneByOneStatusFilter !== 'ALL') {
        if (oneByOneStatusFilter === 'FIT' && c.fitStatus !== 'FIT') return false;
        if (oneByOneStatusFilter === 'CONDITIONAL' && c.fitStatus !== 'CONDITIONAL') return false;
        if (oneByOneStatusFilter === 'UNFIT' && c.fitStatus !== 'UNFIT') return false;
        if (oneByOneStatusFilter === 'CERTIFIED' && !c.isCertified) return false;
        if (oneByOneStatusFilter === 'PDF_READY' && (!c.pdfFileUrl || c.isCertified)) return false;
        if (oneByOneStatusFilter === 'PENDING' && (c.isCertified || c.pdfFileUrl)) return false;
      }

      return true;
    });
  }, [bulkCandidates, bulkSearch, oneByOneProtocolFilter, oneByOneDeptFilter, oneByOneStatusFilter]);

  // Bulk candidates segregated together based on the date they were requested
  interface BulkDateGroup {
    dateKey: string;
    displayDate: string;
    batchTitle: string;
    candidates: ParsedCandidate[];
    totalCount: number;
    doneCount: number;
    pendingCount: number;
    unbilledCount: number;
  }

  const bulkDateGroups = useMemo(() => {
    const groups: Record<string, BulkDateGroup> = {};

    filteredBulkCandidates.forEach((c) => {
      const rawDate = c.rawRequest?.createdAt;
      const dateKey = rawDate ? new Date(rawDate).toISOString().slice(0, 10) : '2026-11-06';
      const displayDate = rawDate
        ? new Date(rawDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Recent Intake';

      let batchTitle = 'Bulk Clearance Batch';
      if (c.rawRequest?.note) {
        try {
          const parsed = typeof c.rawRequest.note === 'string' ? JSON.parse(c.rawRequest.note) : c.rawRequest.note;
          if (parsed?.batchName) batchTitle = parsed.batchName;
          if (parsed?.slotTitle) batchTitle = `${parsed.slotRequestId || 'SR'}: ${parsed.slotTitle}`;
        } catch (_) {
          if (c.rawRequest.note.includes('[Batch')) {
            const match = c.rawRequest.note.match(/\[Batch\s+([^\]]+)\]/);
            if (match) batchTitle = match[1];
          }
        }
      }
      if (batchTitle === 'Bulk Clearance Batch' && c.rawRequest?.id) {
        if (c.rawRequest.id.startsWith('REQ-') || c.rawRequest.id.startsWith('BULK-')) {
          const parts = c.rawRequest.id.split('-');
          batchTitle = parts.slice(0, 3).join('-');
        } else if (c.rawRequest.id.startsWith('SR-')) {
          const parts = c.rawRequest.id.split('-');
          batchTitle = `${parts.slice(0, 2).join('-')} Pre-Booked Quota`;
        }
      }

      const groupKey = `${dateKey}_${batchTitle}`;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          dateKey: groupKey,
          displayDate,
          batchTitle,
          candidates: [],
          totalCount: 0,
          doneCount: 0,
          pendingCount: 0,
          unbilledCount: 0
        };
      }

      groups[groupKey].candidates.push(c);
      groups[groupKey].totalCount++;
      const isDone = Boolean(c.isCertified || c.rawRequest?.status === 'COMPLETED' || c.rawRequest?.report);
      const isBilled = Boolean(c.rawRequest?.invoiceItems && c.rawRequest.invoiceItems.length > 0);
      if (isDone) {
        groups[groupKey].doneCount++;
        if (!isBilled) {
          groups[groupKey].unbilledCount++;
        }
      } else {
        groups[groupKey].pendingCount++;
      }
    });

    return Object.values(groups).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredBulkCandidates]);

  // Available Test Protocols / Designs across all candidates
  const availableProtocols = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      if (c.protocol && c.protocol.trim()) set.add(c.protocol.trim());
      if (c.rawRequest?.test?.name && c.rawRequest.test.name.trim()) set.add(c.rawRequest.test.name.trim());
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Available Departments / Designations across all candidates
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      const parts = (c.deptFull || '').split('•');
      if (parts[0]?.trim()) set.add(parts[0].trim());
      const roleParts = (c.roleDept || '').split('•');
      if (roleParts[1]?.trim()) set.add(roleParts[1].trim());
      if (c.rawRequest?.department?.trim()) set.add(c.rawRequest.department.trim());
      if (c.rawRequest?.employee?.department?.trim()) set.add(c.rawRequest.employee.department.trim());
      if (c.rawRequest?.employee?.division?.trim()) set.add(c.rawRequest.employee.division.trim());
    });
    return Array.from(set).filter(Boolean).sort();
  }, [candidates]);

  // Candidates filtered for the "Choose One by One" bottom section
  const oneByOneFilteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. ID Search (Iqama ID, SAP Badge ID, Name, or Request ID)
      const searchQuery = (oneByOneIdSearch || bulkSearch).trim().toLowerCase();
      if (searchQuery) {
        const matchIqama = c.iqamaId?.toLowerCase().includes(searchQuery);
        const matchBadge = c.employeeNo?.toLowerCase().includes(searchQuery);
        const matchName = c.name?.toLowerCase().includes(searchQuery);
        const matchId = c.id?.toLowerCase().includes(searchQuery);
        const matchProto = c.protocol?.toLowerCase().includes(searchQuery);
        if (!matchIqama && !matchBadge && !matchName && !matchId && !matchProto) {
          return false;
        }
      }

      // 2. Protocol / Design Filter
      if (oneByOneProtocolFilter !== 'ALL') {
        const target = oneByOneProtocolFilter.trim().toLowerCase();
        const candProto = (c.protocol || '').trim().toLowerCase();
        if (candProto !== target) return false;
      }

      // 3. Department / Designation Filter
      if (oneByOneDeptFilter !== 'ALL') {
        const targetDept = oneByOneDeptFilter.trim().toLowerCase();
        const candDept = `${c.deptFull || ''} ${c.roleDept || ''} ${c.rawRequest?.department || ''} ${c.rawRequest?.employee?.department || ''}`.toLowerCase();
        if (!candDept.includes(targetDept)) return false;
      }

      // 4. Status Filter
      if (oneByOneStatusFilter !== 'ALL') {
        if (oneByOneStatusFilter === 'FIT' && c.fitStatus !== 'FIT') return false;
        if (oneByOneStatusFilter === 'CONDITIONAL' && c.fitStatus !== 'CONDITIONAL') return false;
        if (oneByOneStatusFilter === 'UNFIT' && c.fitStatus !== 'UNFIT') return false;
        if (oneByOneStatusFilter === 'CERTIFIED' && !c.isCertified) return false;
        if (oneByOneStatusFilter === 'PDF_READY' && (!c.pdfFileUrl || c.isCertified)) return false;
        if (oneByOneStatusFilter === 'PENDING' && (c.isCertified || c.pdfFileUrl)) return false;
      }

      return true;
    });
  }, [candidates, oneByOneIdSearch, bulkSearch, oneByOneProtocolFilter, oneByOneDeptFilter, oneByOneStatusFilter]);

  const toggleDateGroup = (groupKey: string) => {
    setExpandedDateGroups((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey] === undefined ? false : !prev[groupKey]
    }));
  };

  // Active Selected Candidate
  const activeCandidate = useMemo(() => {
    return candidates.find(c => c.id === activeCandidateId) || candidates[0] || null;
  }, [candidates, activeCandidateId]);

  // Sync form inputs when active candidate changes
  useEffect(() => {
    if (activeCandidate) {
      setSelectedFitStatus(activeCandidate.fitStatus || 'FIT');
      setSelectedValidityTerm(activeCandidate.validityTerm);
      setCustomExpiryDate(activeCandidate.expiryDate);
      setTargetCards(activeCandidate.targetCards);
      setPhysicianRemarks(activeCandidate.notes || '');
      setIssuedSuccess(activeCandidate.statusBadge === 'COMPLETED');
      setActiveLabForm(JSON.parse(JSON.stringify(activeCandidate.labData)));
    }
  }, [activeCandidate?.id]);

  // 5. Real-Time Dynamic KPIs Computed directly from Database Data
  const kpis = useMemo(() => {
    const total = requests.length || 0;
    const completed = requests.filter(r => r.status === 'COMPLETED' || r.report).length;
    const pending = requests.filter(r => r.status === 'SCHEDULED' || r.status === 'SUBMITTED').length;
    const secondary = requests.filter(r => r.report?.result === 'CONDITIONAL' || r.report?.result === 'UNFIT' || r.status === 'WAITING').length;
    const throughput = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      todayExecuted: completed,
      throughputPercent: throughput,
      pendingSignOff: pending,
      cardsIssued: completed,
      secondaryReview: secondary,
      total
    };
  }, [requests]);

  // Duration selection handler
  const handleSelectTerm = (term: string) => {
    setSelectedValidityTerm(term);
    const now = new Date();
    if (term === '1 Year (Std)') {
      const d = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      setCustomExpiryDate(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    } else if (term === '2 Years (Petro)') {
      const d = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());
      setCustomExpiryDate(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    } else if (term === '6 Mo (Cond)') {
      const d = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
      setCustomExpiryDate(d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }));
    }
  };

  // Master Issuance & Dispatch Trigger (100% Real-Time Backend API Call)
  const handleCardIssuance = async () => {
    if (!activeCandidate) return;
    setIssuingCard(true);
    try {
      // 1. Submit report outcome directly to PostgreSQL backend
      const res = await api.submitReportResult({
        requestId: activeCandidate.id,
        result: selectedFitStatus,
        testDate: new Date().toISOString().slice(0, 10),
        doctorName: examiningDoctor,
        remarks: JSON.stringify({
          notes: physicianRemarks,
          expiryDate: customExpiryDate,
          validityTerm: selectedValidityTerm,
          targetCards,
          labData: activeLabForm
        })
      });

      const reportId = res.data?.report?.id || res.data?.id || `REP-${activeCandidate.id}`;
      setIssuingCard(false);
      setIssuedSuccess(true);
      setIssuanceReceipt(reportId);

      // Re-fetch live data from database to refresh metrics and candidate states
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      setIssuingCard(false);
      alert(`Issuance failed: ${e?.response?.data?.error || e?.message || 'Gateway sync error'}`);
    }
  };

  // Quick load standard normal baseline (e.g. for healthy worker fast-intake)
  const handleLoadStandardBaseline = async () => {
    if (!activeCandidate) return;
    if (window.confirm(`Populate standard normal occupational baseline for ${activeCandidate.name}?`)) {
      setSavingLab(true);
      try {
        await api.updateRequest(activeCandidate.id, {
          note: JSON.stringify({
            notes: physicianRemarks || 'Standard occupational protocol panel ingested. Normal clinical baseline.',
            labData: STANDARD_BASELINE_LAB
          })
        });
        await loadClinicData(selectedVendorId);
      } catch (e: any) {
        alert(`Failed to load baseline: ${e?.message}`);
      } finally {
        setSavingLab(false);
      }
    }
  };

  // Save full diagnostic intake to database
  const handleSaveLabResults = async () => {
    if (!activeCandidate) return;
    setSavingLab(true);
    try {
      await api.updateRequest(activeCandidate.id, {
        note: JSON.stringify({
          notes: physicianRemarks,
          labData: activeLabForm
        })
      });

      setIsClinicalModalOpen(false);
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      alert(`Failed to save diagnostic intake: ${e?.response?.data?.error || e.message}`);
    } finally {
      setSavingLab(false);
    }
  };

  // 1. Single Candidate PDF Report Upload Handler
  const handleSinglePdfUpload = async (candidate: ParsedCandidate, file: File) => {
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('vendorId', selectedVendorId);
      formData.append('requestId', candidate.id);
      formData.append('employeeId', candidate.employeeId);
      formData.append('iqamaId', candidate.iqamaId);
      formData.append('testId', candidate.rawRequest?.testId || bulkTestId);
      formData.append('testDate', new Date().toISOString().slice(0, 10));
      formData.append('validityMonths', '24');

      const res = await api.uploadBatchReports(formData);
      if (res.data?.matchedCount > 0) {
        alert(`Successfully linked ${file.name} to ${candidate.name} (Iqama: ${candidate.iqamaId})!`);
      } else if (res.data?.unmatchedCount > 0) {
        alert(`Could not match ${file.name}: ${res.data.unmatched[0]?.reason}`);
      }
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      alert(`Upload failed: ${e?.response?.data?.error || e.message}`);
    }
  };

  // 2. Bulk Folder / Multi-PDF Ingestion Handler (Matches by Iqama in filename)
  const handleBulkUpload = async () => {
    if (selectedPdfFiles.length === 0) {
      alert('Please select a folder or PDF files to upload.');
      return;
    }

    setUploadingPdfs(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      selectedPdfFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('vendorId', selectedVendorId);
      formData.append('testId', bulkTestId);
      formData.append('testDate', bulkIssueDate);
      formData.append('validityMonths', String(bulkValidityMonths));

      const res = await api.uploadBatchReports(formData);
      setUploadResult(res.data);
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      alert(`Bulk upload failed: ${e?.response?.data?.error || e.message}`);
    } finally {
      setUploadingPdfs(false);
    }
  };

  // Open Real Certificate Modal
  // Open Real Certificate Modal
  const handleOpenCertificate = async (candidate?: any) => {
    const target = candidate || activeCandidate;
    if (!target) return;
    const reportId = target.rawRequest?.report?.id || (target.rawRequest?.status === 'COMPLETED' ? target.id : null);
    if (!reportId || !target.isCertified) {
      alert('No official medical certificate has been generated yet for this candidate. Please confirm the test results first.');
      return;
    }
    try {
      const res = await api.getCertificate(reportId);
      setSelectedCertificate(res.data.certificate);
    } catch (e: any) {
      alert(`Could not fetch certificate: ${e?.response?.data?.error || e.message}`);
    }
  };

  // Confirm Test Completion & Certificate Issuance Handlers
  const handleOpenConfirmModal = (c: ParsedCandidate) => {
    setConfirmCandidate(c);
    setConfirmResult(c.fitStatus || 'FIT');
    setConfirmDoctor(examiningDoctor || 'Dr. Farooq Al-Zahrani, MD');
    setConfirmDate(new Date().toISOString().slice(0, 10));
    setConfirmValidityTerm(c.validityTerm || '2 Years (Petro)');
    setConfirmRemarks(c.notes || 'All occupational diagnostics verified normal. Clinically cleared for unrestricted duty.');
    setShouldGenerateCertificate(true);
  };

  const handleConfirmTestCompleted = async () => {
    if (!confirmCandidate) return;

    if (!shouldGenerateCertificate) {
      alert(`Test results recorded as pending for ${confirmCandidate.name}. No certificate was generated.`);
      setConfirmCandidate(null);
      return;
    }

    setConfirmingLoading(true);
    try {
      const res = await api.submitReportResult({
        requestId: confirmCandidate.id,
        result: confirmResult,
        testDate: confirmDate,
        doctorName: confirmDoctor,
        remarks: JSON.stringify({
          notes: confirmRemarks,
          validityTerm: confirmValidityTerm,
          doctorName: confirmDoctor
        })
      });

      setConfirmCandidate(null);
      await loadClinicData(selectedVendorId);

      // Open newly minted certificate
      if (res.data?.report?.id) {
        try {
          const certRes = await api.getCertificate(res.data.report.id);
          setSelectedCertificate(certRes.data.certificate);
        } catch (_) {}
      }
    } catch (e: any) {
      alert(`Failed to confirm test and generate certificate: ${e?.response?.data?.error || e.message}`);
    } finally {
      setConfirmingLoading(false);
    }
  };

  // Schedule appointment in Inbound tab / Slot Scheduler
  const handleScheduleAppt = async () => {
    if (!apptModalId || !apptDate) return;
    try {
      const fullNote = apptNote.trim()
        ? `[${apptShift}] ${apptNote.trim()}`
        : `Shift: ${apptShift}`;
      await api.scheduleAppointment(apptModalId, apptDate, fullNote);
      setApptModalId(null);
      setApptDate('');
      setApptNote('');
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      alert(`Scheduling failed: ${e.response?.data?.error || e.message}`);
    }
  };

  const openScheduleModal = (req: any) => {
    setApptModalId(req.id);
    if (req.apptDate) {
      try {
        setApptDate(new Date(req.apptDate).toISOString().slice(0, 10));
      } catch {
        setApptDate(new Date().toISOString().slice(0, 10));
      }
    } else {
      setApptDate(new Date().toISOString().slice(0, 10));
    }
    const note = req.note || '';
    if (note.includes('Afternoon')) {
      setApptShift('Afternoon (12:00 - 16:00)');
    } else if (note.includes('Evening')) {
      setApptShift('Evening (16:00 - 20:00)');
    } else {
      setApptShift('Morning (08:00 - 12:00)');
    }
    setApptNote(note.replace(/\[.*?\]\s*/g, '').replace(/Shift:\s*.*$/i, '').trim());
  };

  const handleDirectExamine = (req: any) => {
    setActiveCandidateId(req.id);
    setActiveSubTab('entry');
  };

  // Submit invoice in Invoice Clearance tab
  const handleSubmitInvoice = async () => {
    if (billableRequests.length === 0) {
      alert('Please select at least one completed examination to bill.');
      return;
    }
    const finalInvoiceNo = invoiceNo.trim() || `${currentClinic.code || 'INV'}-2026-${String(Math.floor(100 + Math.random() * 900))}`;
    try {
      setSubmittingInvoice(true);
      const res = await api.submitInvoice({
        invoiceNo: finalInvoiceNo,
        vendorId: selectedVendorId,
        requestIds: billableRequests
      });
      setInvoiceSuccess(`Invoice #${res.data?.invoice?.invoiceNo || finalInvoiceNo} submitted to Finance for 3-Way Match clearance!`);
      setBillableRequests([]);
      setTimeout(() => setInvoiceSuccess(''), 8000);
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      alert(`Invoice submission failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSubmittingInvoice(false);
    }
  };

  const completedRequests = requests.filter(r => (r.status === 'COMPLETED' || r.report) && (!r.invoiceItems || r.invoiceItems.length === 0));

  // Available screening tests / protocols across completed billable requests
  const availableInvoiceTests = useMemo(() => {
    const set = new Set<string>();
    completedRequests.forEach(r => {
      const name = r.test?.name?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [completedRequests]);

  // Available clinics tested across completed billable requests
  const availableInvoiceClinics = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    clinics.forEach(c => map.set(c.id, c));
    completedRequests.forEach(r => {
      const vId = r.vendorId || r.vendor?.id;
      if (vId && !map.has(vId) && r.vendor) {
        map.set(vId, { id: vId, code: r.vendor.code || vId, name: r.vendor.name || vId });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [clinics, completedRequests]);

  // Available screening tests / protocols across all inbound requests
  const availableInboundTests = useMemo(() => {
    const set = new Set<string>();
    requests.forEach(r => {
      const name = r.test?.name?.trim();
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Available clinics across all inbound requests
  const availableInboundClinics = useMemo(() => {
    const map = new Map<string, { id: string; code: string; name: string }>();
    clinics.forEach(c => map.set(c.id, c));
    requests.forEach(r => {
      const vId = r.vendorId || r.vendor?.id;
      if (vId && !map.has(vId) && r.vendor) {
        map.set(vId, { id: vId, code: r.vendor.code || vId, name: r.vendor.name || vId });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [clinics, requests]);

  // Filtered inbound clearance requests
  const filteredInboundRequests = useMemo(() => {
    return requests.filter((r: any) => {
      // 1. Req ID Filter
      if (inboundReqIdFilter.trim()) {
        const qReq = inboundReqIdFilter.trim().toLowerCase();
        if (!r.id.toLowerCase().includes(qReq)) return false;
      }

      // 2. Tests Filter
      if (inboundTestFilter !== 'ALL') {
        const targetTest = inboundTestFilter.trim().toLowerCase();
        const candTest = (r.test?.name || r.testId || '').trim().toLowerCase();
        if (candTest !== targetTest) return false;
      }

      // 3. Clinic Filter
      if (inboundClinicFilter !== 'ALL') {
        const candVendor = r.vendorId || r.vendor?.id;
        if (candVendor !== inboundClinicFilter) return false;
      }

      // 4. Status Filter
      if (inboundStatusFilter !== 'ALL') {
        if (r.status !== inboundStatusFilter) return false;
      }

      // 5. Candidate / Iqama / Badge Search
      if (inboundSearchQuery.trim()) {
        const q = inboundSearchQuery.trim().toLowerCase();
        const matchName = r.employee?.name?.toLowerCase().includes(q);
        const matchIqama = r.employee?.iqamaId?.toLowerCase().includes(q);
        const matchBadge = r.employee?.employeeNo?.toLowerCase().includes(q);
        const matchDept = (r.department || r.employee?.department || '').toLowerCase().includes(q);
        if (!matchName && !matchIqama && !matchBadge && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [requests, inboundReqIdFilter, inboundTestFilter, inboundClinicFilter, inboundStatusFilter, inboundSearchQuery]);

  // Scheduling Request being targeted in modal
  const schedulingReq = useMemo(() => {
    if (!apptModalId) return null;
    return requests.find((r: any) => r.id === apptModalId) || null;
  }, [apptModalId, requests]);

  // Filtered requests for Clinic Slot Scheduler
  const filteredSchedulerRequests = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const nowTs = Date.now();
    const sevenDaysTs = nowTs + 7 * 86400000;

    return requests.filter((r: any) => {
      // 1. Clinic Match (only requests for this clinic vendor)
      const candVendor = r.vendorId || r.vendor?.id;
      if (selectedVendorId && candVendor && candVendor !== selectedVendorId) {
        return false;
      }

      // 2. Date Filter
      if (schedulerDateFilter === 'TODAY') {
        if (!r.apptDate) return false;
        const d = new Date(r.apptDate).toISOString().slice(0, 10);
        if (d !== todayStr) return false;
      } else if (schedulerDateFilter === 'TOMORROW') {
        if (!r.apptDate) return false;
        const d = new Date(r.apptDate).toISOString().slice(0, 10);
        if (d !== tomorrowStr) return false;
      } else if (schedulerDateFilter === 'WEEK') {
        if (!r.apptDate) return false;
        const t = new Date(r.apptDate).getTime();
        if (t < nowTs - 86400000 || t > sevenDaysTs) return false;
      } else if (schedulerDateFilter === 'CUSTOM') {
        if (!r.apptDate) return false;
        const d = new Date(r.apptDate).toISOString().slice(0, 10);
        if (d !== schedulerCustomDate) return false;
      }

      // 3. Status Filter
      if (schedulerStatusFilter === 'SCHEDULED') {
        if (!r.apptDate || r.status === 'COMPLETED') return false;
      } else if (schedulerStatusFilter === 'PENDING') {
        if (r.apptDate && r.status !== 'WAITING') return false;
      } else if (schedulerStatusFilter === 'COMPLETED') {
        if (r.status !== 'COMPLETED') return false;
      }

      // 4. Search Filter
      if (schedulerSearch.trim()) {
        const q = schedulerSearch.trim().toLowerCase();
        const matchName = r.employee?.name?.toLowerCase().includes(q);
        const matchIqama = r.employee?.iqamaId?.toLowerCase().includes(q);
        const matchBadge = r.employee?.employeeNo?.toLowerCase().includes(q);
        const matchReq = r.id?.toLowerCase().includes(q);
        const matchTest = (r.test?.name || '').toLowerCase().includes(q);
        const matchDept = (r.department || '').toLowerCase().includes(q);
        if (!matchName && !matchIqama && !matchBadge && !matchReq && !matchTest && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [requests, selectedVendorId, schedulerDateFilter, schedulerCustomDate, schedulerStatusFilter, schedulerSearch]);

  // Real-time capacity statistics for Clinic Scheduler
  const schedulerStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const clinicReqs = requests.filter(r => {
      const v = r.vendorId || r.vendor?.id;
      return !selectedVendorId || !v || v === selectedVendorId;
    });

    const total = clinicReqs.length;
    const scheduled = clinicReqs.filter(r => r.apptDate && r.status !== 'COMPLETED').length;
    const pendingDate = clinicReqs.filter(r => !r.apptDate && r.status !== 'COMPLETED').length;
    const todayAppts = clinicReqs.filter(r => r.apptDate && new Date(r.apptDate).toISOString().slice(0, 10) === todayStr).length;
    const completed = clinicReqs.filter(r => r.status === 'COMPLETED').length;

    return { total, scheduled, pendingDate, todayAppts, completed };
  }, [requests, selectedVendorId]);

  // Group scheduled candidates into shift buckets
  const shiftGroups = useMemo(() => {
    const morning: any[] = [];
    const afternoon: any[] = [];
    const evening: any[] = [];
    const unscheduled: any[] = [];

    filteredSchedulerRequests.forEach((r: any) => {
      if (!r.apptDate) {
        unscheduled.push(r);
        return;
      }
      const note = (r.note || '').toLowerCase();
      if (note.includes('afternoon') || note.includes('13:') || note.includes('14:') || note.includes('15:') || note.includes('16:')) {
        afternoon.push(r);
      } else if (note.includes('evening') || note.includes('17:') || note.includes('18:') || note.includes('19:') || note.includes('20:')) {
        evening.push(r);
      } else {
        morning.push(r);
      }
    });

    return { morning, afternoon, evening, unscheduled };
  }, [filteredSchedulerRequests]);

  // Helper to resolve contracted SAP material rate for candidate
  const getCandidateRate = useCallback((r: any): number => {
    const testObj = testsList.find((t: any) => t.id === r.testId);
    const effectiveVId = r.vendorId || r.vendor?.id || selectedVendorId;
    const matchedRate = testObj?.rates?.find((rt: any) => rt.contract?.vendor?.id === effectiveVId)?.rate;
    return matchedRate != null ? Number(matchedRate) : 100.0;
  }, [testsList, selectedVendorId]);

  interface BillableBatchGroup {
    batchKey: string;
    batchTitle: string;
    isSlot: boolean;
    isBulk: boolean;
    requests: any[];
    totalSubtotal: number;
    totalVat: number;
    totalAmount: number;
  }

  // Group completed billable requests into Slot-Wise, Bulk Upload-Wise, and Screening Protocol Cohorts
  const billableBatches: BillableBatchGroup[] = useMemo(() => {
    const groups: Record<string, BillableBatchGroup> = {};

    completedRequests.forEach((r: any) => {
      let meta: any = {};
      if (r.note) {
        try {
          meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note;
        } catch (_) {}
      }

      let bKey = '';
      let bTitle = '';
      let isSlot = false;
      let isBulk = false;

      // 1. Slot Requests (SR-1008, SR-1009, SR-1010, etc.)
      if (meta.slotRequestId || r.id.startsWith('SR-')) {
        const slotKey = meta.slotRequestId || r.id.split('-').slice(0, 2).join('-');
        bKey = `SLOT-${slotKey}`;
        bTitle = meta.slotTitle ? `${slotKey}: ${meta.slotTitle}` : `Slot Request ${slotKey}`;
        isSlot = true;
      }
      // 2. Named Cohort Uploads (e.g. REQ-2026-0104, custom batch files)
      else if (meta.batchId && meta.batchId !== 'BATCH-2026-CLEARANCE-ROSTER') {
        bKey = `BATCH-${meta.batchId}`;
        bTitle = meta.batchName || (meta.fileName ? `Bulk Upload: ${meta.fileName}` : `Batch ${meta.batchId}`);
        isBulk = true;
      }
      // 3. Workforce Clearance Master Roster (REQ-CLR-xxx or meta.batchId === 'BATCH-2026-CLEARANCE-ROSTER')
      // Segment by Screening Protocol (e.g. Ma'aden, SABIC, Driving Licence, Hadeed)
      else if (r.id.startsWith('REQ-CLR-') || meta.batchId === 'BATCH-2026-CLEARANCE-ROSTER') {
        const protocolName = r.test?.name || meta.shortName || 'Workforce Medical Clearance';
        bKey = `PROTO-${r.testId || protocolName.replace(/\s+/g, '-').toUpperCase()}`;
        bTitle = `Clearance: ${protocolName}`;
        isBulk = true;
      }
      // 4. Other Bulk Uploads (REQ-xxx, BULK-xxx)
      else if (r.id.startsWith('REQ-') || r.id.startsWith('BULK-')) {
        const parts = r.id.split('-');
        const prefix = parts.slice(0, 3).join('-');
        bKey = `BATCH-${prefix}`;
        bTitle = meta.fileName ? `Bulk Upload: ${meta.fileName}` : `Batch ${prefix}`;
        isBulk = true;
      }
      // 5. Individual or Ad-Hoc
      else {
        const protocolName = r.test?.name || 'Individual Examination';
        bKey = `IND-${r.testId || protocolName.replace(/\s+/g, '-').toUpperCase()}`;
        bTitle = `Ad-Hoc: ${protocolName}`;
      }

      if (!groups[bKey]) {
        groups[bKey] = {
          batchKey: bKey,
          batchTitle: bTitle,
          isSlot,
          isBulk,
          requests: [],
          totalSubtotal: 0,
          totalVat: 0,
          totalAmount: 0
        };
      }

      groups[bKey].requests.push(r);
      const rate = getCandidateRate(r);
      groups[bKey].totalSubtotal += rate;
    });

    Object.values(groups).forEach(g => {
      g.totalVat = Number((g.totalSubtotal * 0.15).toFixed(2));
      g.totalAmount = Number((g.totalSubtotal + g.totalVat).toFixed(2));
    });

    return Object.values(groups).sort((a, b) => b.requests.length - a.requests.length);
  }, [completedRequests, getCandidateRate]);

  // Filtered billable batches based on req id, tests, clinics tested, batch dropdown, and candidate search
  const filteredBillableBatches = useMemo(() => {
    return billableBatches
      .map(b => {
        if (selectedInvoiceBatchFilter !== 'ALL' && b.batchKey !== selectedInvoiceBatchFilter) {
          return null;
        }

        const matchingRequests = b.requests.filter((r: any) => {
          // 1. Req ID Filter
          if (invoiceReqIdFilter.trim()) {
            const qReq = invoiceReqIdFilter.trim().toLowerCase();
            if (!r.id.toLowerCase().includes(qReq)) return false;
          }

          // 2. Tests Filter
          if (invoiceTestFilter !== 'ALL') {
            const targetTest = invoiceTestFilter.trim().toLowerCase();
            const candTest = (r.test?.name || r.testId || '').trim().toLowerCase();
            if (candTest !== targetTest) return false;
          }

          // 3. Clinics Tested Filter
          if (invoiceClinicFilter !== 'ALL') {
            const candVendor = r.vendorId || r.vendor?.id;
            if (candVendor !== invoiceClinicFilter) return false;
          }

          // 4. Candidate Name / Iqama Search
          if (invoiceSearchQuery.trim()) {
            const q = invoiceSearchQuery.trim().toLowerCase();
            const matchName = r.employee?.name?.toLowerCase().includes(q);
            const matchIqama = r.employee?.iqamaId?.toLowerCase().includes(q);
            const matchBadge = r.employee?.employeeNo?.toLowerCase().includes(q);
            const matchNote = r.note && typeof r.note === 'string' && r.note.toLowerCase().includes(q);
            if (!matchName && !matchIqama && !matchBadge && !matchNote) {
              return false;
            }
          }

          return true;
        });

        if (matchingRequests.length > 0) {
          const subtotal = matchingRequests.reduce((sum, r) => sum + getCandidateRate(r), 0);
          const vat = Number((subtotal * 0.15).toFixed(2));
          const total = Number((subtotal + vat).toFixed(2));
          return {
            ...b,
            requests: matchingRequests,
            totalSubtotal: subtotal,
            totalVat: vat,
            totalAmount: total
          };
        }
        return null;
      })
      .filter(Boolean) as BillableBatchGroup[];
  }, [billableBatches, selectedInvoiceBatchFilter, invoiceReqIdFilter, invoiceTestFilter, invoiceClinicFilter, invoiceSearchQuery, getCandidateRate]);

  // Filtered flat completed requests based on req id, tests, clinics tested, batch dropdown, and candidate search
  const filteredFlatCompletedRequests = useMemo(() => {
    return completedRequests.filter((r: any) => {
      // 1. Req ID Filter
      if (invoiceReqIdFilter.trim()) {
        const qReq = invoiceReqIdFilter.trim().toLowerCase();
        if (!r.id.toLowerCase().includes(qReq)) return false;
      }

      // 2. Tests Filter
      if (invoiceTestFilter !== 'ALL') {
        const targetTest = invoiceTestFilter.trim().toLowerCase();
        const candTest = (r.test?.name || r.testId || '').trim().toLowerCase();
        if (candTest !== targetTest) return false;
      }

      // 3. Clinics Tested Filter
      if (invoiceClinicFilter !== 'ALL') {
        const candVendor = r.vendorId || r.vendor?.id;
        if (candVendor !== invoiceClinicFilter) return false;
      }

      // 4. Batch Cohort Filter
      if (selectedInvoiceBatchFilter !== 'ALL') {
        const targetBatch = billableBatches.find(b => b.batchKey === selectedInvoiceBatchFilter);
        if (targetBatch && !targetBatch.requests.some(br => br.id === r.id)) {
          return false;
        }
      }

      // 5. Candidate Name / Iqama Search
      if (invoiceSearchQuery.trim()) {
        const q = invoiceSearchQuery.trim().toLowerCase();
        const matchName = r.employee?.name?.toLowerCase().includes(q);
        const matchIqama = r.employee?.iqamaId?.toLowerCase().includes(q);
        const matchBadge = r.employee?.employeeNo?.toLowerCase().includes(q);
        const matchNote = r.note && typeof r.note === 'string' && r.note.toLowerCase().includes(q);
        if (!matchName && !matchIqama && !matchBadge && !matchNote) {
          return false;
        }
      }

      return true;
    });
  }, [completedRequests, invoiceReqIdFilter, invoiceTestFilter, invoiceClinicFilter, selectedInvoiceBatchFilter, invoiceSearchQuery, billableBatches]);

  // Live financial totals for all currently selected candidate IDs
  const invoiceSelectedSummary = useMemo(() => {
    let subtotal = 0;
    completedRequests.forEach(r => {
      if (billableRequests.includes(r.id)) {
        subtotal += getCandidateRate(r);
      }
    });
    const vat = Number((subtotal * 0.15).toFixed(2));
    const total = Number((subtotal + vat).toFixed(2));
    return {
      count: billableRequests.length,
      subtotal,
      vat,
      total
    };
  }, [billableRequests, completedRequests, getCandidateRate]);

  const toggleInvoiceBatchExpand = (batchKey: string) => {
    setExpandedInvoiceBatches(prev => ({
      ...prev,
      [batchKey]: prev[batchKey] === false ? true : false
    }));
  };

  const handleToggleBatchRequests = (batchReqs: any[]) => {
    const ids = batchReqs.map(r => r.id);
    const allSelected = ids.every(id => billableRequests.includes(id));
    if (allSelected) {
      setBillableRequests(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setBillableRequests(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. TOP CLINIC BANNER & NAVIGATION BAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-4 lg:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[26px]">local_hospital</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-extrabold text-xl text-slate-900 leading-tight">
                  {currentClinic.name}
                </h1>
                {/* CLINIC SWITCHER: ADMIN ONLY; LOCKED FOR CLINIC DESK USERS */}
                {userRole === 'ADMIN' ? (
                  <select
                    value={selectedVendorId}
                    onChange={(e) => {
                      const nextVendorId = e.target.value;
                      setSelectedVendorId(nextVendorId);
                      loadClinicData(nextVendorId);
                    }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-2 py-1 rounded-lg border border-slate-300 focus:outline-none cursor-pointer"
                  >
                    {clinics.map(c => (
                      <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg border border-slate-200">
                    {currentClinic.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Tab Navigation Pills with Real-Time Dynamic Counts */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveSubTab('entry')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'entry'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">biotech</span>
              <span>Test & Lab Entry</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">Active</span>
            </button>

            <button
              onClick={() => setActiveSubTab('inbound')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'inbound'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">move_to_inbox</span>
              <span>Inbound Requests</span>
              <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 font-bold text-[10px]">
                {requests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('slots')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'slots'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">calendar_month</span>
              <span>Slot Scheduler</span>
              <span className="px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                {requests.filter(r => r.apptDate).length} Booked
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('invoice')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'invoice'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">receipt_long</span>
              <span>Invoice Clearance</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                {completedRequests.length} Ready
              </span>
            </button>
          </div>
        </div>


        {/* 3. LIVE EXECUTIVE METRICS STRIP (100% Dynamically Calculated from Database) */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* KPI 1: TODAY EXECUTED */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Today Executed</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                  {kpis.todayExecuted}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  {kpis.throughputPercent}% throughput
                </span>
              </div>
              <Sparkline
                color="#1A1F45"
                gradientId="clinic-kpi-1"
                linePath="M 0 26 C 15 26, 25 21, 40 21 C 55 21, 65 24, 75 16 C 85 9, 93 7, 100 7"
                areaPath="M 0 26 C 15 26, 25 21, 40 21 C 55 21, 65 24, 75 16 C 85 9, 93 7, 100 7 L 100 36 L 0 36 Z"
                endX={100}
                endY={7}
              />
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, kpis.throughputPercent)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 2: PENDING SIGN-OFF */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Pending Sign-Off</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-slate-900 leading-none">
                  {kpis.pendingSignOff}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Batch {currentClinic.code}-2026
                </span>
              </div>
              <Sparkline
                color="#d97706"
                gradientId="clinic-kpi-2"
                linePath="M 0 10 C 20 12, 35 18, 50 17 C 65 16, 80 25, 100 28"
                areaPath="M 0 10 C 20 12, 35 18, 50 17 C 65 16, 80 25, 100 28 L 100 36 L 0 36 Z"
                endX={100}
                endY={28}
              />
            </div>
            <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (kpis.pendingSignOff / (kpis.total || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 3: CARDS ISSUED & SYNCED */}
          <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/80 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold uppercase tracking-wider">
              <span>Cards Issued & Synced</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-emerald-900 leading-none">
                  {kpis.cardsIssued}
                </span>
                <span className="text-xs font-bold text-emerald-600">
                  Live {currentClinic.code} Push
                </span>
              </div>
              <Sparkline
                color="#059669"
                gradientId="clinic-kpi-3"
                linePath="M 0 30 C 15 28, 30 22, 50 20 C 70 18, 85 10, 100 6"
                areaPath="M 0 30 C 15 28, 30 22, 50 20 C 70 18, 85 10, 100 6 L 100 36 L 0 36 Z"
                endX={100}
                endY={6}
              />
            </div>
            <div className="mt-2 h-1.5 w-full bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, (kpis.cardsIssued / (kpis.total || 1)) * 100)}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 4: SECONDARY REVIEW REQUIRED */}
          <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold uppercase tracking-wider">
              <span>Secondary Review Req.</span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-extrabold text-2xl text-amber-900 leading-none">
                  {kpis.secondaryReview}
                </span>
                <span className="text-xs font-bold text-amber-600">
                  {kpis.secondaryReview > 0 ? 'Review Needed' : 'Zero Exceptions'}
                </span>
              </div>
              <Sparkline
                color="#ea580c"
                gradientId="clinic-kpi-4"
                linePath="M 0 22 C 20 20, 35 25, 55 24 C 75 23, 85 16, 100 15"
                areaPath="M 0 22 C 20 20, 35 25, 55 24 C 75 23, 85 16, 100 15 L 100 36 L 0 36 Z"
                endX={100}
                endY={15}
              />
            </div>
            <div className="mt-2 h-1.5 w-full bg-amber-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, (kpis.secondaryReview / (kpis.total || 1)) * 100))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE VIEW (SPLIT HORIZONTALLY: TOP = BULK UPLOAD, BOTTOM = CHOOSE ONE BY ONE) */}
      {activeSubTab === 'entry' && (() => {
        const renderCandidateTable = (
          candidateList: ParsedCandidate[],
          showDateCol: boolean = false,
          isOneByOneView: boolean = false
        ) => (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">1. Employee Details</th>
                  <th className="py-3 px-3.5">2. Name of Report / Protocol</th>
                  <th className="py-3 px-3.5">3. Iqama Number</th>
                  <th className="py-3 px-3.5">{showDateCol ? '4. Requested Date' : '4. Issue Date'}</th>
                  <th className="py-3 px-3.5">5. Expiry Date</th>
                  <th className="py-3 px-3.5">6. Medical Center</th>
                  <th className="py-3 px-3.5">Test & Certificate Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {candidateList.map((c) => {
                  const reqDate = c.rawRequest?.createdAt
                    ? new Date(c.rawRequest.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                    : c.issueDate;
                  const isSelected = activeCandidateId === c.id;

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* 1. Name & Badge */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-7 w-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-amber-500 text-white' : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {c.initials}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{c.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              SAP: {c.employeeNo} &bull; <span className="text-slate-500">{c.deptFull || c.roleDept}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Name of Report / Protocol Design */}
                      <td className="py-3 px-3.5">
                        <div className="font-semibold text-slate-800">{c.protocol}</div>
                        <div className="text-[10px] text-slate-400">Occupational Fitness Protocol</div>
                      </td>

                      {/* 3. Iqama Number */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-md border border-primary/20 text-xs">
                          {c.iqamaId}
                        </span>
                      </td>

                      {/* 4. Issue Date or Request Date */}
                      <td className="py-3 px-3.5 font-mono text-slate-700">
                        {showDateCol ? reqDate : c.issueDate}
                      </td>

                      {/* 5. Expiry Date */}
                      <td className="py-3 px-3.5 font-mono">
                        <span className="font-bold text-emerald-700">
                          {c.expiryDate}
                        </span>
                      </td>

                      {/* 6. Medical Center Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-800">{c.rawRequest?.vendor?.name || currentClinic.name}</div>
                        <div className="text-[10px] text-slate-400">CR: {currentClinic.crNumber}</div>
                      </td>

                      {/* Test & Certificate Status */}
                      <td className="py-3 px-3.5">
                        {c.isCertified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="material-symbols-outlined text-[15px] text-emerald-600">verified</span>
                            <span>Certified & Completed</span>
                          </span>
                        ) : c.pdfFileUrl ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            <span className="material-symbols-outlined text-[15px] text-sky-600">pending_actions</span>
                            <span>PDF Ready (Pending Sign-Off)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="material-symbols-outlined text-[15px] text-amber-600">hourglass_empty</span>
                            <span>Awaiting File / Intake</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Lab Entry Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCandidateId(c.id);
                              setIsClinicalModalOpen(true);
                            }}
                            title="Enter or view clinical diagnostics and lab panels"
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              isSelected
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">clinical_notes</span>
                            <span>{isSelected ? 'Active Lab' : 'Lab Entry'}</span>
                          </button>

                          {/* Upload PDF Action Button */}
                          <label
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                              c.pdfFileUrl
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                                : 'bg-teal-800 hover:bg-teal-900 text-white'
                            }`}
                            title={c.pdfFileUrl ? 'Replace / Upload new PDF report' : 'Upload PDF medical report'}
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {c.pdfFileUrl ? 'file_upload' : 'upload_file'}
                            </span>
                            <span>{c.pdfFileUrl ? 'Replace' : 'Upload PDF'}</span>
                            <input
                              type="file"
                              accept=".pdf"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleSinglePdfUpload(c, file);
                              }}
                            />
                          </label>

                          {/* View PDF Button (when attached) */}
                          {c.pdfFileUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedPdfReport({
                                    id: c.rawRequest?.report?.id || c.id,
                                    employeeName: c.name,
                                    reportName: c.protocol,
                                    iqamaId: c.iqamaId,
                                    issueDate: c.issueDate,
                                    expiryDate: c.expiryDate,
                                    clinicName: currentClinic.name,
                                    fileUrl: c.pdfFileUrl
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary hover:bg-slate-900 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer"
                                title="View PDF Report"
                              >
                                <span className="material-symbols-outlined text-[15px] text-red-300">picture_as_pdf</span>
                                <span>View</span>
                              </button>
                            </>
                          )}

                          {/* ACTION BUTTON: If NOT certified yet, show Confirm Test */}
                          {!c.isCertified ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConfirmModal(c)}
                              title="Confirm test completed and choose whether to generate certificate"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">verified_user</span>
                              <span>Confirm Test</span>
                            </button>
                          ) : (
                            /* When certified & completed: Show official certificate button */
                            <button
                              type="button"
                              onClick={() => handleOpenCertificate(c)}
                              title="View Official Medical Certificate"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                            >
                              <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                              <span>Certificate</span>
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
        );

        return (
          <div className="space-y-6">
            {/* ================================================================= */}
            {/* 1. TOP HORIZONTAL SECTION: BULK UPLOAD & BATCH QUEUE */}
            {/* ================================================================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-4">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-display font-extrabold text-base text-slate-900">
                    Bulk Upload &amp; Cohort Batch Queue
                  </h2>
                </div>

                {/* Actions & Bulk Upload */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Bulk Folder / Multi-PDF Upload Action Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPdfFiles([]);
                      setUploadResult(null);
                      setIsBulkUploadModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">drive_folder_upload</span>
                    <span>Upload Folder of Reports (by Iqama #)</span>
                  </button>

                  <button
                    onClick={() => loadClinicData(selectedVendorId)}
                    title="Refresh Queue"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Master Dropdown & Search Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-50/90 border border-slate-200/90 text-xs">
                {/* Search */}
                <div className="lg:col-span-4 relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[17px]">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search candidate, Iqama, badge, batch ID..."
                    value={bulkSearch}
                    onChange={(e) => {
                      setBulkSearch(e.target.value);
                      setOneByOneIdSearch(e.target.value);
                    }}
                    className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                  />
                  {bulkSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkSearch('');
                        setOneByOneIdSearch('');
                      }}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <span className="material-symbols-outlined text-[15px]">cancel</span>
                    </button>
                  )}
                </div>

                {/* Protocol Filter Dropdown */}
                <div className="lg:col-span-3">
                  <select
                    value={oneByOneProtocolFilter}
                    onChange={(e) => setOneByOneProtocolFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                  >
                    <option value="ALL">All Test Protocols ({candidates.length})</option>
                    {availableProtocols.map((protocol) => (
                      <option key={protocol} value={protocol}>
                        {protocol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department Filter Dropdown */}
                <div className="lg:col-span-3">
                  <select
                    value={oneByOneDeptFilter}
                    onChange={(e) => setOneByOneDeptFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                  >
                    <option value="ALL">All Departments &amp; Trades</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter & Reset */}
                <div className="lg:col-span-2 flex items-center gap-1.5">
                  <select
                    value={oneByOneStatusFilter}
                    onChange={(e) => setOneByOneStatusFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="FIT">Fit for Duty</option>
                    <option value="CONDITIONAL">Conditional</option>
                    <option value="UNFIT">Temporarily Unfit</option>
                    <option value="CERTIFIED">Certified</option>
                    <option value="PDF_READY">PDF Ready</option>
                    <option value="PENDING">Pending File</option>
                  </select>
                  {(bulkSearch || oneByOneProtocolFilter !== 'ALL' || oneByOneDeptFilter !== 'ALL' || oneByOneStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBulkSearch('');
                        setOneByOneIdSearch('');
                        setOneByOneProtocolFilter('ALL');
                        setOneByOneDeptFilter('ALL');
                        setOneByOneStatusFilter('ALL');
                      }}
                      title="Clear all filters"
                      className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Bulk Queue Telemetry Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 p-3 rounded-xl border border-slate-200/90">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-600">Active Cohort Batches:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-800">
                    {bulkDateGroups.length} Dates
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="font-semibold text-slate-600">Total Bulk Candidates:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-bold">
                    {bulkCandidates.length} Workers
                  </span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="font-semibold text-slate-600">PDFs Attached:</span>
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    {bulkCandidates.filter(c => c.pdfFileUrl).length} Attached
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                    <span>{bulkCandidates.filter(c => c.isCertified).length} Certified</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                    <span className="material-symbols-outlined text-[13px] text-amber-600">hourglass_top</span>
                    <span>{bulkCandidates.filter(c => !c.isCertified).length} Pending</span>
                  </span>
                </div>
              </div>

              {/* Bulk Cohort Batches List */}
              {bulkDateGroups.length === 0 ? (
                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-[28px] text-slate-300 mb-1">inventory_2</span>
                  <p className="text-xs font-semibold text-slate-600">No bulk batch reports match the search criteria.</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {bulkDateGroups.map((group) => {
                    const isExpanded = expandedDateGroups[group.dateKey] !== false;
                    const percentDone = group.totalCount > 0 ? Math.round((group.doneCount / group.totalCount) * 100) : 0;

                    return (
                      <div
                        key={group.dateKey + group.batchTitle}
                        className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                      >
                        {/* BATCH DATE GROUP HEADER */}
                        <div
                          onClick={() => toggleDateGroup(group.dateKey)}
                          className="p-3.5 sm:p-4 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200/80 transition-colors select-none"
                        >
                          {/* Left: Date & Batch Title */}
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-display font-extrabold text-sm text-slate-900">
                                  Requested: {group.displayDate}
                                </span>
                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                                  {group.batchTitle}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  ({group.totalCount} Employees)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Progress & Status Badges */}
                          <div className="flex flex-wrap items-center gap-3 md:gap-4" onClick={(e) => e.stopPropagation()}>
                            {/* Mini Progress bar */}
                            <div className="w-28 sm:w-36">
                              <div className="flex items-center justify-between text-[10.5px] mb-1">
                                <span className="font-bold text-slate-700">{percentDone}% Done</span>
                                <span className="text-slate-400 font-mono">{group.doneCount}/{group.totalCount}</span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${percentDone}%` }}
                                ></div>
                              </div>
                            </div>

                            {/* Done & Pending Checkmark Badges */}
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                                <span>{group.doneCount} Done</span>
                              </span>
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                <span className="material-symbols-outlined text-[14px] text-amber-600">hourglass_top</span>
                                <span>{group.pendingCount} Pending</span>
                              </span>

                              {/* Create Invoice / Billing Action Shortcut */}
                              {group.unbilledCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const unbilledIds = group.candidates
                                      .filter(c => (c.isCertified || c.rawRequest?.status === 'COMPLETED' || c.rawRequest?.report) && (!c.rawRequest?.invoiceItems || c.rawRequest?.invoiceItems.length === 0))
                                      .map(c => c.id);
                                    setBillableRequests(unbilledIds);
                                    setActiveSubTab('invoice');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary hover:bg-secondary-hover text-white shadow-xs transition-all cursor-pointer"
                                  title="Open Invoice Clearance tab with completed candidates from this batch"
                                >
                                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                                  <span>Create Invoice ({group.unbilledCount})</span>
                                </button>
                              ) : group.doneCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <span className="material-symbols-outlined text-[14px]">verified</span>
                                  <span>Invoiced</span>
                                </span>
                              ) : null}
                            </div>

                            {/* Expand/Collapse toggle */}
                            <button
                              type="button"
                              onClick={() => toggleDateGroup(group.dateKey)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* BATCH CANDIDATE ROSTER TABLE */}
                        {isExpanded && (
                          <div className="p-3 sm:p-4 bg-slate-50/40">
                            {renderCandidateTable(group.candidates, true, false)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ================================================================= */}
            {/* 2. BOTTOM HORIZONTAL SECTION: CHOOSE ONE BY ONE */}
            {/* ================================================================= */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-4">
              {/* Bottom Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[22px]">person_search</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-secondary/15 text-secondary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                        Bottom Section: Choose One by One
                      </span>
                      <h2 className="font-display font-extrabold text-base text-slate-900">
                        Individual Candidate Verification & Lab Entry
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Directly search any candidate by 10-digit Iqama or SAP ID, filter by test design/protocol, and update clinical lab records.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-medium">
                    Showing <strong className="text-slate-900">{oneByOneFilteredCandidates.length}</strong> of <strong className="text-slate-700">{candidates.length}</strong> candidates
                  </span>
                </div>
              </div>

              {/* Filters Bar: ID Search + Design Filter + Department Filter + Status Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 items-end">
                {/* 1. ID Search (Iqama # / SAP Badge / Name) */}
                <div className="lg:col-span-4 relative">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    ID Search (Iqama # / SAP ID / Name)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[18px]">
                      badge
                    </span>
                    <input
                      type="text"
                      placeholder="Search Iqama # (10 digits), SAP ID, Name..."
                      value={oneByOneIdSearch}
                      onChange={(e) => setOneByOneIdSearch(e.target.value)}
                      className="w-full pl-8.5 pr-8 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-secondary bg-white shadow-2xs"
                    />
                    {oneByOneIdSearch && (
                      <button
                        type="button"
                        onClick={() => setOneByOneIdSearch('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Design / Protocol Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Design / Test Protocol Filter
                  </label>
                  <select
                    value={oneByOneProtocolFilter}
                    onChange={(e) => setOneByOneProtocolFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="ALL">All Test Protocols / Designs ({candidates.length})</option>
                    {availableProtocols.map((protocol) => (
                      <option key={protocol} value={protocol}>
                        {protocol}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Department / Designation Filter */}
                <div className="lg:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Department / Trade Filter
                  </label>
                  <select
                    value={oneByOneDeptFilter}
                    onChange={(e) => setOneByOneDeptFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-secondary cursor-pointer"
                  >
                    <option value="ALL">All Departments & Trades</option>
                    {availableDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Status Filter & Reset */}
                <div className="lg:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Result Status
                  </label>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={oneByOneStatusFilter}
                      onChange={(e) => setOneByOneStatusFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white shadow-2xs focus:outline-none focus:border-secondary cursor-pointer"
                    >
                      <option value="ALL">All States</option>
                      <option value="FIT">Fit for Duty</option>
                      <option value="CONDITIONAL">Conditional</option>
                      <option value="UNFIT">Temporarily Unfit</option>
                      <option value="CERTIFIED">Certified</option>
                      <option value="PDF_READY">PDF Ready</option>
                      <option value="PENDING">Pending File</option>
                    </select>
                    {(oneByOneIdSearch || oneByOneProtocolFilter !== 'ALL' || oneByOneDeptFilter !== 'ALL' || oneByOneStatusFilter !== 'ALL') && (
                      <button
                        type="button"
                        onClick={() => {
                          setOneByOneIdSearch('');
                          setOneByOneProtocolFilter('ALL');
                          setOneByOneDeptFilter('ALL');
                          setOneByOneStatusFilter('ALL');
                        }}
                        title="Clear all filters"
                        className="px-2 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Candidate Table for Choose One by One */}
              {oneByOneFilteredCandidates.length === 0 ? (
                <div className="py-10 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[24px]">person_search</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800">No Candidates Match Your Filters</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No candidates found matching ID "${oneByOneIdSearch}" or the selected design/department filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOneByOneIdSearch('');
                      setOneByOneProtocolFilter('ALL');
                      setOneByOneDeptFilter('ALL');
                      setOneByOneStatusFilter('ALL');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-secondary text-white text-xs font-bold cursor-pointer hover:bg-orange-600 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                renderCandidateTable(oneByOneFilteredCandidates, false, true)
              )}
            </div>
          </div>
        );
      })()}

      {/* 5. INBOUND REQUESTS QUEUE TAB (REAL-TIME DATABASE ROWS) */}
      {activeSubTab === 'inbound' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">move_to_inbox</span>
                </span>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Inbound Clearance Requests ({requests.length})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Live candidate clearances assigned to <span className="font-semibold text-slate-800">{currentClinic.name}</span> in PostgreSQL
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadClinicData(selectedVendorId)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          {/* DEDICATED INBOUND FILTER BAR: TESTS, CLINICS TESTED & REQ ID */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">filter_alt</span>
                <span>Filter Inbound Clearance Requests</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                Matching: {filteredInboundRequests.length} of {requests.length} Requests
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs">
              {/* 1. REQ ID Filter */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter by Req ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
                    tag
                  </span>
                  <input
                    type="text"
                    placeholder="Req ID (e.g. REQ-CLR-, SR-)..."
                    value={inboundReqIdFilter}
                    onChange={(e) => setInboundReqIdFilter(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                  />
                  {inboundReqIdFilter && (
                    <button
                      type="button"
                      onClick={() => setInboundReqIdFilter('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Tests Filter */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter by Test / Protocol
                </label>
                <select
                  value={inboundTestFilter}
                  onChange={(e) => setInboundTestFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  <option value="ALL">All Medical Tests ({requests.length})</option>
                  {availableInboundTests.map((tName) => {
                    const count = requests.filter(r => (r.test?.name || '').trim().toLowerCase() === tName.toLowerCase()).length;
                    return (
                      <option key={tName} value={tName}>
                        {tName} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. Clinics Tested Filter */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Clinics Tested
                </label>
                <select
                  value={inboundClinicFilter}
                  onChange={(e) => {
                    const targetClinic = e.target.value;
                    setInboundClinicFilter(targetClinic);
                    if (targetClinic === 'ALL') {
                      loadClinicData('ALL');
                    } else {
                      setSelectedVendorId(targetClinic);
                      loadClinicData(targetClinic);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  <option value="ALL">All Clinics</option>
                  {availableInboundClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Status Filter */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Request Status
                </label>
                <select
                  value={inboundStatusFilter}
                  onChange={(e) => setInboundStatusFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="WAITING">Waiting Queue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* 5. Candidate Search & Clear Actions */}
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Search Employee
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Name, Iqama..."
                      value={inboundSearchQuery}
                      onChange={(e) => setInboundSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                    />
                    {inboundSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInboundSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">cancel</span>
                      </button>
                    )}
                  </div>

                  {(inboundReqIdFilter || inboundTestFilter !== 'ALL' || inboundClinicFilter !== 'ALL' || inboundStatusFilter !== 'ALL' || inboundSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setInboundReqIdFilter('');
                        setInboundTestFilter('ALL');
                        setInboundClinicFilter('ALL');
                        setInboundStatusFilter('ALL');
                        setInboundSearchQuery('');
                      }}
                      title="Reset all inbound filters"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10.5px]">
                <tr>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Iqama / National ID</th>
                  <th className="py-3 px-3">Clinic Tested</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Medical Screening</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Appointment Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredInboundRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      No inbound requests match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInboundRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{r.employee?.name || 'Worker'}</div>
                        <div className="text-[11px] font-mono text-slate-400">{r.employee?.employeeNo}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{r.employee?.iqamaId || '-'}</td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <span className="material-symbols-outlined text-[12px] text-slate-400">local_hospital</span>
                          {r.vendor?.code || r.vendorId || currentClinic.code}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{r.department || r.employee?.department || 'Operations'}</td>
                      <td className="py-3 px-3 text-slate-800 font-semibold">{r.test?.name || 'General Medical'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'SCHEDULED'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {r.apptDate ? new Date(r.apptDate).toLocaleDateString() : 'Pending Schedule'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setActiveCandidateId(r.id);
                              setActiveSubTab('entry');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-slate-900 transition-colors cursor-pointer"
                          >
                            Examine / Lab
                          </button>
                          <button
                            onClick={() => openScheduleModal(r)}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                            title="Schedule Appointment"
                          >
                            <span className="material-symbols-outlined text-[17px]">calendar_add_on</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. APPOINTMENT SLOTS SCHEDULER TAB */}
      {activeSubTab === 'slots' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-5">
          {/* Header & Clinic Shift Operating Hours */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </span>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Clinic Appointment & Shift Scheduler ({currentClinic.code})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Manage appointment bookings, time blocks, and worker arrivals for <span className="font-semibold text-slate-800">{currentClinic.name}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-3 py-1.5 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Operating Hours: 08:00 AM – 20:00 PM</span>
              </span>
              <button
                type="button"
                onClick={() => loadClinicData(selectedVendorId)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                title="Refresh Appointments"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          {/* Real-Time Appointment Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() => { setSchedulerDateFilter('TODAY'); setSchedulerStatusFilter('ALL'); }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                schedulerDateFilter === 'TODAY'
                  ? 'bg-primary/5 border-primary shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Today's Physicals</span>
                <span className="material-symbols-outlined text-[18px] text-primary">today</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-2xl text-slate-900">{schedulerStats.todayAppts}</span>
                <span className="text-xs font-semibold text-slate-500">Booked Today</span>
              </div>
            </div>

            <div
              onClick={() => { setSchedulerDateFilter('ALL'); setSchedulerStatusFilter('SCHEDULED'); }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                schedulerStatusFilter === 'SCHEDULED' && schedulerDateFilter === 'ALL'
                  ? 'bg-sky-50 border-sky-400 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Scheduled</span>
                <span className="material-symbols-outlined text-[18px] text-sky-600">event_available</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-2xl text-sky-900">{schedulerStats.scheduled}</span>
                <span className="text-xs font-semibold text-slate-500">Confirmed</span>
              </div>
            </div>

            <div
              onClick={() => { setSchedulerDateFilter('ALL'); setSchedulerStatusFilter('PENDING'); }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                schedulerStatusFilter === 'PENDING'
                  ? 'bg-amber-50 border-amber-400 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Awaiting Appointment</span>
                <span className="material-symbols-outlined text-[18px] text-amber-600">pending_actions</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-2xl text-amber-800">{schedulerStats.pendingDate}</span>
                <span className="text-xs font-semibold text-amber-700">Needs Date</span>
              </div>
            </div>

            <div
              onClick={() => { setSchedulerDateFilter('ALL'); setSchedulerStatusFilter('COMPLETED'); }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                schedulerStatusFilter === 'COMPLETED'
                  ? 'bg-emerald-50 border-emerald-400 shadow-xs'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/60'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-[10px] font-bold uppercase tracking-wider">Examined & Certified</span>
                <span className="material-symbols-outlined text-[18px] text-emerald-600">verified</span>
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-2xl text-emerald-800">{schedulerStats.completed}</span>
                <span className="text-xs font-semibold text-emerald-700">Finished</span>
              </div>
            </div>
          </div>

          {/* Interactive Date & Shift Controls Toolbar */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Quick Date Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  Date:
                </span>
                {(
                  [
                    { id: 'ALL', label: 'All Dates' },
                    { id: 'TODAY', label: 'Today' },
                    { id: 'TOMORROW', label: 'Tomorrow' },
                    { id: 'WEEK', label: 'Next 7 Days' }
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setSchedulerDateFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      schedulerDateFilter === pill.id
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}

                {/* Custom Date Picker */}
                <div className="flex items-center gap-1 ml-1">
                  <input
                    type="date"
                    value={schedulerCustomDate}
                    onChange={(e) => {
                      setSchedulerCustomDate(e.target.value);
                      setSchedulerDateFilter('CUSTOM');
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border bg-white shadow-2xs focus:outline-none focus:border-primary ${
                      schedulerDateFilter === 'CUSTOM'
                        ? 'border-primary ring-2 ring-primary/20 text-slate-900'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  />
                </div>
              </div>

              {/* View Switcher: Shifts vs List */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0 self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setSchedulerViewMode('shifts')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    schedulerViewMode === 'shifts'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">view_column</span>
                  <span>Shift View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSchedulerViewMode('list')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    schedulerViewMode === 'list'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">table_rows</span>
                  <span>List View</span>
                </button>
              </div>
            </div>

            {/* Sub-Filters: Search & Status Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-slate-200/70">
              <div className="sm:col-span-2 relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <span className="material-symbols-outlined text-[17px]">search</span>
                </span>
                <input
                  type="text"
                  value={schedulerSearch}
                  onChange={(e) => setSchedulerSearch(e.target.value)}
                  placeholder="Filter by Candidate Name, Iqama, Req ID, Protocol, Department..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                />
                {schedulerSearch && (
                  <button
                    type="button"
                    onClick={() => setSchedulerSearch('')}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={schedulerStatusFilter}
                  onChange={(e) => setSchedulerStatusFilter(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="ALL">All Statuses ({requests.length})</option>
                  <option value="SCHEDULED">Scheduled Only ({schedulerStats.scheduled})</option>
                  <option value="PENDING">Awaiting Date ({schedulerStats.pendingDate})</option>
                  <option value="COMPLETED">Completed ({schedulerStats.completed})</option>
                </select>

                {(schedulerDateFilter !== 'ALL' || schedulerStatusFilter !== 'ALL' || schedulerSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSchedulerDateFilter('ALL');
                      setSchedulerStatusFilter('ALL');
                      setSchedulerSearch('');
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer shrink-0 transition-colors"
                    title="Reset all filters"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Required: Unscheduled Candidates Notice Banner */}
          {shiftGroups.unscheduled.length > 0 && schedulerStatusFilter !== 'SCHEDULED' && (
            <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-3 animate-fade-in shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">notification_important</span>
                  </span>
                  <div>
                    <h4 className="font-display font-extrabold text-sm text-amber-900">
                      {shiftGroups.unscheduled.length} Candidates Awaiting Appointment Booking
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      These workforce clearance requests have been assigned to {currentClinic.name} but do not have an appointment date slotted yet.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {shiftGroups.unscheduled.slice(0, 6).map((r) => (
                  <div key={r.id} className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate">{r.employee?.name || 'Worker'}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                        <span>{r.employee?.iqamaId || r.employee?.employeeNo}</span>
                        <span>&bull;</span>
                        <span className="truncate">{r.test?.name}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openScheduleModal(r)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">calendar_add_on</span>
                      <span>Book Slot</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW MODE 1: SHIFT COLUMNS (MORNING / AFTERNOON / EVENING) */}
          {schedulerViewMode === 'shifts' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 1. MORNING SHIFT */}
                <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[17px]">wb_sunny</span>
                      </span>
                      <div>
                        <h4 className="font-display font-extrabold text-xs text-slate-900">Morning Shift</h4>
                        <span className="text-[10px] text-slate-500">08:00 AM – 12:00 PM</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-[11px]">
                      {shiftGroups.morning.length} Booked
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                    {shiftGroups.morning.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        No appointments slotted for this shift
                      </div>
                    ) : (
                      shiftGroups.morning.map((r, idx) => (
                        <div
                          key={r.id}
                          className={`p-3 bg-white rounded-xl border border-slate-200/90 border-l-4 transition-all shadow-2xs space-y-2 ${
                            r.status === 'COMPLETED'
                              ? 'border-l-emerald-500'
                              : r.status === 'SCHEDULED'
                              ? 'border-l-primary'
                              : 'border-l-amber-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Slot #{idx + 1} &bull; 0{8 + Math.floor(idx * 0.5)}:{idx % 2 === 0 ? '00' : '30'} AM
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'SCHEDULED'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-xs text-slate-900">{r.employee?.name || 'Worker'}</div>
                            <div className="text-[11px] text-slate-500 truncate">{r.test?.name}</div>
                          </div>

                          <div className="text-[10px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono pt-1 border-t border-slate-100">
                            <span>ID: {r.employee?.iqamaId || r.employee?.employeeNo || '—'}</span>
                            <span>&bull;</span>
                            <span>{r.apptDate ? new Date(r.apptDate).toLocaleDateString() : 'Pending'}</span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openScheduleModal(r)}
                              className="px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-bold transition-colors cursor-pointer"
                              title="Change date or shift"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectExamine(r)}
                              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              Examine / Lab
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. AFTERNOON SHIFT */}
                <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[17px]">partly_cloudy_day</span>
                      </span>
                      <div>
                        <h4 className="font-display font-extrabold text-xs text-slate-900">Afternoon Shift</h4>
                        <span className="text-[10px] text-slate-500">12:00 PM – 16:00 PM</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-[11px]">
                      {shiftGroups.afternoon.length} Booked
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                    {shiftGroups.afternoon.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        No appointments slotted for this shift
                      </div>
                    ) : (
                      shiftGroups.afternoon.map((r, idx) => (
                        <div
                          key={r.id}
                          className={`p-3 bg-white rounded-xl border border-slate-200/90 border-l-4 transition-all shadow-2xs space-y-2 ${
                            r.status === 'COMPLETED'
                              ? 'border-l-emerald-500'
                              : r.status === 'SCHEDULED'
                              ? 'border-l-primary'
                              : 'border-l-amber-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Slot #{idx + 1} &bull; {12 + Math.floor(idx * 0.5)}:{idx % 2 === 0 ? '00' : '30'} PM
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'SCHEDULED'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-xs text-slate-900">{r.employee?.name || 'Worker'}</div>
                            <div className="text-[11px] text-slate-500 truncate">{r.test?.name}</div>
                          </div>

                          <div className="text-[10px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono pt-1 border-t border-slate-100">
                            <span>ID: {r.employee?.iqamaId || r.employee?.employeeNo || '—'}</span>
                            <span>&bull;</span>
                            <span>{r.apptDate ? new Date(r.apptDate).toLocaleDateString() : 'Pending'}</span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openScheduleModal(r)}
                              className="px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectExamine(r)}
                              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              Examine / Lab
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. EVENING SHIFT */}
                <div className="bg-slate-50/70 rounded-2xl border border-slate-200/90 p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[17px]">nightlight</span>
                      </span>
                      <div>
                        <h4 className="font-display font-extrabold text-xs text-slate-900">Evening Shift</h4>
                        <span className="text-[10px] text-slate-500">16:00 PM – 20:00 PM</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 font-bold text-[11px]">
                      {shiftGroups.evening.length} Booked
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
                    {shiftGroups.evening.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        No appointments slotted for this shift
                      </div>
                    ) : (
                      shiftGroups.evening.map((r, idx) => (
                        <div
                          key={r.id}
                          className={`p-3 bg-white rounded-xl border border-slate-200/90 border-l-4 transition-all shadow-2xs space-y-2 ${
                            r.status === 'COMPLETED'
                              ? 'border-l-emerald-500'
                              : r.status === 'SCHEDULED'
                              ? 'border-l-primary'
                              : 'border-l-amber-500'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              Slot #{idx + 1} &bull; {16 + Math.floor(idx * 0.5)}:{idx % 2 === 0 ? '00' : '30'} PM
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'SCHEDULED'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {r.status}
                            </span>
                          </div>

                          <div>
                            <div className="font-bold text-xs text-slate-900">{r.employee?.name || 'Worker'}</div>
                            <div className="text-[11px] text-slate-500 truncate">{r.test?.name}</div>
                          </div>

                          <div className="text-[10px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono pt-1 border-t border-slate-100">
                            <span>ID: {r.employee?.iqamaId || r.employee?.employeeNo || '—'}</span>
                            <span>&bull;</span>
                            <span>{r.apptDate ? new Date(r.apptDate).toLocaleDateString() : 'Pending'}</span>
                          </div>

                          <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => openScheduleModal(r)}
                              className="px-2 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectExamine(r)}
                              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              Examine / Lab
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: FULL TABLE / LIST VIEW */}
          {schedulerViewMode === 'list' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Request ID</th>
                    <th className="py-3 px-3">Candidate</th>
                    <th className="py-3 px-3">Iqama / Badge</th>
                    <th className="py-3 px-3">Clinic Facility</th>
                    <th className="py-3 px-3">Screening Protocol</th>
                    <th className="py-3 px-3">Appointment Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedulerRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No candidate appointments match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedulerRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{r.employee?.name || 'Worker'}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          <div>{r.employee?.iqamaId || '—'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.employee?.employeeNo}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {r.vendor?.code || r.vendorId || currentClinic.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">{r.test?.name || 'General Medical'}</td>
                        <td className="py-3 px-3">
                          {r.apptDate ? (
                            <span className="font-semibold text-slate-800">
                              {new Date(r.apptDate).toLocaleDateString()}
                              {r.note && (
                                <span className="block text-[10px] text-slate-500 font-normal truncate max-w-[150px]">
                                  {r.note}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                              Pending Date
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'SCHEDULED'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openScheduleModal(r)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                              title="Book or reschedule appointment"
                            >
                              {r.apptDate ? 'Reschedule' : 'Book Slot'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDirectExamine(r)}
                              className="px-2.5 py-1 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                            >
                              Examine
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 7. INVOICE CLEARANCE TAB (LIVE SAP BILLING FROM REAL COMPLETED DB ROWS) */}
      {activeSubTab === 'invoice' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-4">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </span>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  SAP Invoice Generation & 3-Way Match Clearance
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Reconcile completed medical examinations with SAP Purchase Contract <span className="font-mono font-bold text-slate-700">{currentClinic.contractNo}</span> for <span className="font-semibold text-slate-800">{currentClinic.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-bold ml-1">Invoice Number:</span>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. BAK-2026-091"
                className="font-mono text-xs font-extrabold bg-white border border-slate-300 px-3 py-1.5 rounded-lg text-slate-900 focus:outline-none focus:border-primary shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setInvoiceNo(`${currentClinic.code || 'INV'}-2026-${String(Math.floor(100 + Math.random() * 900))}`)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                title="Generate new invoice number"
              >
                <span className="material-symbols-outlined text-[16px]">autorenew</span>
              </button>
            </div>
          </div>

          {invoiceSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">verified</span>
                <span>{invoiceSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setInvoiceSuccess('')}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Telemetry KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ready for Billing</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-xl text-slate-900">{completedRequests.length}</span>
                <span className="text-xs text-slate-500">Candidates</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Cohorts / Slots</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-xl text-slate-900">{billableBatches.length}</span>
                <span className="text-xs text-slate-500">Batches</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected for Billing</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display font-extrabold text-xl text-primary">{invoiceSelectedSummary.count}</span>
                <span className="text-xs text-slate-500">of {completedRequests.length}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected Total (with 15% VAT)</span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xs font-bold text-slate-400">SAR</span>
                <span className="font-display font-extrabold text-xl text-emerald-700">
                  {invoiceSelectedSummary.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* View Mode & Selection Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            {/* Left: View Mode Toggle */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0 self-start">
              <button
                type="button"
                onClick={() => setInvoiceGroupingMode('batch')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  invoiceGroupingMode === 'batch'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-primary">folder_copy</span>
                <span>Grouped by Batch / Slot ({billableBatches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setInvoiceGroupingMode('flat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  invoiceGroupingMode === 'flat'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] text-slate-500">table_rows</span>
                <span>Flat List ({completedRequests.length})</span>
              </button>
            </div>

            {/* Right: Quick Selection Actions */}
            <div className="flex items-center gap-2 text-xs font-bold shrink-0">
              {completedRequests.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (billableRequests.length === completedRequests.length) {
                        setBillableRequests([]);
                      } else {
                        setBillableRequests(completedRequests.map(r => r.id));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {billableRequests.length === completedRequests.length ? 'deselect' : 'select_all'}
                    </span>
                    <span>
                      {billableRequests.length === completedRequests.length ? 'Deselect All' : `Select All (${completedRequests.length})`}
                    </span>
                  </button>

                  {invoiceGroupingMode === 'batch' && (
                    <button
                      type="button"
                      onClick={() => {
                        const anyCollapsed = billableBatches.some(b => expandedInvoiceBatches[b.batchKey] === false);
                        const next: Record<string, boolean> = {};
                        billableBatches.forEach(b => {
                          next[b.batchKey] = anyCollapsed ? true : false;
                        });
                        setExpandedInvoiceBatches(next);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">unfold_more</span>
                      <span>Toggle All</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* DEDICATED INVOICE FILTER BAR: TESTS, CLINICS TESTED & REQ ID */}
          <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">filter_alt</span>
                <span>Filter Billable Completed Candidates</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-slate-500">
                Matching: {filteredFlatCompletedRequests.length} of {completedRequests.length} Requests
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 text-xs">
              {/* 1. REQ ID Filter */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter by Req ID
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
                    tag
                  </span>
                  <input
                    type="text"
                    placeholder="Req ID (e.g. REQ-CLR-, SR-)..."
                    value={invoiceReqIdFilter}
                    onChange={(e) => setInvoiceReqIdFilter(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                  />
                  {invoiceReqIdFilter && (
                    <button
                      type="button"
                      onClick={() => setInvoiceReqIdFilter('')}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">cancel</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Tests Filter */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Filter by Test / Protocol
                </label>
                <select
                  value={invoiceTestFilter}
                  onChange={(e) => setInvoiceTestFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  <option value="ALL">All Tests &amp; Protocols ({completedRequests.length})</option>
                  {availableInvoiceTests.map((tName) => {
                    const count = completedRequests.filter(r => (r.test?.name || '').trim().toLowerCase() === tName.toLowerCase()).length;
                    return (
                      <option key={tName} value={tName}>
                        {tName} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* 3. Clinics Tested Filter */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Clinics Tested
                </label>
                <select
                  value={invoiceClinicFilter}
                  onChange={(e) => {
                    const targetClinic = e.target.value;
                    setInvoiceClinicFilter(targetClinic);
                    if (targetClinic === 'ALL') {
                      loadClinicData('ALL');
                    } else {
                      setSelectedVendorId(targetClinic);
                      loadClinicData(targetClinic);
                    }
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:border-primary cursor-pointer truncate"
                >
                  <option value="ALL">All Accredited Clinics</option>
                  {availableInvoiceClinics.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Candidate Search & Clear Actions */}
              <div className="lg:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Candidate Name / Iqama
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[16px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Candidate name or Iqama..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                    />
                    {invoiceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInvoiceSearchQuery('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[15px]">cancel</span>
                      </button>
                    )}
                  </div>

                  {(invoiceReqIdFilter || invoiceTestFilter !== 'ALL' || invoiceClinicFilter !== 'ALL' || invoiceSearchQuery || selectedInvoiceBatchFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceReqIdFilter('');
                        setInvoiceTestFilter('ALL');
                        setInvoiceClinicFilter('ALL');
                        setInvoiceSearchQuery('');
                        setSelectedInvoiceBatchFilter('ALL');
                      }}
                      title="Reset all filters"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Optional Cohort Batch Selector (Secondary Filter) */}
            {billableBatches.length > 1 && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/50 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                  Cohort / Slot Batch:
                </span>
                <select
                  value={selectedInvoiceBatchFilter}
                  onChange={(e) => setSelectedInvoiceBatchFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-primary cursor-pointer truncate max-w-md shadow-2xs"
                >
                  <option value="ALL">All Batches &amp; Cohorts ({billableBatches.length})</option>
                  {billableBatches.map(b => (
                    <option key={b.batchKey} value={b.batchKey}>
                      {b.isSlot ? '📅 Slot: ' : b.isBulk ? '📁 ' : '📋 '}
                      {b.batchTitle} ({b.requests.length} candidates)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* VIEW 1: BATCH / SLOT WISE ACCORDION CARDS (DEFAULT & RECOMMENDED) */}
          {/* ============================================================== */}
          {invoiceGroupingMode === 'batch' && (
            <div className="space-y-3.5 pt-1">
              {filteredBillableBatches.length === 0 ? (
                <div className="py-10 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-[32px] text-slate-300 mb-1">inventory_2</span>
                  <p className="text-xs font-semibold text-slate-600">No completed examinations match the search criteria.</p>
                </div>
              ) : (
                filteredBillableBatches.map((batch) => {
                  const isExpanded = expandedInvoiceBatches[batch.batchKey] !== false;
                  const batchIds = batch.requests.map(r => r.id);
                  const selectedInBatch = batch.requests.filter(r => billableRequests.includes(r.id)).length;
                  const isAllSelected = selectedInBatch === batch.requests.length && batch.requests.length > 0;
                  const isPartial = selectedInBatch > 0 && selectedInBatch < batch.requests.length;

                  return (
                    <div
                      key={batch.batchKey}
                      className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                        selectedInBatch > 0 ? 'border-primary/40 ring-1 ring-primary/20' : 'border-slate-200'
                      }`}
                    >
                      {/* BATCH HEADER BAR */}
                      <div
                        onClick={() => toggleInvoiceBatchExpand(batch.batchKey)}
                        className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 cursor-pointer select-none transition-colors ${
                          selectedInBatch > 0 ? 'bg-primary/5 hover:bg-primary/10' : 'bg-slate-50/80 hover:bg-slate-100/80'
                        }`}
                      >
                        {/* Left: Checkbox + Origin Badge + Title */}
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isPartial;
                            }}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleBatchRequests(batch.requests);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4.5 w-4.5 rounded accent-primary cursor-pointer shrink-0"
                          />

                          <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            batch.isSlot
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : batch.isBulk
                              ? 'bg-teal-50 text-teal-700 border-teal-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            <span className="material-symbols-outlined text-[19px]">
                              {batch.isSlot ? 'event_available' : batch.isBulk ? 'inventory_2' : 'badge'}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${
                                batch.isSlot
                                  ? 'bg-amber-100/80 text-amber-900 border-amber-300'
                                  : batch.isBulk
                                  ? 'bg-teal-100/80 text-teal-900 border-teal-300'
                                  : 'bg-blue-100/80 text-blue-900 border-blue-300'
                              }`}>
                                {batch.isSlot ? `Slot Request: ${batch.batchKey}` : batch.isBulk ? `Cohort Batch: ${batch.batchKey}` : 'Master Roster'}
                              </span>

                              <h4 className="font-display font-extrabold text-sm text-slate-900">
                                {batch.batchTitle}
                              </h4>
                            </div>

                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {batch.requests.length} completed examination{batch.requests.length > 1 ? 's' : ''} ready for billing
                              {selectedInBatch > 0 && (
                                <span className="font-bold text-primary ml-1.5">
                                  &bull; {selectedInBatch} of {batch.requests.length} selected for invoice
                                </span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Right: Subtotal + Actions + Expand Toggle */}
                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                          {/* Financial Subtotal for this Batch */}
                          <div className="text-left md:text-right">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Batch Total (incl. 15% VAT)
                            </div>
                            <div className="font-mono font-extrabold text-sm text-slate-900">
                              SAR {batch.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-[10.5px] text-slate-500 font-mono">
                              Subtotal: SAR {batch.totalSubtotal.toFixed(2)} + VAT: SAR {batch.totalVat.toFixed(2)}
                            </div>
                          </div>

                          {/* Quick Bill Action */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBillableRequests(batchIds);
                              setInvoiceNo(`${currentClinic.code || 'BAK'}-${batch.batchKey}-${String(Math.floor(100 + Math.random() * 900))}`);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-200/80 border border-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs whitespace-nowrap hidden sm:inline-flex items-center gap-1"
                            title="Select only this batch and set invoice reference"
                          >
                            <span className="material-symbols-outlined text-[15px] text-secondary">flash_on</span>
                            <span>Bill Only This Batch</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInvoiceBatchExpand(batch.batchKey);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* BATCH CANDIDATE TABLE (WHEN EXPANDED) */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="py-2.5 px-3.5 w-10">Select</th>
                                <th className="py-2.5 px-3.5">Request ID</th>
                                <th className="py-2.5 px-3.5">Candidate Details</th>
                                <th className="py-2.5 px-3.5">Clinic Tested</th>
                                <th className="py-2.5 px-3.5">Department</th>
                                <th className="py-2.5 px-3.5">Screening Protocol</th>
                                <th className="py-2.5 px-3.5 text-right">Contract Rate</th>
                                <th className="py-2.5 px-3.5 text-center">Outcome</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {batch.requests.map((r: any) => {
                                const isSelected = billableRequests.includes(r.id);
                                const rate = getCandidateRate(r);

                                return (
                                  <tr
                                    key={r.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setBillableRequests(billableRequests.filter(id => id !== r.id));
                                      } else {
                                        setBillableRequests([...billableRequests, r.id]);
                                      }
                                    }}
                                    className={`transition-colors cursor-pointer ${
                                      isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3.5">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        onClick={(e) => e.stopPropagation()}
                                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3.5 font-mono font-extrabold text-slate-900">
                                      {r.id}
                                    </td>
                                    <td className="py-2.5 px-3.5">
                                      <div className="font-bold text-slate-900">{r.employee?.name || 'Worker'}</div>
                                      <div className="text-[11px] font-mono text-slate-400">
                                        SAP: {r.employee?.employeeNo} &bull; Iqama: {r.employee?.iqamaId || '—'}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3.5">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                        <span className="material-symbols-outlined text-[12px] text-slate-400">local_hospital</span>
                                        {r.vendor?.code || r.vendorId || currentClinic.code}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3.5 text-slate-600">
                                      {r.department || r.employee?.department || 'Operations'}
                                    </td>
                                    <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                                      {r.test?.name || 'Occupational Medical Examination'}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-right font-mono font-extrabold text-slate-900">
                                      SAR {rate.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 px-3.5 text-center">
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span>
                                        <span>FIT (ISSUED)</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* VIEW 2: FLAT LIST TABLE (FOR CLASSIC AUDIT / QUICK INSPECTION) */}
          {/* ============================================================== */}
          {invoiceGroupingMode === 'flat' && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 pt-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10.5px]">
                  <tr>
                    <th className="py-2.5 px-3 w-10">Select</th>
                    <th className="py-2.5 px-3">Request ID</th>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Clinic Tested</th>
                    <th className="py-2.5 px-3">Screening Protocol</th>
                    <th className="py-2.5 px-3">Batch / Slot Ref</th>
                    <th className="py-2.5 px-3 text-right">Contract Rate</th>
                    <th className="py-2.5 px-3 text-center">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFlatCompletedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No completed medical examinations available for billing matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredFlatCompletedRequests.map((r: any) => {
                      const isSelected = billableRequests.includes(r.id);
                      const rate = getCandidateRate(r);
                      let meta: any = {};
                      if (r.note) {
                        try { meta = typeof r.note === 'string' ? JSON.parse(r.note) : r.note; } catch (_) {}
                      }
                      const batchRef = meta.slotRequestId || meta.batchId || (r.id.startsWith('SR-') ? r.id.split('-').slice(0, 2).join('-') : 'Ad-hoc');

                      return (
                        <tr
                          key={r.id}
                          onClick={() => {
                            if (isSelected) {
                              setBillableRequests(billableRequests.filter(id => id !== r.id));
                            } else {
                              setBillableRequests([...billableRequests, r.id]);
                            }
                          }}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/5' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded accent-primary cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{r.employee?.name || 'Worker'}</div>
                            <div className="text-[11px] font-mono text-slate-400">
                              SAP: {r.employee?.employeeNo} &bull; Iqama: {r.employee?.iqamaId || '—'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              <span className="material-symbols-outlined text-[12px] text-slate-400">local_hospital</span>
                              {r.vendor?.code || r.vendorId || currentClinic.code}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{r.test?.name || 'Occupational Medical Test'}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {batchRef}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                            SAR {rate.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              FIT (ISSUED)
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* STICKY / BOTTOM FINANCIAL SUMMARY & INVOICE SUBMIT BAR */}
          {completedRequests.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-md">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Selected for Invoice
                  </div>
                  <div className="font-display font-extrabold text-base text-white">
                    {invoiceSelectedSummary.count} <span className="text-xs text-slate-300 font-normal">of {completedRequests.length} Candidates</span>
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Subtotal (Base)
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-200">
                    SAR {invoiceSelectedSummary.subtotal.toFixed(2)}
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    15% Standard VAT
                  </div>
                  <div className="font-mono font-bold text-sm text-slate-300">
                    SAR {invoiceSelectedSummary.vat.toFixed(2)}
                  </div>
                </div>

                <div className="h-8 w-px bg-slate-800 hidden sm:block"></div>

                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    Total Invoice Amount
                  </div>
                  <div className="font-mono font-extrabold text-base text-teal-300">
                    SAR {invoiceSelectedSummary.total.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  disabled={submittingInvoice || billableRequests.length === 0}
                  onClick={handleSubmitInvoice}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-2 ${
                    submittingInvoice || billableRequests.length === 0
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      : 'bg-secondary hover:bg-secondary-hover text-white cursor-pointer active:scale-95'
                  }`}
                >
                  {submittingInvoice ? (
                    <>
                      <span className="material-symbols-outlined text-[17px] animate-spin">progress_activity</span>
                      <span>Submitting to Finance...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[17px]">send</span>
                      <span>Submit Invoice to Finance ({billableRequests.length} Selected)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPREHENSIVE CLINICAL DIAGNOSTICS INTAKE MODAL (PERSISTS TO DATABASE) */}
      {isClinicalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[22px] text-primary">clinical_notes</span>
                  <h3 className="font-display font-extrabold text-lg text-slate-900">
                    Clinical Diagnostics Intake & Lab Entry
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recording diagnostic panel results for <strong className="text-slate-800">{activeCandidate?.name}</strong> (#{activeCandidate?.id}) &bull; {activeCandidate?.protocol}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClinicalModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Quick Action Helper Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
              <span className="text-xs font-semibold text-slate-600">
                Diagnostic Progress: <strong className="text-primary">{getRecordedCount(activeLabForm)} of 6 panels recorded</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLabForm(STANDARD_BASELINE_LAB)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Prefill all fields with standard healthy occupational values"
                >
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">playlist_add_check</span>
                  <span>Prefill Normal Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveLabForm(EMPTY_LAB)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  title="Clear all fields"
                >
                  <span className="material-symbols-outlined text-[15px] text-red-500">delete_sweep</span>
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto shrink-0 gap-1 pb-1">
              {[
                { id: 'cbc', label: '1. CBC & Blood', icon: 'bloodtype', recorded: isCbcRecorded(activeLabForm.cbc) },
                { id: 'spiro', label: '2. Spirometry', icon: 'air', recorded: isSpiroRecorded(activeLabForm.spiro) },
                { id: 'audio', label: '3. Audiometry', icon: 'hearing', recorded: isAudioRecorded(activeLabForm.audio) },
                { id: 'vision', label: '4. Vision', icon: 'visibility', recorded: isVisionRecorded(activeLabForm.vision) },
                { id: 'drug', label: '5. Drug & Alcohol', icon: 'science', recorded: isDrugRecorded(activeLabForm.drug) },
                { id: 'xray', label: '6. Chest X-Ray', icon: 'radiology', recorded: isXrayRecorded(activeLabForm.xray) }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeModalTab === tab.id
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.recorded && (
                    <span className={`h-1.5 w-1.5 rounded-full ${activeModalTab === tab.id ? 'bg-white' : 'bg-emerald-500'}`}></span>
                  )}
                </button>
              ))}
            </div>

            {/* Modal Tab Body */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* TAB 1: CBC & Blood Chemistry */}
              {activeModalTab === 'cbc' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">Roche Cobas 6000 Auto-Analyzer Serum Metrics</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Enter laboratory venous blood draw findings.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Fasting Blood Glucose <span className="text-slate-400 font-normal">(Ref: 70 - 100 mg/dL)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 96 mg/dL"
                        value={activeLabForm.cbc.glucose}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          cbc: { ...activeLabForm.cbc, glucose: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Hemoglobin (Hb) <span className="text-slate-400 font-normal">(Ref: 13.8 - 17.2 g/dL)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 15.4 g/dL"
                        value={activeLabForm.cbc.hemoglobin}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          cbc: { ...activeLabForm.cbc, hemoglobin: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        Total Cholesterol <span className="text-slate-400 font-normal">(Ref: &lt; 200 mg/dL)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 188 mg/dL"
                        value={activeLabForm.cbc.cholesterol}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          cbc: { ...activeLabForm.cbc, cholesterol: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">
                        ALT / SGPT (Liver Enzyme) <span className="text-slate-400 font-normal">(Ref: 7 - 56 U/L)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 32 U/L"
                        value={activeLabForm.cbc.alt}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          cbc: { ...activeLabForm.cbc, alt: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Spirometry (PFT) */}
              {activeModalTab === 'spiro' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">NIOSH Spirometry Forced Vital Capacity</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pulmonary technician maneuver readings.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">FEV1 / FVC Ratio</label>
                      <input
                        type="text"
                        placeholder="e.g. 98% Normal"
                        value={activeLabForm.spiro.fev1Fvc}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          spiro: { ...activeLabForm.spiro, fev1Fvc: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Forced Vital Capacity (FVC)</label>
                      <input
                        type="text"
                        placeholder="e.g. 4.82L (102% pred)"
                        value={activeLabForm.spiro.fvc}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          spiro: { ...activeLabForm.spiro, fvc: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">FEV1 Reading</label>
                      <input
                        type="text"
                        placeholder="e.g. 3.94L (99% pred)"
                        value={activeLabForm.spiro.fev1}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          spiro: { ...activeLabForm.spiro, fev1: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Effort Quality Rating</label>
                      <select
                        value={activeLabForm.spiro.quality}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          spiro: { ...activeLabForm.spiro, quality: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
                      >
                        <option value="">Select Quality...</option>
                        <option value="Grade A Quality">Grade A Quality (Optimal Reproducibility)</option>
                        <option value="Grade B Quality">Grade B Quality (Acceptable)</option>
                        <option value="Sub-Optimal">Sub-Optimal (Borderline Effort)</option>
                        <option value="Repeat Needed">Repeat Needed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Audiometry */}
              {activeModalTab === 'audio' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">OSHA Hearing Conservation Baseline</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pure tone sound booth threshold measurements (500Hz - 8000Hz).</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Audiogram Threshold Summary</label>
                      <input
                        type="text"
                        placeholder="e.g. 500Hz - 8000Hz Bilateral ≤ 15dB loss"
                        value={activeLabForm.audio.threshold}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          audio: { ...activeLabForm.audio, threshold: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Hearing Clearance Status</label>
                      <select
                        value={activeLabForm.audio.status}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          audio: { ...activeLabForm.audio, status: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
                      >
                        <option value="">Select Clearance Status...</option>
                        <option value="Clear for High Noise Zones">Clear for High Noise Zones (Standard PPE)</option>
                        <option value="Dual Hearing Protection Required">Dual Hearing Protection Required (High Loss)</option>
                        <option value="Restricted from High Noise Areas">Restricted from High Noise Areas</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Vision & Color Plates */}
              {activeModalTab === 'vision' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">Snellen Visual Acuity & Ishihara Color Differentiation</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Required for logistics, equipment operation, and heavy fleet safety.</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Snellen Visual Acuity (Far & Near)</label>
                      <input
                        type="text"
                        placeholder="e.g. 20/20 Snellen (Bilateral)"
                        value={activeLabForm.vision.snellen}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          vision: { ...activeLabForm.vision, snellen: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Ishihara 14-Plate Test</label>
                      <input
                        type="text"
                        placeholder="e.g. Ishihara 14-Plate: 14/14 Cleared"
                        value={activeLabForm.vision.ishihara}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          vision: { ...activeLabForm.vision, ishihara: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Driving & Equipment Clearance</label>
                      <select
                        value={activeLabForm.vision.clearance}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          vision: { ...activeLabForm.vision, clearance: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
                      >
                        <option value="">Select Equipment Clearance...</option>
                        <option value="Heavy Fleet Authorized">Heavy Fleet Authorized (Commercial Valid)</option>
                        <option value="Corrective Lenses Mandatory">Corrective Lenses Mandatory</option>
                        <option value="Daylight Driving Only">Daylight Driving Only</option>
                        <option value="Restricted: No Heavy Machinery">Restricted: No Heavy Machinery</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Drug & Alcohol Toxicology */}
              {activeModalTab === 'drug' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">10-Panel Rapid Urine Toxicology & Evidential Breath Alcohol</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Strict chain of custody compliance under petrochemical safety mandates.</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">10-Panel Rapid Drug Screen</label>
                      <input
                        type="text"
                        placeholder="e.g. 10-Panel Rapid: NEGATIVE"
                        value={activeLabForm.drug.panel}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          drug: { ...activeLabForm.drug, panel: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Evidential Breathalyzer BAC %</label>
                      <input
                        type="text"
                        placeholder="e.g. Breath Alcohol: 0.000% BAC"
                        value={activeLabForm.drug.alcohol}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          drug: { ...activeLabForm.drug, alcohol: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Chain of Custody Standard</label>
                      <select
                        value={activeLabForm.drug.compliance}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          drug: { ...activeLabForm.drug, compliance: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
                      >
                        <option value="">Select Compliance State...</option>
                        <option value="SAMHSA Compliant">SAMHSA Compliant (Negative / Cleared)</option>
                        <option value="Non-Negative: Specimen Sent to Lab">Non-Negative: Specimen Sent to Lab for GC/MS</option>
                        <option value="Refusal to Test / Tampering">Refusal to Test / Tampering (Unfit)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: Radiology (Chest X-Ray) */}
              {activeModalTab === 'xray' && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                    <p className="font-bold text-slate-800">Chest Radiography (PA View)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Screening for occupational pneumoconiosis, active lesions, or cardiomegaly.</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">PA View Finding Summary</label>
                      <input
                        type="text"
                        placeholder="e.g. Normal Findings"
                        value={activeLabForm.xray.paView}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          xray: { ...activeLabForm.xray, paView: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Detailed Radiologist Impression</label>
                      <input
                        type="text"
                        placeholder="e.g. No active lesions or cardiomegaly"
                        value={activeLabForm.xray.findings}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          xray: { ...activeLabForm.xray, findings: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 font-mono font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Reporting Radiologist</label>
                      <input
                        type="text"
                        placeholder="e.g. Rad: Dr. Tariq Mansoor"
                        value={activeLabForm.xray.radiologist}
                        onChange={(e) => setActiveLabForm({
                          ...activeLabForm,
                          xray: { ...activeLabForm.xray, radiologist: e.target.value }
                        })}
                        className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
              <span className="text-[11px] text-slate-400">
                Data persists directly to candidate clearance record #{activeCandidate?.id}.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsClinicalModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingLab}
                  onClick={handleSaveLabResults}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-slate-900 cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  {savingLab && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                  <span>Save Diagnostics to Record</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE APPOINTMENT QUICK MODAL */}
      {apptModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                </span>
                <div>
                  <h3 className="font-display font-extrabold text-base text-slate-900">
                    Schedule Candidate Appointment
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentClinic.name} ({currentClinic.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApptModalId(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Candidate Details Card */}
            {schedulingReq && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    {schedulingReq.employee?.name || 'Worker'}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {schedulingReq.id}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  <span>Iqama: <strong className="text-slate-700">{schedulingReq.employee?.iqamaId || '—'}</strong></span>
                  <span>Badge: <strong className="text-slate-700">{schedulingReq.employee?.employeeNo || '—'}</strong></span>
                  <span>Protocol: <strong className="text-slate-700">{schedulingReq.test?.name || 'Occupational Fitness'}</strong></span>
                </div>
              </div>
            )}

            {/* Date Picker & Quick Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Appointment Date</label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setApptDate(new Date().toISOString().slice(0, 10))}
                    className="text-[10px] font-bold text-primary hover:underline px-1.5 py-0.5 rounded bg-primary/5 cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptDate(new Date(Date.now() + 86400000).toISOString().slice(0, 10))}
                    className="text-[10px] font-bold text-slate-600 hover:underline px-1.5 py-0.5 rounded bg-slate-100 cursor-pointer"
                  >
                    Tomorrow
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
              />
            </div>

            {/* Shift Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Clinic Shift Slot</label>
              <select
                value={apptShift}
                onChange={(e) => setApptShift(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary shadow-2xs bg-white cursor-pointer"
              >
                <option value="Morning (08:00 - 12:00)">Morning Shift (08:00 AM - 12:00 PM)</option>
                <option value="Afternoon (12:00 - 16:00)">Afternoon Shift (12:00 PM - 04:00 PM)</option>
                <option value="Evening (16:00 - 20:00)">Evening Shift (04:00 PM - 08:00 PM)</option>
              </select>
            </div>

            {/* Notes / Special Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Special Notes / Fasting Instructions</label>
              <input
                type="text"
                value={apptNote}
                onChange={(e) => setApptNote(e.target.value)}
                placeholder="e.g. 10hr fasting required for glucose & lipid profile"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-primary shadow-2xs"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApptModalId(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleScheduleAppt}
                disabled={!apptDate}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                Confirm Appointment Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK PDF FOLDER UPLOAD MODAL (AUTO-MATCHES BY IQAMA # IN FILENAME) */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">drive_folder_upload</span>
                  </div>
                  <h3 className="font-display font-extrabold text-lg text-slate-900">
                    Upload Medical Reports (Folder or Multi-PDF)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Upload PDF reports named after employee Iqama numbers (e.g., <span className="font-mono font-bold text-slate-800">2490184822.pdf</span>). The system matches each file to the corresponding employee and stores it in the database.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBulkUploadModalOpen(false);
                  setSelectedPdfFiles([]);
                  setUploadResult(null);
                }}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Ingestion Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Accredited Medical Center</label>
                {userRole === 'ADMIN' ? (
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                  >
                    {clinics.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full rounded-lg border border-slate-200 bg-slate-100 p-2 text-xs font-semibold text-slate-700">
                    {currentClinic.name} ({currentClinic.code})
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Name of Report / Test Protocol</label>
                <select
                  value={bulkTestId}
                  onChange={(e) => setBulkTestId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                >
                  {testsList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Issue Date</label>
                <input
                  type="date"
                  value={bulkIssueDate}
                  onChange={(e) => setBulkIssueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Validity Duration</label>
                <select
                  value={bulkValidityMonths}
                  onChange={(e) => setBulkValidityMonths(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-primary"
                >
                  <option value={12}>1 Year (12 Months)</option>
                  <option value={24}>2 Years - Petrochemical Standard (24 Months)</option>
                  <option value={36}>3 Years (36 Months)</option>
                  <option value={6}>6 Months (Conditional)</option>
                </select>
              </div>
            </div>

            {/* Folder / Files Selection Buttons */}
            <div className="space-y-3">
              <input
                ref={folderInputRef}
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as any)}
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []).filter((f) =>
                    f.name.toLowerCase().endsWith('.pdf')
                  );
                  setSelectedPdfFiles(files);
                  setUploadResult(null);
                }}
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedPdfFiles(files);
                  setUploadResult(null);
                }}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[32px] text-primary">folder_open</span>
                  <div className="text-center">
                    <p className="font-bold text-xs text-primary">Select Entire Folder</p>
                    <p className="text-[11px] text-slate-500">Auto-reads all PDFs inside the chosen directory</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[32px] text-slate-600">file_upload</span>
                  <div className="text-center">
                    <p className="font-bold text-xs text-slate-800">Select Multiple PDF Files</p>
                    <p className="text-[11px] text-slate-500">Pick individual PDF documents via file browser</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Staged Files Preview */}
            {selectedPdfFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Staged Files: <span className="text-primary">{selectedPdfFiles.length} PDFs</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedPdfFiles([])}
                    className="text-red-600 hover:text-red-700 font-semibold"
                  >
                    Clear All
                  </button>
                </div>

                <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50">
                  {selectedPdfFiles.map((file, idx) => {
                    const matchIqama = file.name.match(/\b\d{10}\b/)?.[0];
                    const matchedCandidate = candidates.find(c => c.iqamaId === matchIqama);

                    return (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="material-symbols-outlined text-[18px] text-red-500 shrink-0">
                            picture_as_pdf
                          </span>
                          <span className="font-mono font-medium text-slate-800 truncate">{file.name}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {matchIqama ? (
                            <span className="font-mono text-[11px] bg-slate-200 px-2 py-0.5 rounded text-slate-800 font-bold">
                              Iqama: {matchIqama}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                              No 10-digit Iqama in name
                            </span>
                          )}

                          {matchedCandidate ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold truncate max-w-[120px]">
                              {matchedCandidate.name}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold">
                              DB Search
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ingestion Results Banner */}
            {uploadResult && (
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                  <span>
                    Batch Ingestion Result: {uploadResult.matchedCount} of {uploadResult.totalFiles} matched & stored!
                  </span>
                </div>

                {uploadResult.unmatchedCount > 0 && (
                  <div className="pt-2 border-t border-emerald-200/60 text-slate-700">
                    <p className="font-bold text-amber-800 mb-1">
                      {uploadResult.unmatchedCount} Unmatched Files:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                      {uploadResult.unmatched.map((u: any, idx: number) => (
                        <li key={idx}>
                          <span className="font-mono font-bold">{u.filename}</span>: {u.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsBulkUploadModalOpen(false);
                  setSelectedPdfFiles([]);
                  setUploadResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                {uploadResult ? 'Done' : 'Cancel'}
              </button>

              {uploadResult ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkUploadModalOpen(false);
                    setSelectedPdfFiles([]);
                    setUploadResult(null);
                    setViewMode('table');
                  }}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-slate-900 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
                >
                  View Reports in Table
                </button>
              ) : (
                <button
                  type="button"
                  disabled={uploadingPdfs || selectedPdfFiles.length === 0}
                  onClick={handleBulkUpload}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all ${
                    uploadingPdfs || selectedPdfFiles.length === 0
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-primary hover:bg-slate-900 cursor-pointer'
                  }`}
                >
                  {uploadingPdfs && (
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                  )}
                  <span>
                    {uploadingPdfs ? 'Ingesting to Database...' : `Upload & Link ${selectedPdfFiles.length} Reports`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EMBEDDED PDF REPORT VIEWER MODAL */}
      {selectedPdfReport && (
        <PdfReportViewerModal
          report={selectedPdfReport}
          onClose={() => setSelectedPdfReport(null)}
        />
      )}

      {/* CONFIRM TEST & CERTIFICATE ISSUANCE MODAL */}
      {confirmCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">verified_user</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">
                    Confirm Medical Test & Certificate Issuance
                  </h3>
                  <p className="text-xs text-slate-400">
                    Review clinical test outcome before generating official gate-pass certificate
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmCandidate(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Candidate Info Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-teal-100 text-teal-900 font-extrabold text-sm flex items-center justify-center shrink-0">
                    {confirmCandidate.initials}
                  </span>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">{confirmCandidate.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      SAP: {confirmCandidate.employeeNo} &bull; Iqama: {confirmCandidate.iqamaId}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    {confirmCandidate.protocol}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {confirmCandidate.rawRequest?.vendor?.name || currentClinic.name}
                  </div>
                </div>
              </div>

              {/* Clinical Fitness Determination */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-2">
                  1. Clinical Fitness Determination
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmResult('FIT')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      confirmResult === 'FIT'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                      <span>Fit for Duty</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Unrestricted clearance</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmResult('CONDITIONAL')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      confirmResult === 'CONDITIONAL'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-amber-600">warning</span>
                      <span>Conditional</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Duty restrictions apply</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmResult('UNFIT')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      confirmResult === 'UNFIT'
                        ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-rose-600">cancel</span>
                      <span>Unfit</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Hold for re-test</div>
                  </button>
                </div>
              </div>

              {/* Doctor & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    2. Examining Physician
                  </label>
                  <input
                    type="text"
                    value={confirmDoctor}
                    onChange={(e) => setConfirmDoctor(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    3. Test Completed Date
                  </label>
                  <input
                    type="date"
                    value={confirmDate}
                    onChange={(e) => setConfirmDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Validity Term */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  4. Certificate Validity Term
                </label>
                <div className="flex items-center gap-2">
                  {['2 Years (Petro)', '1 Year (Std)', '6 Mo (Cond)'].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setConfirmValidityTerm(term)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer border ${
                        confirmValidityTerm === term
                          ? 'bg-teal-900 text-white border-teal-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  5. Clinical Remarks & Certification Notes
                </label>
                <textarea
                  rows={2}
                  value={confirmRemarks}
                  onChange={(e) => setConfirmRemarks(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* Certificate Generation Checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={shouldGenerateCertificate}
                  onChange={(e) => setShouldGenerateCertificate(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-teal-800 focus:ring-teal-700 cursor-pointer"
                />
                <div>
                  <div className="font-bold text-slate-900 text-xs">
                    Confirm test is completed and generate official Medical Fitness Certificate
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    If unchecked, the candidate will be kept in <strong>Pending Test Results</strong> status with no certificate issued.
                  </div>
                </div>
              </label>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setConfirmCandidate(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Keep as Pending Test Results
              </button>

              <button
                type="button"
                disabled={confirmingLoading}
                onClick={handleConfirmTestCompleted}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-800 hover:bg-teal-900 text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {shouldGenerateCertificate ? 'verified' : 'save'}
                </span>
                <span>
                  {confirmingLoading
                    ? 'Processing...'
                    : shouldGenerateCertificate
                    ? 'Confirm & Generate Certificate'
                    : 'Save as Pending Test Results'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL CERTIFICATE MODAL */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};
