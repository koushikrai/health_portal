import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import { CertificateModal } from '../components/certificate/CertificateModal';
import { PdfReportViewerModal } from '../components/certificate/PdfReportViewerModal';

interface ReportsViewProps {
  onRenew?: (empNo: string, testId: string) => void;
  userRole?: string;
}

export const ReportsView: React.FC<ReportsViewProps> = () => {
  // Navigation View Switcher:
  // 'CLEARANCE_ROSTER' = Medical Clearance Master Roster (70 flat roster matching screenshot)
  // 'BATCH_DISPATCH'   = Batch-Wise Clearance Dispatch (grouped sets of employees by batch)
  // 'CERTIFICATE_ARCHIVE' = Archive of all medical certificates
  const [activeTab, setActiveTab] = useState<'CLEARANCE_ROSTER' | 'BATCH_DISPATCH' | 'CERTIFICATE_ARCHIVE'>('CLEARANCE_ROSTER');

  // Clearance Roster State
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    totalEmployees: 70,
    allCardsValid: 32,
    expiringWithin60: 20,
    hasExpiredCard: 18
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Filters for Master Roster
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedBatch, setSelectedBatch] = useState('ALL');

  // Filters for Batch-Wise View
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [selectedPlantFilter, setSelectedPlantFilter] = useState('ALL');
  const [batchSubFilter, setBatchSubFilter] = useState<Record<string, string>>({}); // batchId -> 'ALL' | 'DONE' | 'PENDING' | 'EXPIRING'
  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set(['REQ-2026-0104', 'REQ-2026-0101']));

  // Expanded Row IDs for Master Roster
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set(['E10208']));

  // Modals
  const [selectedPdfReport, setSelectedPdfReport] = useState<any>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);

  // Archive Reports State
  const [archiveReports, setArchiveReports] = useState<any[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState('ALL');

  useEffect(() => {
    loadClearanceData();
  }, []);

  const loadClearanceData = async (batchIdToLoad?: string) => {
    try {
      setLoading(true);
      const res = await api.getWorkforceClearance({
        batchId: (batchIdToLoad && batchIdToLoad !== 'ALL') ? batchIdToLoad : undefined
      });
      if (res.data) {
        setEmployees(res.data.employees || []);
        if (res.data.kpis) setKpis(res.data.kpis);
        if (res.data.departments) setDepartments(res.data.departments);
        if (res.data.batches) setBatches(res.data.batches);
      }
    } catch (e) {
      console.error('Failed to load clearance workforce roster:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadArchiveData = async () => {
    try {
      setArchiveLoading(true);
      const res = await api.getReports({
        result: archiveFilter === 'ALL' ? undefined : archiveFilter
      });
      setArchiveReports(res.data?.reports || []);
    } catch (e) {
      console.error('Failed to load certificate archive:', e);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'CERTIFICATE_ARCHIVE') {
      loadArchiveData();
    }
  }, [activeTab, archiveFilter]);

  // Toggle row expansion in Master Roster
  const toggleRow = (empId: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) {
        next.delete(empId);
      } else {
        next.add(empId);
      }
      return next;
    });
  };

  // Toggle batch card expansion in Batch-Wise View
  const toggleBatch = (batchId: string) => {
    setExpandedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const expandAllBatches = () => {
    setExpandedBatchIds(new Set(batches.map(b => b.id)));
  };

  const collapseAllBatches = () => {
    setExpandedBatchIds(new Set());
  };

  // Open PDF Viewer Modal for a specific card
  const handleViewCardReport = (emp: any, card: any) => {
    setSelectedPdfReport({
      employeeName: emp.name,
      reportName: card.name,
      iqamaId: emp.iqamaId || emp.id,
      issueDate: card.issued,
      expiryDate: card.validUntil,
      clinicName: card.clinicName || emp.assignedClinic || 'Accredited Medical Center',
      fileUrl: card.fileUrl
    });
  };

  // Open PDF Viewer Modal for an employee
  const handleViewEmployeeReport = (emp: any) => {
    const primaryCard = emp.medicalCards?.[0];
    if (primaryCard) {
      handleViewCardReport(emp, primaryCard);
    } else {
      setSelectedPdfReport({
        employeeName: emp.name,
        reportName: 'Occupational Medical Clearance Assessment',
        iqamaId: emp.iqamaId || emp.id,
        issueDate: '06 Nov 2026',
        expiryDate: '06 Nov 2027',
        clinicName: emp.assignedClinic || 'Accredited Medical Center',
        fileUrl: ''
      });
    }
  };

  // Filtered employees for Master Roster display
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchId = emp.id.toLowerCase().includes(q);
        const matchIqama = emp.iqamaId && emp.iqamaId.includes(q);
        const matchBatch = (emp.batchId && emp.batchId.toLowerCase().includes(q)) || (emp.batchName && emp.batchName.toLowerCase().includes(q));
        if (!matchName && !matchId && !matchIqama && !matchBatch) return false;
      }
      if (selectedDept !== 'ALL' && emp.dept !== selectedDept) {
        return false;
      }
      if (selectedStatus !== 'ALL' && emp.overall !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [employees, searchQuery, selectedDept, selectedStatus]);

  // Aggregate stats across all batches for Batch-Wise view header
  const batchAggregateKpis = useMemo(() => {
    const totalBatches = batches.length;
    let totalEmployees = 0;
    let totalDone = 0;
    let totalPending = 0;
    let totalExpiring = 0;

    batches.forEach(b => {
      totalEmployees += (b.totalEmployees || 0);
      totalDone += (b.doneCount || 0);
      totalPending += (b.pendingCount || 0);
      totalExpiring += (b.expiringSoonCount || 0);
    });

    return {
      totalBatches,
      totalEmployees,
      totalDone,
      totalPending,
      totalExpiring
    };
  }, [batches]);

  // Unique plants across all batches
  const availablePlants = useMemo(() => {
    const set = new Set<string>();
    batches.forEach(b => {
      if (b.plant) set.add(b.plant);
    });
    return Array.from(set);
  }, [batches]);

  // Filtered batches for Batch-Wise View
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (selectedPlantFilter !== 'ALL' && b.plant !== selectedPlantFilter) {
        return false;
      }
      if (batchSearchQuery.trim()) {
        const q = batchSearchQuery.toLowerCase().trim();
        const matchBatch = b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.plant.toLowerCase().includes(q);
        const matchEmp = (b.employees || []).some((e: any) =>
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          (e.iqamaId && e.iqamaId.includes(q))
        );
        if (!matchBatch && !matchEmp) return false;
      }
      return true;
    });
  }, [batches, selectedPlantFilter, batchSearchQuery]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-5">
      {/* 1. Module Header & Navigation Pill Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200/80 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-teal-800">verified_user</span>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Workforce Compliance Governance
            </span>
          </div>
          <h1 className="font-display font-extrabold text-xl lg:text-2xl text-slate-900 mt-0.5">
            Medical Clearance Master Roster
          </h1>
          <p className="text-xs text-slate-500">
            Real-time medical card validity tracking, gate-pass authorizations, and clinic-issued test reports.
          </p>
        </div>

        {/* 3-View Switcher Navigation Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs shrink-0 self-start sm:self-auto shadow-2xs">
          {/* Tab 1: Master Roster */}
          <button
            type="button"
            onClick={() => setActiveTab('CLEARANCE_ROSTER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'CLEARANCE_ROSTER'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[15px] text-teal-800">table_chart</span>
            <span>Medical Clearance</span>
          </button>

          {/* Tab 2: Batch-Wise Dispatch View */}
          <button
            type="button"
            onClick={() => setActiveTab('BATCH_DISPATCH')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'BATCH_DISPATCH'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[15px] text-teal-700">inventory_2</span>
            <span>Batch-Wise View</span>
            {batches.length > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-teal-100 text-teal-800">
                {batches.length}
              </span>
            )}
          </button>

          {/* Tab 3: Certificate Archive */}
          <button
            type="button"
            onClick={() => setActiveTab('CERTIFICATE_ARCHIVE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              activeTab === 'CERTIFICATE_ARCHIVE'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-[15px] text-slate-500">folder_shared</span>
            <span>Certificate Archive</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: MASTER ROSTER (MATCHING USER SCREENSHOT) */}
      {activeTab === 'CLEARANCE_ROSTER' && (
        <>
          {/* 4 TOP KPI SUMMARY CARDS (MATCHING SCREENSHOT) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total Employees */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="font-display font-extrabold text-3xl text-slate-900 tracking-tight leading-none">
                {kpis.totalEmployees}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Employees
              </div>
            </div>

            {/* Card 2: All cards valid */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="font-display font-extrabold text-3xl text-emerald-600 tracking-tight leading-none">
                {kpis.allCardsValid}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                All cards valid
              </div>
            </div>

            {/* Card 3: Expiring <=60 days */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="font-display font-extrabold text-3xl text-amber-500 tracking-tight leading-none">
                {kpis.expiringWithin60}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Expiring &le;60 days
              </div>
            </div>

            {/* Card 4: Has expired card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="font-display font-extrabold text-3xl text-rose-500 tracking-tight leading-none">
                {kpis.hasExpiredCard}
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Has expired card
              </div>
            </div>
          </div>

          {/* SEARCH & FILTER TOOLBAR (INCLUDES BATCH DROPDOWN) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              {/* Search name, ID, or Iqama... */}
              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700 shadow-2xs"
                />
              </div>

              {/* All Batches select dropdown */}
              <select
                value={selectedBatch}
                onChange={(e) => {
                  const bId = e.target.value;
                  setSelectedBatch(bId);
                  loadClearanceData(bId);
                }}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All batches &#8597;</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.id} &bull; {b.name} ({b.totalEmployees} staff)
                  </option>
                ))}
              </select>

              {/* All departments select */}
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All departments &#8597;</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* All statuses select */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All statuses &#8597;</option>
                <option value="VALID">Valid</option>
                <option value="EXPIRING_SOON">Expiring &le;60d</option>
                <option value="EXPIRED">Expired</option>
              </select>

              {/* Quick switch to Batch-Wise View button */}
              <button
                type="button"
                onClick={() => setActiveTab('BATCH_DISPATCH')}
                className="px-2.5 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                title="Switch to Grouped Batch-Wise View"
              >
                <span className="material-symbols-outlined text-[14px]">view_agenda</span>
                <span>Group by Batch</span>
              </button>
            </div>

            <div className="text-xs font-bold text-slate-500 shrink-0">
              {filteredEmployees.length} shown
            </div>
          </div>

          {/* HIGH-DENSITY MEDICAL CLEARANCE TABLE */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-xs text-slate-400 font-semibold">
                Loading medical clearance roster from database...
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400 font-semibold">
                No employees matching the selected criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-28">ID</th>
                      <th className="py-3 px-4 w-52">EMPLOYEE</th>
                      <th className="py-3 px-3 w-28">DEPT</th>
                      <th className="py-3 px-4">MEDICAL CARDS</th>
                      <th className="py-3 px-4 w-36">OVERALL</th>
                      <th className="py-3 px-4 text-right w-44">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredEmployees.map((emp) => {
                      const isExpanded = expandedRowIds.has(emp.id);

                      return (
                        <React.Fragment key={emp.id}>
                          {/* Parent Employee Row */}
                          <tr
                            onClick={() => toggleRow(emp.id)}
                            className={`hover:bg-slate-50/80 transition-colors cursor-pointer select-none ${
                              isExpanded ? 'bg-slate-50/40' : ''
                            }`}
                          >
                            {/* ID with Expand Chevron */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                                <span className="material-symbols-outlined text-[16px] text-slate-400">
                                  {isExpanded ? 'expand_more' : 'chevron_right'}
                                </span>
                                <span>{emp.id}</span>
                              </div>
                            </td>

                            {/* Employee Name + Batch Tag */}
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-900">{emp.name}</span>
                                {emp.batchId && emp.batchId !== 'BATCH-CORE' && (
                                  <div className="flex items-center gap-1">
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80"
                                      title={`Dispatched in Batch: ${emp.batchId} (${emp.batchName})`}
                                    >
                                      <span className="material-symbols-outlined text-[11px] text-teal-700">inventory_2</span>
                                      <span>{emp.batchId}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px]">
                                      {emp.plant}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>

                            {/* Department */}
                            <td className="py-3 px-3 font-semibold text-slate-700">
                              {emp.dept}
                            </td>

                            {/* Medical Cards Pill List */}
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {emp.medicalCards.map((card: any, idx: number) => {
                                  let pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
                                  if (card.status === 'EXPIRED') {
                                    pillStyle = 'bg-rose-50 text-rose-700 border-rose-200/80';
                                  } else if (card.status === 'EXPIRING_SOON') {
                                    pillStyle = 'bg-amber-50 text-amber-800 border-amber-200/80';
                                  }

                                  return (
                                    <span
                                      key={idx}
                                      title={`${card.name} (Valid until: ${card.validUntil})`}
                                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold border transition-transform hover:scale-105 cursor-pointer ${pillStyle}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewCardReport(emp, card);
                                      }}
                                    >
                                      {card.shortName}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>

                            {/* Overall Compliance Badge */}
                            <td className="py-3 px-4">
                              {emp.overall === 'VALID' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Valid
                                </span>
                              )}
                              {emp.overall === 'EXPIRING_SOON' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  Expiring &le;60d
                                </span>
                              )}
                              {emp.overall === 'EXPIRED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  Expired
                                </span>
                              )}
                            </td>

                            {/* Actions Column: View Medical Report Uploaded by Clinic */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleViewEmployeeReport(emp)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
                                  title="View Medical Report PDF uploaded by Clinic"
                                >
                                  <span className="material-symbols-outlined text-[15px] text-red-300">picture_as_pdf</span>
                                  <span>View Report</span>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* EXPANDED SUB-TABLE ACCORDION (MATCHING SCREENSHOT 2) */}
                          {isExpanded && (
                            <tr className="bg-slate-50/50 border-t border-b border-slate-200/80">
                              <td colSpan={6} className="p-3 sm:p-5 pl-4 sm:pl-10">
                                {/* Batch metadata banner if employee belongs to a batch */}
                                {emp.batchId && (
                                  <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-[18px] text-teal-800">local_shipping</span>
                                      <span className="text-slate-600">Dispatched under Batch:</span>
                                      <span className="font-mono font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded border border-teal-200">
                                        {emp.batchId}
                                      </span>
                                      <span className="font-bold text-slate-800">{emp.batchName}</span>
                                      <span className="text-slate-400">&bull;</span>
                                      <span className="text-slate-600">Facility: <strong className="text-slate-800">{emp.plant}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-slate-500">Assigned Clinic:</span>
                                      <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                                        {emp.assignedClinic || 'Accredited Medical Center'}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                                      <tr>
                                        <th className="py-2.5 px-4">MEDICAL CARD</th>
                                        <th className="py-2.5 px-3">VALIDITY</th>
                                        <th className="py-2.5 px-3">ISSUED</th>
                                        <th className="py-2.5 px-3">VALID UNTIL</th>
                                        <th className="py-2.5 px-3">DAYS LEFT</th>
                                        <th className="py-2.5 px-3">STATUS</th>
                                        <th className="py-2.5 px-4 text-right">ACTION</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {emp.medicalCards.map((card: any, cIdx: number) => {
                                        return (
                                          <tr key={cIdx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-2.5 px-4 font-semibold text-slate-800">
                                              <div className="flex items-center gap-2">
                                                <span>{card.name}</span>
                                                {card.clinicName && (
                                                  <span className="text-[10px] text-slate-400 font-normal">
                                                    ({card.clinicName})
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-600">{card.validity}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{card.issued}</td>
                                            <td className="py-2.5 px-3 text-slate-600">{card.validUntil}</td>
                                            <td className="py-2.5 px-3">
                                              <span
                                                className={`font-mono font-bold ${
                                                  card.daysLeft < 0
                                                    ? 'text-rose-600'
                                                    : card.daysLeft <= 60
                                                    ? 'text-amber-600'
                                                    : 'text-slate-700'
                                                }`}
                                              >
                                                {card.daysLeft}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-3">
                                              {card.status === 'VALID' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                  Valid
                                                </span>
                                              )}
                                              {card.status === 'EXPIRING_SOON' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                                  Expiring &le;60d
                                                </span>
                                              )}
                                              {card.status === 'EXPIRED' && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                  Expired
                                                </span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-right">
                                              <button
                                                type="button"
                                                onClick={() => handleViewCardReport(emp, card)}
                                                className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-[10.5px] inline-flex items-center gap-1 border border-teal-200 cursor-pointer shadow-2xs transition-colors"
                                              >
                                                <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                                                <span>View Report</span>
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: BATCH-WISE CLEARANCE DISPATCH (GROUPED BATCH VIEW FOR HR) */}
      {activeTab === 'BATCH_DISPATCH' && (
        <>
          {/* TOP 4 BATCH SUMMARY METRIC CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Active Clearance Batches */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <div className="font-display font-extrabold text-3xl text-slate-900 tracking-tight leading-none">
                  {batchAggregateKpis.totalBatches}
                </div>
                <span className="material-symbols-outlined text-teal-700 text-[24px]">inventory_2</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Active Clearance Batches
              </div>
            </div>

            {/* Card 2: Total Dispatched Workforce */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <div className="font-display font-extrabold text-3xl text-slate-900 tracking-tight leading-none">
                  {batchAggregateKpis.totalEmployees}
                </div>
                <span className="material-symbols-outlined text-slate-500 text-[24px]">groups</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Total Batch Workforce
              </div>
            </div>

            {/* Card 3: Cleared & Fit */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <div className="font-display font-extrabold text-3xl text-emerald-600 tracking-tight leading-none">
                  {batchAggregateKpis.totalDone}
                </div>
                <span className="material-symbols-outlined text-emerald-600 text-[24px]">verified</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Done & Medically Fit
              </div>
            </div>

            {/* Card 4: Pending Clinic Results */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition-shadow">
              <div className="flex items-center justify-between">
                <div className="font-display font-extrabold text-3xl text-amber-500 tracking-tight leading-none">
                  {batchAggregateKpis.totalPending}
                </div>
                <span className="material-symbols-outlined text-amber-500 text-[24px]">hourglass_top</span>
              </div>
              <div className="text-xs font-semibold text-slate-500 mt-2">
                Pending Clinic Results
              </div>
            </div>
          </div>

          {/* BATCH SEARCH & FACILITY FILTER TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative min-w-[240px]">
                <input
                  type="text"
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  placeholder="Search batch title, plant, or employee..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700 shadow-2xs"
                />
              </div>

              {/* Plant / Facility Filter */}
              <select
                value={selectedPlantFilter}
                onChange={(e) => setSelectedPlantFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-teal-700 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Industrial Facilities &#8597;</option>
                {availablePlants.map((plant) => (
                  <option key={plant} value={plant}>
                    {plant}
                  </option>
                ))}
              </select>

              {/* Expand / Collapse All Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={expandAllBatches}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                  <span>Expand All</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAllBatches}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">unfold_less</span>
                  <span>Collapse All</span>
                </button>
              </div>
            </div>

            <div className="text-xs font-bold text-slate-500 shrink-0">
              {filteredBatches.length} Batches &bull; {filteredBatches.reduce((acc, b) => acc + (b.totalEmployees || 0), 0)} Total Staff
            </div>
          </div>

          {/* BATCH CARDS LIST */}
          <div className="space-y-4">
            {filteredBatches.length === 0 ? (
              <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-400 font-semibold">
                No clearance batches match the search criteria.
              </div>
            ) : (
              filteredBatches.map((batch) => {
                const isExpanded = expandedBatchIds.has(batch.id);
                const currentSubFilter = batchSubFilter[batch.id] || 'ALL';

                // Filter batch employees based on inner filter pills
                const batchEmps = (batch.employees || []).filter((e: any) => {
                  if (currentSubFilter === 'DONE') return e.overall === 'VALID';
                  if (currentSubFilter === 'PENDING') return e.overall !== 'VALID';
                  if (currentSubFilter === 'EXPIRING') return e.overall === 'EXPIRING_SOON';
                  if (currentSubFilter === 'EXPIRED') return e.overall === 'EXPIRED';
                  return true;
                });

                return (
                  <div
                    key={batch.id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200"
                  >
                    {/* BATCH HEADER STRIP */}
                    <div
                      onClick={() => toggleBatch(batch.id)}
                      className="p-4 sm:p-5 hover:bg-slate-50/60 cursor-pointer select-none border-b border-slate-100 transition-colors"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-extrabold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200">
                              {batch.id}
                            </span>
                            <span className="text-slate-300">&bull;</span>
                            <h2 className="font-display font-extrabold text-base text-slate-900">
                              {batch.name}
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {batch.plant}
                            </span>
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              {batch.protocolType}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                            <span>
                              Requested: <strong className="text-slate-700">{batch.requestedDate}</strong>
                            </span>
                            <span>&bull;</span>
                            <span>
                              Assigned Clinic: <strong className="text-teal-800">{batch.assignedClinic}</strong>
                            </span>
                            <span>&bull;</span>
                            <span>
                              Total Staff: <strong className="text-slate-800">{batch.totalEmployees} employees</strong>
                            </span>
                          </div>
                        </div>

                        {/* Progress Metrics & Expand Icon */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="material-symbols-outlined text-[14px] text-emerald-600">check_circle</span>
                              <span>{batch.doneCount} Cleared</span>
                            </span>

                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <span className="material-symbols-outlined text-[14px] text-amber-600">hourglass_top</span>
                              <span>{batch.pendingCount} Pending</span>
                            </span>
                          </div>

                          <div className="hidden sm:flex flex-col items-end gap-1 w-28">
                            <span className="text-[11px] font-bold text-slate-600">
                              {batch.completionRate}% Done
                            </span>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                                style={{ width: `${batch.completionRate}%` }}
                              />
                            </div>
                          </div>

                          <span className="material-symbols-outlined text-slate-400 text-[20px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* EXPANDED BATCH EMPLOYEE ROSTER */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 bg-slate-50/40 space-y-3">
                        {/* Inner Quick Filter Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Filter Batch:</span>
                            <button
                              type="button"
                              onClick={() => setBatchSubFilter(prev => ({ ...prev, [batch.id]: 'ALL' }))}
                              className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                                currentSubFilter === 'ALL'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              All ({batch.totalEmployees})
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchSubFilter(prev => ({ ...prev, [batch.id]: 'DONE' }))}
                              className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                                currentSubFilter === 'DONE'
                                  ? 'bg-emerald-700 text-white'
                                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                              }`}
                            >
                              Cleared & Fit ({batch.doneCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setBatchSubFilter(prev => ({ ...prev, [batch.id]: 'PENDING' }))}
                              className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                                currentSubFilter === 'PENDING'
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                              }`}
                            >
                              Pending Results ({batch.pendingCount})
                            </button>
                            {batch.expiringSoonCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setBatchSubFilter(prev => ({ ...prev, [batch.id]: 'EXPIRING' }))}
                                className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                                  currentSubFilter === 'EXPIRING'
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                                }`}
                              >
                                Expiring &le;60d ({batch.expiringSoonCount})
                              </button>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 font-semibold">
                            Showing {batchEmps.length} of {batch.totalEmployees} employees in this batch
                          </div>
                        </div>

                        {/* Batch Employees High-Density Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                              <tr>
                                <th className="py-2.5 px-3 w-12 text-center">#</th>
                                <th className="py-2.5 px-3 w-28">EMPLOYEE ID</th>
                                <th className="py-2.5 px-4 w-44">EMPLOYEE NAME</th>
                                <th className="py-2.5 px-3 w-24">DEPT</th>
                                <th className="py-2.5 px-4">MEDICAL CARDS / PROTOCOL</th>
                                <th className="py-2.5 px-3 w-32">CLEARANCE STATUS</th>
                                <th className="py-2.5 px-4 text-right w-40">ACTIONS</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium">
                              {batchEmps.map((emp: any, idx: number) => {
                                return (
                                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                                      {idx + 1}
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                      {emp.id}
                                    </td>
                                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                                      {emp.name}
                                    </td>
                                    <td className="py-2.5 px-3 font-semibold text-slate-700">
                                      {emp.dept}
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        {(emp.medicalCards || []).map((card: any, cIdx: number) => {
                                          let pillStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
                                          if (card.status === 'EXPIRED') {
                                            pillStyle = 'bg-rose-50 text-rose-700 border-rose-200/80';
                                          } else if (card.status === 'EXPIRING_SOON') {
                                            pillStyle = 'bg-amber-50 text-amber-800 border-amber-200/80';
                                          }
                                          return (
                                            <span
                                              key={cIdx}
                                              title={`${card.name} (${card.validity})`}
                                              onClick={() => handleViewCardReport(emp, card)}
                                              className={`px-2 py-0.5 rounded text-[10.5px] font-bold border transition-transform hover:scale-105 cursor-pointer ${pillStyle}`}
                                            >
                                              {card.shortName}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      {emp.overall === 'VALID' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          Valid
                                        </span>
                                      )}
                                      {emp.overall === 'EXPIRING_SOON' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                          Expiring &le;60d
                                        </span>
                                      )}
                                      {emp.overall === 'EXPIRED' && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                          Expired
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-2.5 px-4 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleViewEmployeeReport(emp)}
                                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] inline-flex items-center gap-1.5 shadow-2xs hover:shadow-xs transition-colors cursor-pointer"
                                        title="View official Clinic Medical Test Report"
                                      >
                                        <span className="material-symbols-outlined text-[14px] text-red-300">picture_as_pdf</span>
                                        <span>View Report</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* VIEW 3: CERTIFICATE ARCHIVE */}
      {activeTab === 'CERTIFICATE_ARCHIVE' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
            <div>
              <h2 className="font-display font-extrabold text-base text-slate-900">
                Official Medical Certificate Archive
              </h2>
              <p className="text-xs text-slate-500">
                Explore, verify, and export certified medical fitness reports submitted by authorized clinics.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={archiveFilter}
                onChange={(e) => setArchiveFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-teal-700 cursor-pointer"
              >
                <option value="ALL">All Evaluation Results &#8597;</option>
                <option value="FIT">Fit for Employment</option>
                <option value="UNFIT">Unfit</option>
                <option value="FIT_WITH_RESTRICTION">Fit with Restrictions</option>
              </select>
            </div>
          </div>

          {archiveLoading ? (
            <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
              Loading certificate archive...
            </div>
          ) : archiveReports.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
              No certificates recorded for the selected filter.
            </div>
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">CERTIFICATE ID</th>
                    <th className="py-3 px-4">EMPLOYEE</th>
                    <th className="py-3 px-4">TEST PROTOCOL</th>
                    <th className="py-3 px-4">CLINIC VENDOR</th>
                    <th className="py-3 px-4">TEST DATE</th>
                    <th className="py-3 px-4">RESULT</th>
                    <th className="py-3 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {archiveReports.map((report) => (
                    <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-800">
                        {report.id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{report.employee?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {report.employee?.employeeNo} {report.employee?.iqamaId ? `• ${report.employee.iqamaId}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{report.test?.name}</td>
                      <td className="py-3 px-4 text-slate-700">{report.vendor?.name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {report.testDate ? new Date(report.testDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            report.result === 'FIT'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : report.result === 'UNFIT'
                              ? 'bg-rose-50 text-rose-800 border border-rose-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {report.result}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPdfReport({
                                employeeName: report.employee?.name,
                                reportName: report.test?.name,
                                iqamaId: report.employee?.iqamaId || report.employee?.employeeNo,
                                issueDate: report.testDate ? new Date(report.testDate).toLocaleDateString('en-GB') : '06 Nov 2026',
                                expiryDate: report.validUntil ? new Date(report.validUntil).toLocaleDateString('en-GB') : null,
                                clinicName: report.vendor?.name || 'Accredited Medical Center',
                                fileUrl: report.fileUrl
                              });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[13px] text-red-300">picture_as_pdf</span>
                            <span>View Report</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const certRes = await api.getCertificate(report.id);
                                setSelectedCertificate(certRes.data.certificate);
                              } catch (e: any) {
                                alert(`Failed to load certificate: ${e.message}`);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">badge</span>
                            <span>Certificate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Embedded PDF Report Viewer Modal */}
      {selectedPdfReport && (
        <PdfReportViewerModal
          report={selectedPdfReport}
          onClose={() => setSelectedPdfReport(null)}
        />
      )}

      {/* Official Certificate Modal */}
      {selectedCertificate && (
        <CertificateModal
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};