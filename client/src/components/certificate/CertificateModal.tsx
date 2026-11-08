import React from 'react';

interface CertificateModalProps {
  certificate: {
    certificateNo: string;
    requestId: string;
    employeeName: string;
    employeeNo: string;
    iqamaId?: string;
    nationality: string;
    division?: string;
    department?: string;
    position?: string;
    clinicName: string;
    clinicCode: string;
    sapVendorNo?: string;
    testName: string;
    sapMaterialCode: string;
    result: string;
    testDate: string;
    validUntil?: string;
    remarks: string;
    examiningPhysician: string;
  } | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  if (!certificate) return null;

  const isFit = certificate.result === 'FIT' || certificate.result === 'ISSUED';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
            <span className="font-display font-bold text-sm tracking-wide">
              Official Medical Clearance Certificate #{certificate.certificateNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-secondary hover:bg-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">print</span>
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Certificate Printable Area */}
        <div className="p-8 bg-white print:p-0">
          <div className="border-4 border-double border-slate-300 p-6 rounded-xl relative">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
              <span className="font-display font-black text-8xl text-slate-900 rotate-[-30deg]">EXPERTISE</span>
            </div>

            {/* Certificate Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 mb-6">
              <div>
                <div className="font-display font-black text-xl text-slate-900 tracking-tight">EXPERTISE CONTRACTING COMPANY</div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Corporate Occupational Health & Safety Bureau</div>
                <div className="text-[11px] text-slate-400">Kingdom of Saudi Arabia &bull; Jubail Industrial City</div>
              </div>
              <div className="text-right">
                <span className="bg-secondary text-white text-xs font-black px-2 py-1 rounded">ECC-HSE</span>
                <div className="text-[10px] font-mono text-slate-400 mt-1">REF: {certificate.certificateNo}</div>
              </div>
            </div>

            {/* Certificate Title */}
            <div className="text-center my-4">
              <h2 className="font-display font-extrabold text-lg tracking-wide uppercase text-slate-900">
                Medical Fitness for Industrial Deployment
              </h2>
              <p className="text-xs text-slate-500 italic mt-0.5">
                Issued in accordance with SABIC, Sadara, PetroKemya & Aramco Contractor HSE Standards
              </p>
            </div>

            {/* Candidate Details Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 my-4 grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Employee Full Name</span>
                <span className="font-bold text-slate-900 text-sm">{certificate.employeeName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Iqama / Muqeem ID</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{certificate.iqamaId || certificate.employeeNo || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">SAP Employee No.</span>
                <span className="font-mono font-bold text-slate-900">{certificate.employeeNo}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Trade & Designation</span>
                <span className="font-medium text-slate-800">{certificate.position || 'Civil Specialist'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Division / Cost Center</span>
                <span className="font-medium text-slate-800">{certificate.division || 'PMTA Operations'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nationality</span>
                <span className="font-medium text-slate-800">{certificate.nationality}</span>
              </div>
            </div>

            {/* Examination Details */}
            <div className="grid grid-cols-2 gap-4 my-4 text-xs">
              <div className="border border-slate-200 p-3 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Medical Test Administered</span>
                <span className="font-bold text-slate-900">{certificate.testName}</span>
                <span className="text-[10.5px] font-mono text-slate-500 block mt-0.5">SAP Code: {certificate.sapMaterialCode}</span>
              </div>
              <div className="border border-slate-200 p-3 rounded-lg">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Authorized Clinic Vendor</span>
                <span className="font-bold text-slate-900">{certificate.clinicName}</span>
                <span className="text-[10.5px] font-mono text-slate-500 block mt-0.5">SAP Vendor ID: {certificate.sapVendorNo || '1001502'}</span>
              </div>
            </div>

            {/* Determination Result Badge */}
            <div className={`p-4 rounded-xl border text-center my-4 ${
              isFit
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              <div className="text-[10px] uppercase tracking-widest font-bold">Clinical Fitness Determination</div>
              <div className="font-display font-black text-2xl tracking-wider uppercase my-1">
                {isFit ? 'FIT FOR SITE DEPLOYMENT' : 'UNFIT / PENDING CLEARANCE'}
              </div>
              <div className="text-xs font-medium text-slate-600 mt-1">
                {certificate.remarks}
              </div>
            </div>

            {/* Validity Timeline */}
            <div className="flex items-center justify-between bg-slate-100/70 p-3 rounded-lg text-xs font-semibold my-4">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Examination Date</span>
                <span className="text-slate-800 font-mono">{new Date(certificate.testDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase text-right">Certificate Valid Until</span>
                <span className="text-emerald-700 font-mono font-bold">
                  {certificate.validUntil ? new Date(certificate.validUntil).toLocaleDateString() : 'Continuous'}
                </span>
              </div>
            </div>

            {/* Signatures & Stamps */}
            <div className="flex items-end justify-between pt-6 border-t border-slate-200 text-xs">
              <div>
                <div className="font-bold text-slate-800">{certificate.examiningPhysician}</div>
                <div className="text-[10.5px] text-slate-400">Chief Medical Officer &bull; Occupational Health</div>
                <div className="h-9 w-28 border-b-2 border-slate-400 border-dashed mt-1 flex items-center justify-center text-[10px] text-slate-300 font-mono italic">
                  [Digitally Signed]
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block p-2 border-2 border-dashed border-secondary/50 rounded-lg text-center">
                  <div className="material-symbols-outlined text-secondary text-2xl">qr_code_2</div>
                  <div className="text-[9px] font-mono text-slate-400">ECC VERIFIED</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
