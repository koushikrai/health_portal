const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/views/SlotPortalView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Target anchor start
const targetStartAnchor = '                  {queue.map((req) => {';
// Target anchor end
const targetEndAnchor = '                  })}\n                </div>\n              )}\n            </div>\n          )}\n\n          {/* TAB 2: ALLOCATIONS BY CLINIC */}';

const startIndex = content.indexOf(targetStartAnchor);
const endIndex = content.indexOf(targetEndAnchor);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end anchor for cards in SlotPortalView.tsx", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `                  {queue.map((req) => {
                    const currentAllocated = getCardAllocatedSum(req.id);
                    const isFullyAllocated = currentAllocated === req.requestedSlots;
                    const isOverAllocated = currentAllocated > req.requestedSlots;
                    const isSelected = selectedReqId === req.id;
                    const currentRows = cardClinicRows[req.id] || [];

                    return (
                      <div
                        key={req.id}
                        onClick={() => setSelectedReqId(isSelected ? null : req.id)}
                        className={\`bg-white border rounded-2xl p-5 shadow-2xs space-y-4 transition-all cursor-pointer \${
                          isSelected
                            ? 'border-emerald-600 ring-2 ring-emerald-600/10'
                            : 'border-slate-200 hover:border-slate-300'
                        }\`}
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
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#E6F3EE] text-[#14532D] border border-emerald-200">
                              {req.department}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              {req.requestedSlots} slots requested
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
                                setSelectedReqId(isSelected ? null : req.id);
                              }}
                              className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
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
                                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 pr-7 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer truncate disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-left disabled:bg-slate-50 disabled:cursor-not-allowed"
                                  />
                                </div>

                                {/* Quick Shortcuts when Central Team clicks/focuses */}
                                {isCentralOrAdmin && (
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleAssignAllToThisColumn(req.id, colIndex, req.requestedSlots)}
                                      className="hover:text-emerald-700 font-semibold hover:underline cursor-pointer"
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
                                className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-0.5 px-2 py-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
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
                                className="bg-[#184E42] hover:bg-[#123E34] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
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
                  })}`;

content = content.slice(0, startIndex) + replacement + content.slice(endIndex + '                  })'.length);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated SlotPortalView card layout to match screenshot with clinic dropdowns!");
