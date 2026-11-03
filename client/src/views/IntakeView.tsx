import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

export const IntakeView: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single Request State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState('5004955');
  const [clientSite, setClientSite] = useState('Sadara Complex (Jubail)');
  const [eligibility, setEligibility] = useState<any>(null);
  const [needByDate, setNeedByDate] = useState('');
  const [note, setNote] = useState('Annual gate pass medical clearance renewal');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Bulk Upload State
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkValidating, setBulkValidating] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState('');
  const [bulkModeTab, setBulkModeTab] = useState<'upload' | 'paste'>('upload');

  // Excel File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    loadTests();
    handleSelectBySAP('11000016');
  }, []);

  const loadTests = async () => {
    try {
      const res = await api.getTests();
      setTests(res.data.tests);
      if (res.data.tests.length > 0) {
        setSelectedTestId(res.data.tests[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      try {
        const res = await api.searchEmployees(val);
        setSearchResults(res.data.employees);
      } catch (e) {
        console.error(e);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectEmployee = (emp: any) => {
    setSelectedEmployee(emp);
    setSearchResults([]);
    setSearchQuery(`${emp.name} (${emp.employeeNo})`);
    checkEligibilityFor(emp.id, selectedTestId);
  };

  const handleSelectBySAP = async (sapId: string) => {
    try {
      const res = await api.searchEmployees(sapId);
      if (res.data.employees && res.data.employees.length > 0) {
        handleSelectEmployee(res.data.employees[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const checkEligibilityFor = async (empId: string, testId: string) => {
    try {
      const res = await api.checkEligibility(empId, testId);
      setEligibility(res.data.eligibility);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestChange = (tId: string) => {
    setSelectedTestId(tId);
    if (selectedEmployee) {
      checkEligibilityFor(selectedEmployee.id, tId);
    }
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee || !selectedTestId) return;

    try {
      setSubmitting(true);
      const res = await api.createRequest({
        employeeId: selectedEmployee.id,
        testId: selectedTestId,
        needByDate: needByDate || undefined,
        note: `[Site: ${clientSite}] ${note}`
      });
      setSuccessMessage(`Medical Request #${res.data.request.id} successfully queued for Central Team clinic triage!`);
      setTimeout(() => setSuccessMessage(''), 9000);
    } catch (e: any) {
      alert(`Submission failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // Excel File Parsing & Bulk Validation
  // ==========================================
  const validateParsedRows = async (rawRows: Array<{ employeeNo: string; testIdOrName: string; needBy: string; rowNote: string }>) => {
    setBulkValidating(true);
    setUploadError('');
    const parsed: any[] = [];

    for (let i = 0; i < rawRows.length; i++) {
      const item = rawRows[i];
      const { employeeNo, testIdOrName, needBy, rowNote } = item;

      // Find matched test
      const matchedTest = tests.find(t => 
        t.id === testIdOrName || 
        t.name.toLowerCase().includes(testIdOrName.toLowerCase())
      ) || tests[0];

      let employee = null;
      let status = 'INVALID_EMP';
      let message = 'Employee not found in HR master';

      if (employeeNo) {
        try {
          const res = await api.searchEmployees(employeeNo);
          if (res.data.employees && res.data.employees.length > 0) {
            employee = res.data.employees[0];
            status = 'READY';
            message = 'Ready for submission';

            // Check eligibility
            const eligRes = await api.checkEligibility(employee.id, matchedTest?.id || '5004959');
            if (eligRes.data?.eligibility && !eligRes.data.eligibility.isEligible) {
              status = 'DUPLICATE_WARN';
              message = eligRes.data.eligibility.message;
            }
          }
        } catch (e) {
          status = 'ERROR';
          message = 'Validation error';
        }
      }

      parsed.push({
        id: i + 1,
        employeeNo,
        employee,
        test: matchedTest,
        needBy,
        note: rowNote,
        status,
        message
      });
    }

    setBulkRows(parsed);
    setBulkValidating(false);
  };

  const processExcelFile = async (file: File) => {
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Please select a valid Excel spreadsheet (.xlsx, .xls) or .csv file.');
      return;
    }

    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    setUploadError('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setUploadError('The selected Excel workbook contains no worksheets.');
        return;
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

      if (!rawRows || rawRows.length === 0) {
        setUploadError('The selected Excel sheet appears to be empty.');
        return;
      }

      // Check if row 0 has header text
      let startIndex = 0;
      const firstRowStr = rawRows[0].map(c => String(c || '').toLowerCase()).join(' ');
      if (
        firstRowStr.includes('sap') || 
        firstRowStr.includes('iqama') || 
        firstRowStr.includes('test') || 
        firstRowStr.includes('employee') || 
        firstRowStr.includes('badge') ||
        firstRowStr.includes('code') ||
        firstRowStr.includes('name')
      ) {
        startIndex = 1;
      }

      const rowObjects: Array<{ employeeNo: string; testIdOrName: string; needBy: string; rowNote: string }> = [];
      for (let i = startIndex; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || row.length === 0) continue;

        const employeeNo = String(row[0] || '').trim();
        const testIdOrName = String(row[1] || '5004959').trim();
        let needBy = String(row[2] || '').trim();
        const rowNote = String(row[3] || 'Excel roster batch upload').trim();

        if (needBy) {
          const d = new Date(needBy);
          if (!isNaN(d.getTime())) {
            needBy = d.toISOString().slice(0, 10);
          }
        }

        if (employeeNo) {
          rowObjects.push({ employeeNo, testIdOrName, needBy, rowNote });
        }
      }

      if (rowObjects.length === 0) {
        setUploadError('No valid employee rows found in the sheet. Please ensure column 1 contains SAP IDs.');
        return;
      }

      // Populate text representation for clipboard transparency
      const textRepresentation = rowObjects.map(r => `${r.employeeNo}\t${r.testIdOrName}\t${r.needBy}\t${r.rowNote}`).join('\n');
      setBulkText(textRepresentation);

      // Trigger automatic validation
      await validateParsedRows(rowObjects);

    } catch (err: any) {
      console.error('Excel parse error:', err);
      setUploadError(`Failed to parse file: ${err.message || 'Corrupted or unsupported Excel structure'}`);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleClearUploadedFile = () => {
    setUploadedFileName('');
    setUploadedFileSize('');
    setUploadError('');
    setBulkText('');
    setBulkRows([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'SAP ID / Iqama': '11000016',
        'Test Code / Name': '5004955',
        'Need-By (YYYY-MM-DD)': '2026-11-20',
        'Purpose / Note': 'Sadara Turnaround Gate Pass'
      },
      {
        'SAP ID / Iqama': '11000012',
        'Test Code / Name': '5004959',
        'Need-By (YYYY-MM-DD)': '2026-11-15',
        'Purpose / Note': 'SABIC Gate Pass Renewal'
      },
      {
        'SAP ID / Iqama': '11000017',
        'Test Code / Name': '5004964',
        'Need-By (YYYY-MM-DD)': '2026-11-25',
        'Purpose / Note': 'PetroKemya Site Clearance'
      },
      {
        'SAP ID / Iqama': '11000008',
        'Test Code / Name': '5004959',
        'Need-By (YYYY-MM-DD)': '2026-11-10',
        'Purpose / Note': 'Sulaiman Active Turnaround'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 35 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ECC Clearance Roster');
    XLSX.writeFile(wb, 'ECC_Medical_Clearance_Roster_Template.xlsx');
  };

  // Bulk Upload Parsing from Clipboard Text
  const handleParseBulk = async () => {
    if (!bulkText.trim()) return;

    const lines = bulkText.trim().split('\n');
    const rowObjects = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(/[\t,;]+/).map(p => p.trim());
      const employeeNo = parts[0] || '';
      const testIdOrName = parts[1] || '5004959';
      const needBy = parts[2] || '';
      const rowNote = parts[3] || 'Bulk roster upload';

      if (employeeNo) {
        rowObjects.push({ employeeNo, testIdOrName, needBy, rowNote });
      }
    }

    await validateParsedRows(rowObjects);
  };

  const handleLoadSampleBulk = () => {
    const sample = `11000016\t5004955\t2026-11-20\tSadara Turnaround
11000012\t5004959\t2026-11-15\tSABIC Gate Pass
11000017\t5004964\t2026-11-25\tPetroKemya Site
11000008\t5004959\t2026-11-10\tSulaiman Active`;
    setBulkText(sample);
    setUploadedFileName('Sample_ECC_Roster.xlsx');
    setUploadedFileSize('4 sample records');
    setUploadError('');
  };

  const handleSubmitBulk = async () => {
    const validRows = bulkRows.filter(r => r.status === 'READY' || r.status === 'DUPLICATE_WARN');
    if (validRows.length === 0) {
      alert('No valid rows ready to submit.');
      return;
    }

    try {
      setBulkSubmitting(true);
      const payload = validRows.map(r => ({
        employeeNo: r.employee ? r.employee.employeeNo : r.employeeNo,
        testId: r.test ? r.test.id : '5004959',
        needByDate: r.needBy || undefined,
        note: r.note
      }));

      const res = await api.bulkCreateRequests(payload);
      setBulkSuccess(`Successfully uploaded and queued ${res.data.count} medical clearance requests to Central Team!`);
      setBulkRows([]);
      setBulkText('');
      setTimeout(() => setBulkSuccess(''), 9000);
    } catch (e: any) {
      alert(`Bulk submission failed: ${e.response?.data?.error || e.message}`);
    } finally {
      setBulkSubmitting(false);
    }
  };

  const selectedTestObj = tests.find(t => t.id === selectedTestId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header with Single / Bulk Pill Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary"></span>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Workforce Medical Clearance Intake
            </span>
          </div>
          <h2 className="font-display font-extrabold text-2xl text-slate-900 mt-0.5">
            New Clearance Request
          </h2>
          <p className="text-xs text-slate-500">
            Submit single employee gate pass clearance or batch-upload roster from Excel.
          </p>
        </div>

        {/* Mode Switcher Pill */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Single Request
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'bulk'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Bulk Excel / CSV Upload
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
            <span className="font-semibold">{successMessage}</span>
          </div>
          <span className="text-emerald-700 font-bold text-[11px]">Status: WAITING CENTRAL ASSIGNMENT</span>
        </div>
      )}

      {bulkSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">done_all</span>
            <span className="font-semibold">{bulkSuccess}</span>
          </div>
          <span className="text-emerald-700 font-bold text-[11px]">DISPATCHED TO CENTRAL TEAM</span>
        </div>
      )}

      {/* Mode 1: Single Request View */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Employee Civil & HR Record (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">badge</span>
                  <span>Employee Identification</span>
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectBySAP('11000016')}
                    className="text-[10.5px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 font-bold text-slate-600"
                  >
                    Dasan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectBySAP('11000008')}
                    className="text-[10.5px] px-2 py-0.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 font-bold text-amber-800"
                    title="Triggers duplicate warning"
                  >
                    Sulaiman
                  </button>
                </div>
              </div>

              {/* Autocomplete Search Bar */}
              <div className="relative mb-4">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Search by SAP ID or 10-Digit Saudi Iqama
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="e.g. 11000016 or 2239993609..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-secondary transition-all"
                  />
                </div>

                {/* Autocomplete Dropdown List */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full p-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{emp.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SAP: {emp.employeeNo} &bull; Iqama: {emp.iqamaId || 'GCC Citizen'}
                          </div>
                        </div>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                          {emp.division}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Employee Profile Summary */}
              {selectedEmployee ? (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#0A0F1D] text-secondary font-display font-extrabold text-base flex items-center justify-center shrink-0">
                      {selectedEmployee.name ? selectedEmployee.name[0] : 'E'}
                    </div>
                    <div>
                      <h4 className="font-display font-bold text-sm text-slate-900 leading-tight">
                        {selectedEmployee.name}
                      </h4>
                      <p className="text-xs text-slate-500">{selectedEmployee.position}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">SAP Badge</span>
                      <span className="font-mono font-bold text-slate-800">{selectedEmployee.employeeNo}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Saudi Iqama</span>
                      <span className="font-mono font-bold text-slate-800">{selectedEmployee.iqamaId || '2239993609'}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Division</span>
                      <span className="font-medium text-slate-800 truncate block">{selectedEmployee.division}</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cost Center</span>
                      <span className="font-mono font-bold text-slate-800">{selectedEmployee.costCenter || '0010000402'}</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                    <span className="text-slate-500">Nationality:</span>
                    <span className="font-bold text-slate-800">{selectedEmployee.nationality || 'Saudi / Expat'} &bull; Active Status</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  Select an employee to verify their civil credentials.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Medical Clearance Request Form (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            <form onSubmit={handleSubmitSingle} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
              <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">medical_services</span>
                <span>Test Package & Eligibility Pre-Check</span>
              </h3>

              {/* Target Site & Need-By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Target Site / Complex *
                  </label>
                  <select
                    value={clientSite}
                    onChange={(e) => setClientSite(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-secondary"
                  >
                    <option value="Sadara Complex (Jubail)">Sadara Chemical Complex (Jubail)</option>
                    <option value="SABIC Affiliates (Jubail/Yanbu)">SABIC Affiliates (Jubail / Yanbu)</option>
                    <option value="Saudi Aramco (Ras Tanura/Berri)">Saudi Aramco (Ras Tanura / Berri)</option>
                    <option value="PetroKemya Facilities">PetroKemya Petrochemical Plants</option>
                    <option value="Royal Commission Jubail Projects">Royal Commission Industrial Projects</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Need-By Date
                  </label>
                  <input
                    type="date"
                    value={needByDate}
                    onChange={(e) => setNeedByDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>

              {/* SAP Test Package */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SAP Medical Test Package *
                </label>
                <select
                  value={selectedTestId}
                  onChange={(e) => handleTestChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-secondary"
                >
                  {tests.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.id} — {t.name} ({t.validityMonths > 0 ? `${t.validityMonths} Months Validity` : 'One-off/swab'})
                    </option>
                  ))}
                </select>
                {selectedTestObj && (
                  <div className="mt-1 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>SAP Material Code: <strong className="text-slate-600 font-mono">{selectedTestObj.id}</strong></span>
                    <span>Accredited Clinics: <strong className="text-slate-600">{selectedTestObj.ratedClinics || 'BAK, GAMC'}</strong></span>
                  </div>
                )}
              </div>

              {/* Automated Eligibility Banner */}
              {eligibility && (
                <div>
                  {eligibility.isEligible ? (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0 mt-0.5">verified</span>
                      <div className="text-xs">
                        <div className="font-bold text-emerald-900">Eligible for Clearance</div>
                        <p className="text-emerald-700 mt-0.5">{eligibility.message}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-amber-600 text-[20px] shrink-0 mt-0.5">warning</span>
                      <div className="text-xs">
                        <div className="font-bold text-amber-900">Active Certificate Already on File (Duplicate Check)</div>
                        <p className="text-amber-800 mt-0.5">{eligibility.message}</p>
                        {eligibility.previousReport && (
                          <div className="mt-1.5 text-[10.5px] font-mono text-amber-900 bg-amber-100/70 p-1.5 rounded border border-amber-200">
                            Cert #{eligibility.previousReport.reportId} &bull; Valid Until: {eligibility.previousReport.validUntil.slice(0, 10)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Clearance Purpose & Notes
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Turnaround gate pass clearance, new contractor deployment..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-secondary"
                ></textarea>
              </div>

              {/* Submit Action */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Sends request to Central Team for hospital slot quota allocation
                </span>

                <button
                  type="submit"
                  disabled={submitting || !selectedEmployee}
                  className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      <span>Submit Clearance Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mode 2: Bulk Upload View */}
      {mode === 'bulk' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
            {/* Header & Main Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3 mb-5">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">table_chart</span>
                  <span>Bulk Request Intake (Excel Roster / CSV)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload an Excel spreadsheet (.xlsx, .xls) or paste roster rows. System validates SAP IDs, test codes, and certificate eligibility automatically.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download standard Excel roster template (.xlsx)"
                >
                  <span className="material-symbols-outlined text-[17px] text-emerald-600">download</span>
                  <span>Template (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Upload .xlsx or .xls file directly"
                >
                  <span className="material-symbols-outlined text-[17px]">upload_file</span>
                  <span>Upload Excel Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleBulk}
                  className="text-xs font-bold text-secondary bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-xl border border-orange-200 cursor-pointer"
                >
                  Load Sample Rows
                </button>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
            />

            {/* Upload Error Banner */}
            {uploadError && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-red-600 text-[20px]">error</span>
                  <span>{uploadError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadError('')}
                  className="text-red-500 hover:text-red-800 font-bold"
                >
                  &times;
                </button>
              </div>
            )}

            {/* Sub-Tabs: File Upload vs Clipboard Paste */}
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setBulkModeTab('upload')}
                className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  bulkModeTab === 'upload'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">attach_file</span>
                <span>Upload Excel File</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkModeTab('paste')}
                className={`text-xs font-bold pb-2 px-1 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  bulkModeTab === 'paste'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-[17px]">content_paste</span>
                <span>Paste from Clipboard / Text</span>
              </button>
            </div>

            {/* Expected Column Format Guide */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-700">Expected Column Order in Excel / CSV:</span>
                <span className="text-[11px] text-slate-400">Header row is detected and skipped automatically</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-600">
                <span className="p-1.5 rounded bg-white border border-slate-200 text-center font-bold">1. SAP ID / Iqama</span>
                <span className="p-1.5 rounded bg-white border border-slate-200 text-center font-bold">2. Test Code / Name</span>
                <span className="p-1.5 rounded bg-white border border-slate-200 text-center font-bold">3. Need-By (YYYY-MM-DD)</span>
                <span className="p-1.5 rounded bg-white border border-slate-200 text-center font-bold">4. Purpose / Note</span>
              </div>
            </div>

            {/* Tab 1: Upload Excel File Dropzone / Active File View */}
            {bulkModeTab === 'upload' && (
              <div>
                {uploadedFileName ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <span className="material-symbols-outlined text-[26px]">description</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{uploadedFileName}</span>
                          <span className="text-[10px] font-bold uppercase bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                            Parsed
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                          <span>Size: {uploadedFileSize}</span>
                          <span>&bull;</span>
                          <span>{bulkRows.length} rows loaded into batch preview</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Choose Different File
                      </button>
                      <button
                        type="button"
                        onClick={handleClearUploadedFile}
                        className="text-xs font-bold text-red-600 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/60'
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50/60 bg-white'
                    }`}
                  >
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-[26px]">upload_file</span>
                    </div>
                    <div className="font-bold text-sm text-slate-800">
                      Click to upload or drag & drop your Excel sheet
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Supports Microsoft Excel spreadsheets (.xlsx, .xls) and CSV roster exports up to 10MB
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[17px]">folder_open</span>
                        <span>Browse Excel Files</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Clipboard Paste Area */}
            {bulkModeTab === 'paste' && (
              <div className="space-y-2">
                <textarea
                  rows={5}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Paste rows here from Excel... (e.g. 11000016 [TAB] 5004955 [TAB] 2026-11-20 [TAB] Turnaround)"
                  className="w-full font-mono bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-secondary"
                ></textarea>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    {bulkText.trim().split('\n').filter(Boolean).length} rows detected in paste buffer
                  </span>

                  <button
                    type="button"
                    disabled={bulkValidating || !bulkText.trim()}
                    onClick={handleParseBulk}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bulkValidating ? (
                      <span>Validating against HR Master...</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">sync</span>
                        <span>Validate Rows</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Validating Progress Banner */}
            {bulkValidating && (
              <div className="mt-4 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
                <span className="h-4 w-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></span>
                <span className="font-semibold">
                  Validating employee SAP IDs against HR Master and running duplicate certificate checks...
                </span>
              </div>
            )}
          </div>

          {/* Validation Results Table */}
          {bulkRows.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900">
                    Validated Batch Preview ({bulkRows.length} Rows)
                  </h4>
                  <p className="text-xs text-slate-500">Review status before dispatching to Central Team.</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    {bulkRows.filter(r => r.status === 'READY').length} Ready
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    {bulkRows.filter(r => r.status === 'DUPLICATE_WARN').length} Duplicate Warnings
                  </span>
                  <button
                    type="button"
                    disabled={bulkSubmitting || bulkRows.filter(r => r.status === 'READY' || r.status === 'DUPLICATE_WARN').length === 0}
                    onClick={handleSubmitBulk}
                    className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-6 py-2 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {bulkSubmitting ? 'Uploading...' : 'Submit Valid Requests'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">SAP ID</th>
                      <th className="py-2.5 px-3">Matched Employee</th>
                      <th className="py-2.5 px-3">Test Package</th>
                      <th className="py-2.5 px-3">Need-By</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Eligibility Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bulkRows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{row.id}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{row.employeeNo}</td>
                        <td className="py-2.5 px-3">
                          {row.employee ? (
                            <div>
                              <div className="font-bold text-slate-900">{row.employee.name}</div>
                              <div className="text-[10.5px] text-slate-400">{row.employee.division}</div>
                            </div>
                          ) : (
                            <span className="text-red-500 font-medium">Unknown Employee</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{row.test?.name || 'Default Test'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Code: {row.test?.id}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono">{row.needBy || 'Standard'}</td>
                        <td className="py-2.5 px-3">
                          {row.status === 'READY' && (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                              Ready
                            </span>
                          )}
                          {row.status === 'DUPLICATE_WARN' && (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800">
                              Active Cert Exists
                            </span>
                          )}
                          {row.status === 'INVALID_EMP' && (
                            <span className="inline-block px-2 py-0.5 rounded font-bold text-[10px] bg-red-100 text-red-800">
                              Invalid ID
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-xs truncate" title={row.message}>
                          {row.message}
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
  );
};
