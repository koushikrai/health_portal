const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/views/IntakeView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add loadPreBookReservations, handlePreBookSubmit, loadBatches, toggleBatchExpand methods
const oldLoadTestsAnchor = '  const loadTests = async () => {';
const newMethods = `  const loadPreBookReservations = async () => {
    try {
      setPreBookLoading(true);
      const res = await api.getSlotQueue();
      if (res.data?.requests) {
        setPreBookList(res.data.requests);
      }
    } catch (e) {
      console.error('Failed to load pre-book reservations:', e);
    } finally {
      setPreBookLoading(false);
    }
  };

  const handlePreBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (preBookSlots <= 0) {
      alert('Please enter a valid number of slots (e.g. 50)');
      return;
    }

    try {
      setPreBookSubmitting(true);
      const res = await api.createSlotRequest({
        title: preBookTitle,
        department: preBookDept,
        plant: preBookPlant,
        requestedSlots: preBookSlots,
        needByDate: preBookNeedBy || undefined,
        note: preBookNote
      });

      setPreBookSuccess(\`Successfully submitted pre-booked reservation \${res.data?.slotRequest?.id || 'new'} for \${preBookSlots} workers! Dispatched to Central Medical Team for clinic allocation.\`);
      loadPreBookReservations();
      setTimeout(() => setPreBookSuccess(''), 9000);
    } catch (e: any) {
      alert(\`Pre-booking failed: \${e.response?.data?.error || e.message}\`);
    } finally {
      setPreBookSubmitting(false);
    }
  };

  const loadBatches = async () => {
    try {
      setBatchesLoading(true);
      const res = await api.getBatches();
      if (res.data?.batches) {
        setBatches(res.data.batches);
      }
    } catch (e) {
      console.error('Failed to load batches:', e);
    } finally {
      setBatchesLoading(false);
    }
  };

  const toggleBatchExpand = (batchId: string) => {
    setExpandedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const loadTests = async () => {`;

if (!content.includes('loadPreBookReservations')) {
  content = content.replace(oldLoadTestsAnchor, newMethods);
}

// 2. Also call loadPreBookReservations on initial mount
const oldInitialEffect = `  useEffect(() => {
    loadTests();
    handleSelectBySAP('11000016');
  }, []);`;

const newInitialEffect = `  useEffect(() => {
    loadTests();
    loadPreBookReservations();
    handleSelectBySAP('11000016');
  }, []);`;

if (content.includes(oldInitialEffect)) {
  content = content.replace(oldInitialEffect, newInitialEffect);
}

// 3. Update top switcher pill to include Pre-Book Slots and Bulk Batches
const oldSwitcher = `        {/* Mode Switcher Pill */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={\`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              mode === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }\`}
          >
            Single Request
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={\`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              mode === 'bulk'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }\`}
          >
            Bulk Excel / CSV Upload
          </button>
        </div>`;

const newSwitcher = `        {/* Mode Switcher Pill */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={\`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              mode === 'single'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }\`}
          >
            Single Request
          </button>
          <button
            type="button"
            onClick={() => setMode('bulk')}
            className={\`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer \${
              mode === 'bulk'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }\`}
          >
            Bulk Excel / CSV Upload
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('prebook');
              loadPreBookReservations();
            }}
            className={\`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
              mode === 'prebook'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-emerald-800 hover:bg-emerald-50'
            }\`}
          >
            <span className="material-symbols-outlined text-[15px]">calendar_month</span>
            <span>Pre-Book Slots (Undecided Staff)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('batches');
              loadBatches();
            }}
            className={\`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
              mode === 'batches'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }\`}
          >
            <span className="material-symbols-outlined text-[15px]">folder_special</span>
            <span>Bulk Batches Tracking</span>
          </button>
        </div>`;

if (content.includes(oldSwitcher)) {
  content = content.replace(oldSwitcher, newSwitcher);
}

// 4. End anchor replacement
const endAnchor = `        </div>
      )}
    </div>
  );
};`;

const addition = `        </div>
      )}

      {/* Mode 3: HR Pre-Book Slots (Undecided Workforce Quota) */}
      {mode === 'prebook' && (
        <div className="space-y-6">
          {preBookSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
                <span className="font-semibold">{preBookSuccess}</span>
              </div>
              <span className="text-emerald-700 font-bold text-[11px]">SENT TO CENTRAL MEDICAL TEAM</span>
            </div>
          )}

          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-[22px]">calendar_month</span>
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  Pre-Book Capacity Slots (When Employees Are Not Decided Yet)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                Pre-book screening slots for a target headcount (e.g. 50 workers) before specific employee names or Iqama IDs are finalized. The Central Medical Team will receive your request and assign clinic quotas across accredited medical centers.
              </p>
            </div>

            <form onSubmit={handlePreBookSubmit} className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Slots Needed (Headcount) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={preBookSlots}
                    onChange={(e) => setPreBookSlots(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">e.g. 50 workers for upcoming turnaround</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Test Protocol / Medical Exam *
                  </label>
                  <select
                    value={preBookTitle}
                    onChange={(e) => setPreBookTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="Sadara Medical">Sadara Medical (Annual Comprehensive)</option>
                    <option value="SABIC Medical Screening">SABIC Medical Screening with TSH</option>
                    <option value="Yanpet medical test">Yanpet petrochemical periodic test</option>
                    <option value="Ma'aden medical test (PSA above 40)">Ma&apos;aden medical test</option>
                    <option value="General medical fitness">General medical fitness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Department / Division *
                  </label>
                  <select
                    value={preBookDept}
                    onChange={(e) => setPreBookDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="PMTA">PMTA</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="LOGISTIC">LOGISTIC</option>
                    <option value="E&I">E&amp;I</option>
                    <option value="ISSD">ISSD</option>
                    <option value="VSD">VSD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Industrial Facility / Site
                  </label>
                  <input
                    type="text"
                    value={preBookPlant}
                    onChange={(e) => setPreBookPlant(e.target.value)}
                    placeholder="e.g. Sadara Complex (Jubail) or Yanpet Petrochemical"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                    Target Need-By Date
                  </label>
                  <input
                    type="date"
                    value={preBookNeedBy}
                    onChange={(e) => setPreBookNeedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">
                  Advance Justification / Notes for Central Medical Team
                </label>
                <textarea
                  rows={2}
                  value={preBookNote}
                  onChange={(e) => setPreBookNote(e.target.value)}
                  placeholder="e.g. Turnaround crew mobilization; final Iqama numbers will be provided once contractor gate pass list is confirmed."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white"
                ></textarea>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  Request will be routed to the <strong>Central Medical Team</strong> queue for clinic assignment.
                </span>

                <button
                  type="submit"
                  disabled={preBookSubmitting}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  <span>{preBookSubmitting ? 'Submitting Reservation...' : \`Submit \${preBookSlots}-Slot Request to Central Team\`}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active Pre-Booked Reservations Tracker */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-display font-bold text-base text-slate-900">
                  Active Pre-Booked Reservations &amp; Status ({preBookList.length})
                </h4>
                <p className="text-xs text-slate-500">
                  Track slot quotas requested by HR and clinic distribution confirmed by Central Medical Team.
                </p>
              </div>

              <button
                type="button"
                onClick={loadPreBookReservations}
                disabled={preBookLoading}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                title="Refresh Reservations"
              >
                <span className={\`material-symbols-outlined text-[18px] \${preBookLoading ? 'animate-spin' : ''}\`}>refresh</span>
              </button>
            </div>

            {preBookLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading reservations...</div>
            ) : preBookList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No pre-booked reservations found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-y border-slate-200 text-slate-500 uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Request ID</th>
                      <th className="py-2.5 px-3">Protocol &amp; Dept</th>
                      <th className="py-2.5 px-3">Facility</th>
                      <th className="py-2.5 px-3">Slots Quota</th>
                      <th className="py-2.5 px-3">Central Team Status</th>
                      <th className="py-2.5 px-3">Clinic Breakdown (Assigned by Central)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preBookList.map((item) => {
                      const totalAlloc = item.allocatedSlots || 0;
                      const isFull = totalAlloc >= item.requestedSlots;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.id}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                              {item.department}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">{item.plant || 'Standard'}</td>
                          <td className="py-2.5 px-3 font-mono font-extrabold text-slate-900">
                            {item.requestedSlots} slots
                          </td>
                          <td className="py-2.5 px-3">
                            {isFull ? (
                              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#DCFCE7] text-[#166534] border border-emerald-200">
                                Confirmed &amp; Dispatched
                              </span>
                            ) : totalAlloc > 0 ? (
                              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-amber-200">
                                Partially Allocated ({totalAlloc}/{item.requestedSlots})
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                Awaiting Central Team
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.activeAllocations && item.activeAllocations.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {item.activeAllocations.map((a: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10.5px] font-semibold"
                                  >
                                    {a.vendorName}: <strong className="text-emerald-800">{a.allocatedSlots}</strong>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">Pending Central clinic triage</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 4: Bulk Uploaded Batches Tracking */}
      {mode === 'batches' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-extrabold text-lg text-slate-900">
                  Bulk Uploaded Employee Batches Tracking
                </h3>
                <p className="text-xs text-slate-500">
                  View roster batches, monitor completion status, and review medical clearance certificates.
                </p>
              </div>

              <button
                type="button"
                onClick={loadBatches}
                disabled={batchesLoading}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                title="Refresh Batches"
              >
                <span className={\`material-symbols-outlined text-[18px] \${batchesLoading ? 'animate-spin' : ''}\`}>refresh</span>
              </button>
            </div>

            {batchesLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading bulk batches...</div>
            ) : batches.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No bulk upload batches found.</div>
            ) : (
              <div className="space-y-3">
                {batches.map((batch) => {
                  const isExpanded = expandedBatchIds.has(batch.id);
                  const progressPct = batch.totalEmployees > 0 ? Math.round((batch.doneCount / batch.totalEmployees) * 100) : 0;

                  return (
                    <div
                      key={batch.id}
                      className="border border-slate-200 rounded-2xl p-4 hover:border-slate-300 transition-all bg-white space-y-3"
                    >
                      <div
                        onClick={() => toggleBatchExpand(batch.id)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{batch.id}</span>
                            <span className="font-bold text-slate-800">&bull; {batch.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                              {batch.plant}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-3">
                            <span>Protocol: <strong className="text-slate-600">{batch.protocolType}</strong></span>
                            <span>Requested: <strong className="text-slate-600">{batch.requestedDate}</strong></span>
                            <span>Total: <strong className="text-slate-800">{batch.totalEmployees} Workers</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-800">
                              {batch.doneCount} of {batch.totalEmployees} Done ({progressPct}%)
                            </div>
                            <div className="w-32 bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all"
                                style={{ width: \`\${progressPct}%\` }}
                              ></div>
                            </div>
                          </div>

                          <span className="material-symbols-outlined text-[20px] text-slate-400">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded Employees List */}
                      {isExpanded && batch.employees && (
                        <div className="pt-3 border-t border-slate-100 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
                              <tr>
                                <th className="py-2 px-3">SAP ID</th>
                                <th className="py-2 px-3">Employee Name</th>
                                <th className="py-2 px-3">Iqama</th>
                                <th className="py-2 px-3">Department</th>
                                <th className="py-2 px-3">Assigned Clinic</th>
                                <th className="py-2 px-3">Card Status</th>
                                <th className="py-2 px-3 text-right">Medical Report Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {batch.employees.map((emp: any) => (
                                <tr key={emp.id} className="hover:bg-slate-50">
                                  <td className="py-2 px-3 font-mono font-bold text-slate-800">{emp.empNo}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-900">{emp.name}</td>
                                  <td className="py-2 px-3 font-mono text-slate-600">{emp.iqamaId || '-'}</td>
                                  <td className="py-2 px-3 text-slate-600">{emp.dept}</td>
                                  <td className="py-2 px-3 text-slate-700 font-medium">{emp.assignedClinicName || 'Unassigned'}</td>
                                  <td className="py-2 px-3">
                                    {emp.isCertified ? (
                                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                        Certified Fit
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-100 text-amber-800">
                                        Pending Exam
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedPdfReport({
                                        id: emp.reportId || 'REP-MOCK',
                                        employeeName: emp.name,
                                        iqamaNumber: emp.iqamaId || '2239993609',
                                        reportName: \`Medical Clearance - \${batch.protocolType}\`,
                                        issueDate: '2026-11-01',
                                        expiryDate: '2028-11-01',
                                        medicalCenterName: emp.assignedClinicName || 'Accredited Medical Center',
                                        pdfUrl: emp.pdfFileUrl || null
                                      })}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10.5px] cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">picture_as_pdf</span>
                                      <span>View Medical Report</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Report Viewer Modal */}
      <PdfReportViewerModal
        report={selectedPdfReport}
        isOpen={!!selectedPdfReport}
        onClose={() => setSelectedPdfReport(null)}
      />
    </div>
  );
};`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedAnchor = endAnchor.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedAnchor)) {
  console.error("Could not find normalizedAnchor in IntakeView.tsx");
  process.exit(1);
}

content = normalizedContent.replace(normalizedAnchor, addition);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully appended Pre-Book and Bulk Batches views to IntakeView.tsx!");
