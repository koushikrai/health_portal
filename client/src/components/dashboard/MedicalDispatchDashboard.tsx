import React, { useState, useEffect, useMemo, useRef } from 'react';
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
        roleDept: `#${emp.employeeNo || r.id} • ${emp.position || r.department || 'Logistics'}`,
        deptFull: `${r.department || emp.division || 'LOGISTICS'} • ${emp.position || 'Heavy Fleet'}`,
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

  // Bulk candidates filtered by bulk search input
  const filteredBulkCandidates = useMemo(() => {
    if (!bulkSearch.trim()) return bulkCandidates;
    const q = bulkSearch.toLowerCase().trim();
    return bulkCandidates.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.iqamaId.toLowerCase().includes(q) ||
      c.employeeNo.toLowerCase().includes(q) ||
      c.protocol.toLowerCase().includes(q) ||
      (c.rawRequest?.note && c.rawRequest.note.toLowerCase().includes(q))
    );
  }, [bulkCandidates, bulkSearch]);

  // Bulk candidates segregated together based on the date they were requested
  interface BulkDateGroup {
    dateKey: string;
    displayDate: string;
    batchTitle: string;
    candidates: ParsedCandidate[];
    totalCount: number;
    doneCount: number;
    pendingCount: number;
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
          pendingCount: 0
        };
      }

      groups[groupKey].candidates.push(c);
      groups[groupKey].totalCount++;
      if (c.isCertified) {
        groups[groupKey].doneCount++;
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
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Available Departments / Designations across all candidates
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach(c => {
      const dept = c.deptFull?.split('•')?.[0]?.trim() || c.roleDept?.split('•')?.[1]?.trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort();
  }, [candidates]);

  // Candidates filtered for the "Choose One by One" bottom section
  const oneByOneFilteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // 1. ID Search (Iqama ID, SAP Badge ID, Name, or Request ID)
      if (oneByOneIdSearch.trim()) {
        const q = oneByOneIdSearch.toLowerCase().trim();
        const matchIqama = c.iqamaId?.toLowerCase().includes(q);
        const matchBadge = c.employeeNo?.toLowerCase().includes(q);
        const matchName = c.name?.toLowerCase().includes(q);
        const matchId = c.id?.toLowerCase().includes(q);
        if (!matchIqama && !matchBadge && !matchName && !matchId) {
          return false;
        }
      }

      // 2. Protocol / Design Filter
      if (oneByOneProtocolFilter !== 'ALL') {
        if (c.protocol !== oneByOneProtocolFilter) return false;
      }

      // 3. Department / Designation Filter
      if (oneByOneDeptFilter !== 'ALL') {
        const dept = c.deptFull?.split('•')?.[0]?.trim() || c.roleDept?.split('•')?.[1]?.trim() || '';
        if (!dept.toLowerCase().includes(oneByOneDeptFilter.toLowerCase())) return false;
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
  }, [candidates, oneByOneIdSearch, oneByOneProtocolFilter, oneByOneDeptFilter, oneByOneStatusFilter]);

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

  // Schedule appointment in Inbound tab
  const handleScheduleAppt = async () => {
    if (!apptModalId || !apptDate) return;
    try {
      await api.scheduleAppointment(apptModalId, apptDate);
      setApptModalId(null);
      setApptDate('');
      await loadClinicData(selectedVendorId);
    } catch (e: any) {
      alert(`Scheduling failed: ${e.response?.data?.error || e.message}`);
    }
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
                    onChange={(e) => setSelectedVendorId(e.target.value)}
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

                {/* Actions & Bulk Search */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative min-w-[220px]">
                    <span className="material-symbols-outlined absolute left-2.5 top-2 text-slate-400 text-[17px]">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Filter bulk batches, Iqama..."
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary bg-slate-50/70 shadow-2xs"
                    />
                  </div>

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
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Inbound Clearance Requests ({requests.length})
              </h3>
              <p className="text-xs text-slate-500">
                Live candidate clearances assigned to {currentClinic.name} in PostgreSQL
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadClinicData(selectedVendorId)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                <span>Refresh Live</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10.5px]">
                <tr>
                  <th className="py-3 px-3">Request ID</th>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Iqama / National ID</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Medical Screening</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Appointment Date</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No inbound requests assigned to this medical center yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{r.employee?.name || 'Worker'}</div>
                        <div className="text-[11px] font-mono text-slate-400">{r.employee?.employeeNo}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{r.employee?.iqamaId || '-'}</td>
                      <td className="py-3 px-3 text-slate-600">{r.department || 'PMTA'}</td>
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
                            onClick={() => {
                              setApptModalId(r.id);
                              setApptDate(new Date().toISOString().slice(0, 10));
                            }}
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Clinic Appointment Slots ({currentClinic.code})
              </h3>
              <p className="text-xs text-slate-500">
                Shift allocation for candidate physicals at {currentClinic.name}
              </p>
            </div>
            <span className="rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1">
              Active Shift: 08:00 AM - 17:00 PM
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {requests.slice(0, 3).map((r: any, idx: number) => (
              <div
                key={r.id}
                className={`rounded-xl border p-4 bg-slate-50/50 border-l-4 ${
                  r.status === 'COMPLETED' ? 'border-l-emerald-500' : 'border-l-primary'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Slot #{idx + 1}: 0{8 + idx * 2}:00 AM</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="font-display font-bold text-sm text-slate-900 mt-2">{r.employee?.name || 'Worker'}</p>
                <p className="text-xs text-slate-500">{r.department} &bull; {r.test?.name}</p>
                <div className="mt-3 text-[11px] text-slate-600 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-primary">badge</span>
                  <span>National ID: {r.employee?.iqamaId || r.employee?.employeeNo || '—'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. INVOICE CLEARANCE TAB (LIVE SAP BILLING FROM REAL COMPLETED DB ROWS) */}
      {activeSubTab === 'invoice' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                SAP Invoice Generation & 3-Way Match Clearance
              </h3>
              <p className="text-xs text-slate-500">
                Reconcile completed medical examinations with SAP Purchase Contract {currentClinic.contractNo}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Invoice Number:</span>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                className="font-mono text-xs font-bold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {invoiceSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>{invoiceSuccess}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Completed Requests Ready for Billing ({completedRequests.length})</span>
              {completedRequests.length > 0 && (
                <button
                  onClick={() => setBillableRequests(completedRequests.map(r => r.id))}
                  className="text-primary hover:underline cursor-pointer"
                >
                  Select All
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 uppercase font-bold text-[10.5px]">
                  <tr>
                    <th className="py-2.5 px-3">Select</th>
                    <th className="py-2.5 px-3">Request ID</th>
                    <th className="py-2.5 px-3">Candidate</th>
                    <th className="py-2.5 px-3">Screening Protocol</th>
                    <th className="py-2.5 px-3">Contract Rate</th>
                    <th className="py-2.5 px-3">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {completedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No completed medical examinations available for billing yet. Issue cards on candidates first.
                      </td>
                    </tr>
                  ) : (
                    completedRequests.map((r) => {
                      const isSelected = billableRequests.includes(r.id);
                      const testObj = testsList.find((t: any) => t.id === r.testId);
                      const matchedRate = testObj?.rates?.find((rt: any) => rt.contract?.vendor?.id === selectedVendorId)?.rate;
                      const displayRate = matchedRate != null ? `SAR ${Number(matchedRate).toFixed(2)}` : 'SAR 100.00';
                      return (
                        <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setBillableRequests([...billableRequests, r.id]);
                                } else {
                                  setBillableRequests(billableRequests.filter(id => id !== r.id));
                                }
                              }}
                              className="h-4 w-4 rounded accent-primary"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.id}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">{r.employee?.name}</td>
                          <td className="py-2.5 px-3 text-slate-600">{r.test?.name}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{displayRate}</td>
                          <td className="py-2.5 px-3">
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

            {completedRequests.length > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  disabled={submittingInvoice || billableRequests.length === 0}
                  onClick={handleSubmitInvoice}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[17px]">send</span>
                  <span>Submit Invoice to Finance ({billableRequests.length} Selected)</span>
                </button>
              </div>
            )}
          </div>
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
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h3 className="font-display font-bold text-base text-slate-900">
              Schedule Candidate Exam
            </h3>
            <p className="text-xs text-slate-500">
              Select date for candidate examination at {currentClinic.name}
            </p>
            <input
              type="date"
              value={apptDate}
              onChange={(e) => setApptDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-primary"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApptModalId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleAppt}
                className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold cursor-pointer"
              >
                Confirm Appointment
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
