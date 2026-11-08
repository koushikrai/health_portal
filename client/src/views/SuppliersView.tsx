import React, { useState, useEffect } from 'react';
import { HeroBanner } from '../components/layout/HeroBanner';
import { api } from '../api/client';

export const SuppliersView: React.FC = () => {
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [dossierClinic, setDossierClinic] = useState<any>(null);
  const [activeTier, setActiveTier] = useState('All Tiers');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Clinic Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submittingClinic, setSubmittingClinic] = useState(false);
  const [formError, setFormError] = useState('');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formTier, setFormTier] = useState<'Tier 1 Primary' | 'Tier 2 Subcontractor'>('Tier 1 Primary');
  const [formSapVendorNo, setFormSapVendorNo] = useState('');
  const [formCrNumber, setFormCrNumber] = useState('');
  const [formVatNumber, setFormVatNumber] = useState('');
  const [formSaudization, setFormSaudization] = useState('42.5');
  const [formContractNo, setFormContractNo] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('30');
  const [formInvoicingType, setFormInvoicingType] = useState('Ariba portal');
  const [formNotes, setFormNotes] = useState('Accredited Industrial Medical Provider');

  useEffect(() => {
    loadClinics();
  }, []);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadClinics = async () => {
    try {
      const res = await api.getClinics();
      setClinics(res.data.clinics);
    } catch (e) {
      console.error(e);
    }
  };

  const openAddModal = () => {
    setFormName('');
    setFormCode('');
    setFormTier('Tier 1 Primary');
    setFormSapVendorNo('');
    setFormCrNumber('');
    setFormVatNumber('');
    setFormSaudization('40.0');
    setFormContractNo('');
    setFormPaymentTerms('30');
    setFormInvoicingType('Ariba portal');
    setFormNotes('Accredited Industrial Medical Provider');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formCode.trim()) {
      setFormError('Clinic name and 3-5 letter provider code are required.');
      return;
    }

    try {
      setSubmittingClinic(true);
      const res = await api.admin.createClinic({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        tier: formTier,
        sapVendorNo: formSapVendorNo.trim(),
        crNumber: formCrNumber.trim(),
        vatNumber: formVatNumber.trim(),
        saudization: parseFloat(formSaudization) || 40.0,
        contractNo: formContractNo.trim(),
        paymentTerms: parseInt(formPaymentTerms, 10) || 30,
        invoicingType: formInvoicingType,
        notes: formNotes
      });

      showToast('success', res.data?.message || `Successfully registered ${formName}!`);
      setIsAddModalOpen(false);
      await loadClinics();
    } catch (err: any) {
      setFormError(err.response?.data?.error || err.message || 'Failed to onboard new clinic.');
    } finally {
      setSubmittingClinic(false);
    }
  };

  const handleDeleteClinic = async (clinicId: string, clinicName: string) => {
    if (!window.confirm(`Are you sure you want to remove '${clinicName}' from the accredited provider registry?`)) {
      return;
    }

    try {
      const res = await api.admin.deleteClinic(clinicId);
      showToast('success', res.data?.message || `Successfully removed ${clinicName}.`);
      await loadClinics();
    } catch (err: any) {
      showToast('error', err.response?.data?.error || 'Failed to delete clinic.');
    }
  };

  const filteredClinics = clinics.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.sapVendorNo && c.sapVendorNo.includes(searchQuery)) ||
                          (c.crNumber && c.crNumber.includes(searchQuery)) ||
                          (c.vatNumber && c.vatNumber.includes(searchQuery));
    if (activeTier === 'All Tiers') return matchesSearch;
    return matchesSearch && c.tier === activeTier;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-lg border animate-in fade-in duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
              : 'bg-red-950 text-red-200 border-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {toastMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <HeroBanner
        title="Accredited Medical Providers &"
        accentText="SAP Test Rate Cards"
        subtitle="Commercial Registration (CR) verification, ZATCA e-Invoicing compliance, daily quota governance, and negotiated SAP medical test rate schedules."
        telemetryChips={[
          { icon: 'verified_user', text: `Approved Clinics: ${clinics.length} Accredited` },
          { icon: 'payments', text: `${clinics.reduce((sum, c) => sum + (c.contracts?.reduce((cs: number, con: any) => cs + (con.rates?.length || 0), 0) || 0), 0)} SAP Contract Rates Loaded` },
          { icon: 'receipt', text: 'ZATCA 15% VAT & Net 30 Terms', highlight: true }
        ]}
        actionButton={{
          label: 'Export Rate Cards (PDF)',
          icon: 'download',
          onClick: () => window.print()
        }}
      />

      {/* Search Bar, Add Clinic Action, and Tier Filter Pills */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CR #, VAT Number, Company Name, SAP ID..."
            className="w-full bg-white border border-slate-300/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:border-secondary shadow-sm text-slate-800"
          />
        </div>

        {/* Right Action Row: Add Clinic CTA + Tier Pills */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Add New Clinic Primary Button */}
          <button
            type="button"
            onClick={openAddModal}
            className="bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-orange-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_business</span>
            <span>+ Add New Clinic</span>
          </button>

          {/* Tier Pills */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl border border-slate-200">
            <span className="text-slate-500 font-bold text-[10.5px] px-2 uppercase">Tier:</span>
            {['All Tiers', 'Tier 1 Primary', 'Tier 2 Subcontractor'].map(tier => (
              <button
                key={tier}
                onClick={() => setActiveTier(tier)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                  activeTier === tier
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tier === 'Tier 1 Primary' ? 'Tier 1' : (tier === 'Tier 2 Subcontractor' ? 'Tier 2' : 'All Tiers')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2-Column Supplier / Clinic Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredClinics.map(clinic => {
          const contract = clinic.contracts && clinic.contracts[0];
          const ratesCount = contract?.rates?.length || 0;
          const isCustomAdded = clinic.id.startsWith('V') && parseInt(clinic.id.replace('V', ''), 10) > 5;

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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono font-bold bg-secondary/15 text-secondary px-2 py-0.5 rounded">
                          {clinic.sapVendorNo ? `SAP-${clinic.sapVendorNo}` : `CODE-${clinic.code}`}
                        </span>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {clinic.tier || 'Tier 1 Primary'}
                        </span>
                        {isCustomAdded && (
                          <span className="text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                            Custom Added
                          </span>
                        )}
                      </div>
                      <h4 className="font-display font-bold text-base text-slate-900 mt-1">{clinic.name}</h4>
                    </div>
                  </div>

                  {/* Saudization Badge */}
                  <div className="text-right shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
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
                    <span className="font-bold text-secondary">{ratesCount > 0 ? `${ratesCount} Rated SAP Tests` : '5 Standard Tests'}</span>
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
              <div className="flex items-center justify-between gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <div>
                  {isCustomAdded && (
                    <button
                      type="button"
                      onClick={() => handleDeleteClinic(clinic.id, clinic.name)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Delete custom provider"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDossierClinic(clinic)}
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
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* ADD NEW CLINIC MODAL                                                      */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-[#10192e] to-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">add_business</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base text-white">
                    Onboard Accredited Medical Provider
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Register a verified hospital/polyclinic, ZATCA tax credentials, and SAP master contract schedule.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateClinic} className="p-6 overflow-y-auto flex-1 space-y-5">
              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              {/* Section 1: Facility Identity */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">local_hospital</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    1. Healthcare Facility Information
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Clinic / Hospital Legal Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Al Mana General Hospital or Mouwasat Polyclinic"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Provider Code (3-5 Letters) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      placeholder="e.g. AMH, MOUW"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-900 uppercase focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Accreditation Tier
                    </label>
                    <select
                      value={formTier}
                      onChange={(e) => setFormTier(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    >
                      <option value="Tier 1 Primary">Tier 1 Primary (Direct Corporate Agreement)</option>
                      <option value="Tier 2 Subcontractor">Tier 2 Subcontractor (Industrial Affiliate)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SAP Vendor Account No.
                    </label>
                    <input
                      type="text"
                      value={formSapVendorNo}
                      onChange={(e) => setFormSapVendorNo(e.target.value)}
                      placeholder="e.g. 1001890"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Saudization / Nitaqat %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={formSaudization}
                      onChange={(e) => setFormSaudization(e.target.value)}
                      placeholder="42.5"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: ZATCA & Regulatory Compliance */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">verified</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    2. ZATCA Tax &amp; Commercial Compliance (Saudi Arabia)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Commercial Registration (CR) #
                    </label>
                    <input
                      type="text"
                      value={formCrNumber}
                      onChange={(e) => setFormCrNumber(e.target.value)}
                      placeholder="e.g. 2051028391 (10 digits)"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ZATCA Tax ID (15-Digit VAT #)
                    </label>
                    <input
                      type="text"
                      value={formVatNumber}
                      onChange={(e) => setFormVatNumber(e.target.value)}
                      placeholder="e.g. 300412894400003"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: SAP Master Contract */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                  <span className="material-symbols-outlined text-orange-600 text-[18px]">receipt_long</span>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    3. SAP Master Contract &amp; Financial Terms
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SAP Contract #
                    </label>
                    <input
                      type="text"
                      value={formContractNo}
                      onChange={(e) => setFormContractNo(e.target.value)}
                      placeholder="e.g. 4620000395"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Terms
                    </label>
                    <select
                      value={formPaymentTerms}
                      onChange={(e) => setFormPaymentTerms(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    >
                      <option value="30">Net 30 Days (Standard)</option>
                      <option value="45">Net 45 Days</option>
                      <option value="60">Net 60 Days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Invoicing Channel
                    </label>
                    <select
                      value={formInvoicingType}
                      onChange={(e) => setFormInvoicingType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                    >
                      <option value="Ariba portal">SAP Ariba Portal</option>
                      <option value="E-invoice email">ZATCA Compliant E-Invoice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operational Scope &amp; Notes
                  </label>
                  <input
                    type="text"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="e.g. Authorized for Jubail industrial medical screenings and Sadara clearance"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Standard benchmark rates will be automatically attached to this provider.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingClinic}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[17px]">add_business</span>
                    <span>{submittingClinic ? 'Registering...' : 'Register Accredited Provider'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW DOSSIER MODAL                                                        */}
      {/* ========================================================================= */}
      {dossierClinic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">verified_user</span>
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white">{dossierClinic.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">Dossier Ref: ECC-MED-VND-{dossierClinic.id}</p>
                </div>
              </div>
              <button onClick={() => setDossierClinic(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Commercial Registration (CR)</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{dossierClinic.crNumber || '2051028391'}</span>
                  <span className="text-[11px] text-emerald-700 font-semibold block">&bull; Active &amp; Valid in KSA</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">ZATCA Tax ID</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{dossierClinic.vatNumber || '300412894400003'}</span>
                  <span className="text-[11px] text-emerald-700 font-semibold block">&bull; ZATCA Phase-2 Compliant</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">SAP Vendor #</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{dossierClinic.sapVendorNo || 'N/A'}</span>
                  <span className="text-[11px] text-slate-500 block">ECC Group Approved</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Saudization / Nitaqat</span>
                  <span className="font-bold text-slate-900 text-sm">{dossierClinic.saudization || 42.5}%</span>
                  <span className="text-[11px] text-emerald-700 font-semibold block">&bull; High Green / Platinum Tier</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Chamber of Commerce &amp; Bank Endorsement</span>
                <p className="text-slate-700 leading-relaxed">
                  Attested by the <strong>Eastern Province Chamber of Commerce</strong>. Accredited for industrial workforce health testing under Saudi Aramco, SABIC, Sadara, and PetroKemya standards.
                </p>
                <div className="flex items-center gap-2 pt-1 text-slate-600 font-mono text-[11px]">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">account_balance</span>
                  <span>Al Rajhi Banking Corp &bull; IBAN: SA44 8000 0412 8900 1489 21</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setDossierClinic(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RATE CARD MODAL                                                           */}
      {/* ========================================================================= */}
      {selectedClinic && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
                <div>
                  <h3 className="font-display font-bold text-sm">{selectedClinic.name} - Contracted Rate Schedule</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Contract: {selectedClinic.contracts?.[0]?.contractNo || '4620000325'} &bull; Net 30 Days</p>
                </div>
              </div>
              <button onClick={() => setSelectedClinic(null)} className="text-slate-400 hover:text-white cursor-pointer">
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
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-1.5 rounded-xl cursor-pointer"
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
