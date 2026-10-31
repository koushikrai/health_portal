import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/layout/HeroBanner';
import { api } from '../api/client';

export const SuppliersView: React.FC = () => {
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [activeTier, setActiveTier] = useState('All Tiers');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadClinics();
  }, []);

  const loadClinics = async () => {
    try {
      const res = await api.getClinics();
      setClinics(res.data.clinics);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredClinics = clinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.sapVendorNo && c.sapVendorNo.includes(searchQuery));
    if (activeTier === 'All Tiers') return matchesSearch;
    return matchesSearch && c.tier === activeTier;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Banner */}
      <HeroBanner
        title="Accredited Medical Providers &"
        accentText="SAP Test Rate Cards"
        subtitle="Commercial Registration (CR) verification, ZATCA e-Invoicing compliance, daily quota governance, and negotiated SAP medical test rate schedules."
        telemetryChips={[
          { icon: 'verified_user', text: `Approved Clinics: 5 Accredited` },
          { icon: 'payments', text: '44 SAP Contract Rates Loaded' },
          { icon: 'receipt', text: 'ZATCA 15% VAT & Net 30 Terms', highlight: true }
        ]}
        actionButton={{
          label: 'Export Rate Cards (PDF)',
          icon: 'download',
          onClick: () => window.print()
        }}
      />

      {/* Search Bar & Tier Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CR #, VAT Number, Company Name, SAP ID..."
            className="w-full bg-white border border-slate-300/80 rounded-xl pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-secondary shadow-sm text-slate-800"
          />
        </div>

        {/* Tier Pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold text-[11px]">Tier:</span>
          {['All Tiers', 'Tier 1 Primary', 'Tier 2 Subcontractor'].map(tier => (
            <button
              key={tier}
              onClick={() => setActiveTier(tier)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                activeTier === tier
                  ? 'bg-secondary text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tier === 'Tier 1 Primary' ? 'Tier 1' : (tier === 'Tier 2 Subcontractor' ? 'Tier 2' : tier)}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Column Supplier / Clinic Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredClinics.map(clinic => {
          const contract = clinic.contracts && clinic.contracts[0];
          const ratesCount = contract?.rates?.length || 0;

          return (
            <div
              key={clinic.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Card Top: Initials Avatar + Name + Badges */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3.5">
                    <div className="h-12 w-12 rounded-xl bg-slate-900 text-white font-display font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                      {clinic.code}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded">
                          {clinic.sapVendorNo ? `SAP-${clinic.sapVendorNo}` : `CODE-${clinic.code}`}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {clinic.tier || 'Tier 1 Primary'}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-base text-slate-900 mt-1">{clinic.name}</h4>
                    </div>
                  </div>

                  {/* Saudization Badge */}
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                      <span>Nitaqat: {clinic.saudization || 42.5}%</span>
                    </span>
                  </div>
                </div>

                {/* Metadata 2x2 Grid */}
                <div className="grid grid-cols-2 gap-3 py-3 my-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Commercial Registration (CR)</span>
                    <span className="font-mono font-bold text-slate-800">{clinic.crNumber || '2051028391'}</span>
                    <span className="text-[10px] text-slate-400 block">Exp: 2028-11-15</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">ZATCA Tax ID (VAT)</span>
                    <span className="font-mono font-bold text-slate-800">{clinic.vatNumber || '300412894400003'}</span>
                    <span className="text-[10px] text-emerald-600 font-semibold block">&bull; ZATCA Verified</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Contract</span>
                    <span className="font-bold text-slate-800">{contract ? `#${contract.contractNo}` : 'Direct Master Agreement'}</span>
                    <span className="text-[10px] text-slate-400 block">Terms: {contract?.paymentTerms || 30} Days ({contract?.invoicingType || 'Ariba portal'})</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Contracted Rate Schedule</span>
                    <span className="font-bold text-secondary">{ratesCount > 0 ? `${ratesCount} Rated SAP Tests` : '22 Standard Tests'}</span>
                    <span className="text-[10px] text-slate-400 block">Valid: 2026-01-01 to 2026-12-31</span>
                  </div>
                </div>

                {/* Authorized Classifications Pills */}
                <div className="my-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Authorized Test Classifications</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['Sadara Medical', 'SABIC Screening', 'PetroKemya N/S', 'Iqama Check', 'HSE Safety'].map(tag => (
                      <span key={tag} className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bank Details */}
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-slate-400">account_balance</span>
                    <span>Al Rajhi Bank &bull; SA44 8000 0412 8900 1489 21</span>
                  </div>
                  <span className="text-slate-400">Chamber: Eastern Province</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => alert(`Supplier Dossier for ${clinic.name}`)}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">folder_open</span>
                  <span>View Dossier</span>
                </button>
                <button
                  onClick={() => setSelectedClinic(clinic)}
                  className="bg-secondary hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">receipt</span>
                  <span>Rate Card</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rate Card Modal */}
      {selectedClinic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
                <div>
                  <h3 className="font-display font-bold text-sm">{selectedClinic.name} - Contracted Rate Schedule</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Contract: {selectedClinic.contracts?.[0]?.contractNo || '4620000325'} &bull; Net 30 Days</p>
                </div>
              </div>
              <button onClick={() => setSelectedClinic(null)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10.5px] uppercase font-bold text-slate-400">
                    <th className="pb-2">SAP Code</th>
                    <th className="pb-2">Test / Service Description</th>
                    <th className="pb-2">Validity</th>
                    <th className="pb-2 text-right">Rate (SAR)</th>
                    <th className="pb-2 text-right">VAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedClinic.contracts?.[0]?.rates?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono font-bold text-slate-900">{r.testId}</td>
                      <td className="py-2.5 font-medium text-slate-800">{r.test?.name || 'Standard Industrial Screening'}</td>
                      <td className="py-2.5 text-slate-500">{r.test?.validityMonths > 0 ? `${r.test.validityMonths} Months` : 'One-off'}</td>
                      <td className="py-2.5 font-bold font-mono text-secondary text-right">SAR {Number(r.rate).toFixed(2)}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-500">{r.includesVat ? 'Included' : '+15%'}</td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={5} className="py-4 text-center text-slate-400">No custom rate lines loaded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span>Prices governed under 2026 Procurement Agreement.</span>
              <button
                onClick={() => setSelectedClinic(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-1.5 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
