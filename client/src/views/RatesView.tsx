import React, { useState, useEffect, useRef } from 'react';
import { StatCard } from '../components/ui/StatCard';
import { api } from '../api/client';

export const RatesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'bands' | 'sap'>('ledger');
  const [employees, setEmployees] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');

  // Infinite Scroll State for Employee Ledger
  const [displayLimit, setDisplayLimit] = useState<number>(20);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Employee Profile & SAP Rate Edit Modal State
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<any | null>(null);
  const [loadingEmpDetail, setLoadingEmpDetail] = useState(false);
  const [editingSapRate, setEditingSapRate] = useState<{ contractId: string; testId: string; rate: number; includesVat: boolean; label: string } | null>(null);
  const [savingRate, setSavingRate] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [empRes, ratesRes, deptRes] = await Promise.all([
        api.searchEmployees('', 1000),
        api.getRates(),
        api.getDepartments()
      ]);
      setEmployees(empRes.data.employees || []);
      setRates(ratesRes.data.rates || []);
      setDepartments(deptRes.data.departments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInspectEmployee = async (emp: any) => {
    try {
      setLoadingEmpDetail(true);
      const res = await api.getEmployee(emp.id);
      setSelectedEmpDetail(res.data?.employee || emp);
    } catch (_) {
      setSelectedEmpDetail(emp);
    } finally {
      setLoadingEmpDetail(false);
    }
  };

  const handleSaveSapRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSapRate) return;
    try {
      setSavingRate(true);
      await api.admin.addContractRate({
        contractId: editingSapRate.contractId,
        testId: editingSapRate.testId,
        rate: Number(editingSapRate.rate),
        includesVat: editingSapRate.includesVat
      });
      await loadData();
      setToastMsg(`SAP Contract rate updated to SAR ${Number(editingSapRate.rate).toFixed(2)}`);
      setTimeout(() => setToastMsg(''), 4000);
      setEditingSapRate(null);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to update SAP contract rate');
    } finally {
      setSavingRate(false);
    }
  };

  const handleExportMatrix = () => {
    const headers = ['Clinic', 'SAP Material Code', 'Test Name', 'Contract No', 'Rate (SAR)', 'VAT Flag'];
    const rows = rates.map((r: any) => [
      r.contract?.vendor?.code || '',
      r.testId,
      `"${(r.test?.name || '').replace(/"/g, '""')}"`,
      r.contract?.contractNo || '',
      Number(r.rate).toFixed(2),
      r.includesVat ? 'VAT Included' : '+15% VAT'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `SAP_Rate_Disbursement_Matrix_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const avgHourlyRate = employees.length > 0
    ? employees.reduce((sum, e) => sum + Number(e.hourlyRate || 35), 0) / employees.length
    : 35.0;
  const shiftHourlyBurn = Math.round(avgHourlyRate * employees.length);
  const shiftDailyBurn = shiftHourlyBurn * 8;
  const avgSapTestRate = rates.length > 0
    ? rates.reduce((sum, r) => sum + Number(r.rate || 0), 0) / rates.length
    : 0;

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.employeeNo.includes(searchQuery) ||
                          (e.position && e.position.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = deptFilter === 'All' || e.division === deptFilter || e.department === deptFilter;
    const rate = Number(e.hourlyRate || 35.0);
    const tier = rate > 45 ? 'Tier A (Leadership)' : (rate > 35 ? 'Tier B (Senior Tech)' : 'Tier C (Standard)');
    const matchesTier = tierFilter === 'All Wage Tiers' || tierFilter === 'All' || tier === tierFilter;
    return matchesSearch && matchesDept && matchesTier;
  });

  // Reset display limit when search or filters change
  useEffect(() => {
    setDisplayLimit(20);
  }, [searchQuery, deptFilter, tierFilter]);

  // Load next batch
  const loadMore = () => {
    if (isLoadingMore || displayLimit >= filteredEmployees.length) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit((prev) => Math.min(prev + 20, filteredEmployees.length));
      setIsLoadingMore(false);
    }, 120);
  };

  // IntersectionObserver for bottom sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < filteredEmployees.length && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: '250px',
        threshold: 0.1
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [displayLimit, filteredEmployees.length, isLoadingMore]);

  // Window scroll fallback listener
  useEffect(() => {
    const handleScroll = () => {
      if (displayLimit >= filteredEmployees.length || isLoadingMore) return;
      const scrollY = window.scrollY || window.pageYOffset;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      if (windowHeight + scrollY >= documentHeight - 350) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayLimit, filteredEmployees.length, isLoadingMore]);

  const visibleEmployees = filteredEmployees.slice(0, displayLimit);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
          <span>{toastMsg}</span>
          <button onClick={() => setToastMsg('')} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* 1. Page Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-[22px] font-bold text-[#1B2430] tracking-tight">
          Hourly Rates &amp; Disbursement Matrix
        </h1>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="BLENDED AVERAGE RATE"
          value={`SAR ${avgHourlyRate.toFixed(2)} / hr`}
          trendText="Live Workforce Ledger"
          isPositiveTrend={true}
          icon="payments"
          ceilingPercent={76}
          targetText={`${employees.length} Active Workforce`}
        />

        <StatCard
          label={`SHIFT BURN RATE (${employees.length} PAX)`}
          value={`SAR ${shiftHourlyBurn.toLocaleString()}`}
          trendText="Standard 8h Shift"
          isPositiveTrend={true}
          icon="timelapse"
          ceilingPercent={82}
          targetText={`SAR ${shiftDailyBurn.toLocaleString()} / day`}
        />

        <StatCard
          label="DEPARTMENTS & WAGE BANDS"
          value={`${departments.length} Depts`}
          trendText="100% GOSI"
          isPositiveTrend={true}
          icon="tune"
          ceilingPercent={100}
          targetText="Prevailing Cap: SAR 55.00 Max"
        />

        <StatCard
          label="SAP CONTRACT TEST RATES"
          value={`${rates.length} Active`}
          trendText={`Avg SAR ${avgSapTestRate.toFixed(2)} / test`}
          isPositiveTrend={true}
          icon="receipt_long"
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          ceilingPercent={100}
          targetText="Verified SAP Ariba Schedule"
        />
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'ledger'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">badge</span>
            <span>Employee Rate Ledger ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sap')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'sap'
                ? 'bg-secondary text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
            <span>Clinic SAP Rate Cards ({rates.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
            title="Export SAP Rate Disbursement Matrix CSV"
          >
            <span className="material-symbols-outlined text-[15px]">download</span>
            <span>Export Matrix</span>
          </button>
          <div className="text-xs text-slate-400 font-mono">
            Site 04 Metro Terminal Labor Ledger
          </div>
        </div>
      </div>

      {/* View Mode 1: Employee Rate Ledger */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by worker name, ID (e.g. 11000008), trade..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-secondary shadow-sm"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-secondary shadow-sm"
              >
                <option value="All">All Departments ({departments.length})</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>

              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-secondary shadow-sm"
              >
                <option value="All">All Wage Tiers</option>
                <option value="Tier A (Leadership)">Tier A (Leadership)</option>
                <option value="Tier B (Senior Tech)">Tier B (Senior Tech)</option>
                <option value="Tier C (Standard)">Tier C (Standard)</option>
              </select>

              <div className="ml-auto text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                <span>Showing <strong className="text-slate-900">{visibleEmployees.length}</strong> of <strong className="text-slate-900">{filteredEmployees.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Table with Infinite Scroll */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                  <th className="py-3 px-4">Employee / Trade</th>
                  <th className="py-3 px-4">Department & Division</th>
                  <th className="py-3 px-4">Hourly Rate (Base)</th>
                  <th className="py-3 px-4">Overtime / Night Diff</th>
                  <th className="py-3 px-4">Est. Monthly (176H)</th>
                  <th className="py-3 px-4">Status / Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEmployees.map(emp => {
                  const rate = Number(emp.hourlyRate || 35.0);
                  const estMonthly = Math.round(rate * 176);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                            {emp.name[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{emp.name}</div>
                            <div className="text-[11px] text-slate-400">
                              <span className="font-mono text-secondary font-semibold">EMP-{emp.employeeNo}</span> &bull; {emp.position}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{emp.division || 'Corporate & Operations'}</div>
                        <div className="text-[11px] text-slate-400">{emp.department || 'Direct / In-House'}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-sm">SAR {rate.toFixed(2)} <span className="text-[10px] text-slate-400 font-normal">/hr</span></div>
                        <div className="text-[10px] text-slate-400 font-medium">{rate > 45 ? 'Tier A (Leadership)' : (rate > 35 ? 'Tier B (Senior Tech)' : 'Tier C (Standard)')}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-[11px] font-semibold text-slate-700">DT: 1.5x &bull; Night: +SAR 6/h</div>
                        <div className="text-[10px] text-slate-400">Hazard Pay: +SAR 8/h</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        SAR {estMonthly.toLocaleString()}
                        <span className="text-[10px] text-slate-400 font-normal block">Standard 176h Base</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          <span>Approved</span>
                        </span>
                        <div className="text-[9.5px] text-slate-400 mt-0.5">2026-01-15</div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspectEmployee(emp)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">visibility</span>
                          <span>{loadingEmpDetail && selectedEmpDetail?.id === emp.id ? 'Loading...' : 'Inspect Ledger'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredEmployees.length === 0 && (
              <div className="py-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">person_search</span>
                <p className="text-sm font-semibold text-slate-600">No employees found matching filter criteria</p>
              </div>
            )}

            {/* Infinite Scroll Sentinel & Loading Indicator */}
            {visibleEmployees.length < filteredEmployees.length && (
              <div
                ref={sentinelRef}
                className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/70"
              >
                <span className="h-4 w-4 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin"></span>
                <span className="font-semibold text-slate-700">Loading more employees... ({visibleEmployees.length} of {filteredEmployees.length} loaded)</span>
              </div>
            )}

            {/* End of ledger message */}
            {visibleEmployees.length >= filteredEmployees.length && filteredEmployees.length > 0 && (
              <div className="py-3 text-center text-[11px] text-slate-400 border-t border-slate-100 font-medium bg-slate-50/40">
                Showing all {filteredEmployees.length} employees &bull; End of ledger
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Mode 2: SAP Clinic Rates Matrix */}
      {activeSubTab === 'sap' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">2026 SAP Contracted Test Rate Schedules</h3>
              <p className="text-xs text-slate-400">Accredited medical center price schedules (Badr Al Khaleej vs. Gulf Asian)</p>
            </div>
            <span className="text-xs font-mono bg-secondary/10 text-secondary font-bold px-2.5 py-1 rounded-lg">
              {rates.length} Rates Loaded
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-500">
                  <th className="py-3 px-3">Clinic</th>
                  <th className="py-3 px-3">SAP Material Code</th>
                  <th className="py-3 px-3">Test Description</th>
                  <th className="py-3 px-3">Contract No.</th>
                  <th className="py-3 px-3 text-right">Contract Rate (SAR)</th>
                  <th className="py-3 px-3 text-right">VAT Flag</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {rates.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                        {r.contract?.vendor?.code}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{r.testId}</td>
                    <td className="py-2.5 px-3 text-slate-800 font-semibold">{r.test?.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{r.contract?.contractNo}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-secondary text-sm">
                      SAR {Number(r.rate).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        r.includesVat ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {r.includesVat ? 'VAT Included' : '+15% VAT'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setEditingSapRate({
                            contractId: r.contractId,
                            testId: r.testId,
                            rate: Number(r.rate),
                            includesVat: Boolean(r.includesVat),
                            label: `${r.contract?.vendor?.code || 'Clinic'} — ${r.test?.name || r.testId}`
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer"
                      >
                        Edit Rate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Ledger & Medical Clearance History Modal (Powered by GET /api/employees/:id) */}
      {selectedEmpDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-900">{selectedEmpDetail.name}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  EMP-{selectedEmpDetail.employeeNo} &bull; {selectedEmpDetail.department || 'Operations'} &bull; Iqama: {selectedEmpDetail.iqamaId || 'Verified'}
                </p>
              </div>
              <button onClick={() => setSelectedEmpDetail(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Position / Trade</span>
                <span className="font-bold text-slate-800">{selectedEmpDetail.position || 'Industrial Technician'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Nationality</span>
                <span className="font-bold text-slate-800">{selectedEmpDetail.nationality || 'SA / Expat Workforce'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase text-slate-500 block">
                Medical Clearance & Billing History ({selectedEmpDetail.requests?.length || 0} Records)
              </span>
              {selectedEmpDetail.requests && selectedEmpDetail.requests.length > 0 ? (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                  {selectedEmpDetail.requests.map((r: any) => (
                    <div key={r.id} className="p-2.5 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-800">{r.test?.name || r.testId}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.id} &bull; {r.vendor?.name || 'Unassigned'}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-700">{r.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                  No medical clearance requests recorded for this employee yet.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedEmpDetail(null);
                  setActiveSubTab('sap');
                }}
                className="px-3.5 py-1.5 rounded-lg bg-secondary text-white font-bold text-xs cursor-pointer"
              >
                View SAP Contract Rates
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmpDetail(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit SAP Contract Rate Modal (Powered by POST /api/admin/rates) */}
      {editingSapRate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveSapRate} className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-sm text-slate-900">Update SAP Contract Rate</h3>
              <button type="button" onClick={() => setEditingSapRate(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800">
              {editingSapRate.label} (SAP #{editingSapRate.testId})
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Contracted Rate (SAR) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={editingSapRate.rate}
                onChange={(e) => setEditingSapRate({ ...editingSapRate, rate: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono font-bold text-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sapVatIncluded"
                checked={editingSapRate.includesVat}
                onChange={(e) => setEditingSapRate({ ...editingSapRate, includesVat: e.target.checked })}
              />
              <label htmlFor="sapVatIncluded" className="font-semibold text-slate-700">
                Rate includes 15% ZATCA VAT
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingSapRate(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRate}
                className="px-4 py-1.5 rounded-lg bg-secondary text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {savingRate ? 'Saving...' : 'Save SAP Rate'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
