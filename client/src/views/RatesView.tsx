import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/layout/HeroBanner';
import { StatCard } from '../components/ui/StatCard';
import { api } from '../api/client';

export const RatesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'bands' | 'sap'>('ledger');
  const [employees, setEmployees] = useState<any[]>([]);
  const [rates, setRates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [empRes, ratesRes] = await Promise.all([
        api.searchEmployees(''),
        api.getRates()
      ]);
      setEmployees(empRes.data.employees);
      setRates(ratesRes.data.rates);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredEmployees = employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          e.employeeNo.includes(searchQuery) ||
                          (e.position && e.position.toLowerCase().includes(searchQuery.toLowerCase()));
    if (deptFilter === 'All') return matchesSearch;
    return matchesSearch && (e.division === deptFilter || e.department === deptFilter);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Banner */}
      <HeroBanner
        title="Hourly Rates &"
        accentText="Disbursement Matrix"
        subtitle="Configure contracted workforce wage bands, manage individual trade rates, verify union overtime multipliers, and audit shift disbursement projections."
        telemetryChips={[
          { icon: 'calculate', text: 'Blended Avg: SAR 34.08/hr' },
          { icon: 'stacked_line_chart', text: 'Active Bands: 8 Trade Tiers' },
          { icon: 'trending_up', text: 'Standard Shift Burn: SAR 14,314/h', highlight: true }
        ]}
        actionButton={{
          label: 'Export Matrix',
          icon: 'download',
          onClick: () => alert('Exporting Wage & Rate Matrix to CSV/PDF')
        }}
      />

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          label="BLENDED AVERAGE RATE"
          value="SAR 34.08 / hr"
          trendText="+2.4% vs Q1"
          isPositiveTrend={true}
          icon="payments"
          ceilingPercent={76}
          targetText="420 Active Workforce"
        />

        <StatCard
          label="SHIFT BURN RATE (420 PAX)"
          value="SAR 14,314"
          trendText="Standard 8h Shift"
          isPositiveTrend={true}
          icon="timelapse"
          ceilingPercent={82}
          targetText="SAR 114,509 / day"
        />

        <StatCard
          label="WAGE BANDS & PARITY"
          value="8 Bands"
          trendText="100% GOSI"
          isPositiveTrend={true}
          icon="tune"
          ceilingPercent={100}
          targetText="Prevailing Cap: SAR 55.00 Max"
        />

        <StatCard
          label="PENDING RATE REVIEWS"
          value="2 Action Req."
          trendText="Awaiting HR Sign-off"
          isPositiveTrend={false}
          icon="assignment_late"
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          ceilingPercent={20}
          targetText="Filter Pending Queue ->"
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

        <div className="text-xs text-slate-400 font-mono">
          Site 04 Metro Terminal Labor Ledger
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
                <option value="All">All Departments</option>
                <option value="Trns & Lgst Dep">Trns & Lgst Dep</option>
                <option value="Project Service">Project Service</option>
                <option value="Finance Dept">Finance Dept</option>
                <option value="Inspection Serv">Inspection Serv</option>
              </select>

              <select className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-secondary shadow-sm">
                <option>All Wage Tiers</option>
                <option>Tier A (Leadership)</option>
                <option>Tier B (Senior Tech)</option>
                <option>Tier C (Standard)</option>
              </select>
            </div>
          </div>

          {/* Table */}
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
                {filteredEmployees.slice(0, 15).map(emp => {
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
                          onClick={() => alert(`Edit Rate Profile for ${emp.name}`)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">edit</span>
                          <span>Set / Edit Rate</span>
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
                  <th className="py-3 px-3 text-right">Valid Period</th>
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
                    <td className="py-2.5 px-3 text-right text-slate-400 font-mono text-[11px]">
                      2026-01-01 to 2026-12-31
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
