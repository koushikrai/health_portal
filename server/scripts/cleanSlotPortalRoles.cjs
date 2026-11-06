const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../client/src/views/SlotPortalView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add guardrail check at start of SlotPortalView
const oldStartAnchor = `export const SlotPortalView: React.FC<SlotPortalViewProps> = ({
  userRole = 'CENTRAL',
  userName = '',
  onSwitchRole
}) => {`;

const newStart = `export const SlotPortalView: React.FC<SlotPortalViewProps> = ({
  userRole = 'CENTRAL',
  userName = '',
  onSwitchRole
}) => {
  // Strict Role Guardrail: Medical Slot Portal is exclusively for Central Medical Team & Admin
  if (userRole !== 'CENTRAL' && userRole !== 'ADMIN') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-6 bg-[#F8FAF9]">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm animate-in fade-in duration-200">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <span className="material-symbols-outlined text-[28px]">lock</span>
          </div>
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-900">Access Restricted to Central Medical Team</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              The Medical Slot Portal is exclusively reserved for the <strong>Central Medical Team</strong> to triage and dispatch clinic quotas.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.href = '/dashboard'}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Return to Your Authorized Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }`;

content = content.replace(oldStartAnchor, newStart);

// 2. Remove HR Planning Desk from selectedRoleView
const oldRoleViewAnchor = `  const [selectedRoleView, setSelectedRoleView] = useState<string>(() => {
    if (userRole === 'HR' || userRole === 'REQUESTER') return 'HR Planning Desk';
    if (userRole === 'FINANCE') return 'Procurement central';
    return 'Central Medical Team';
  });

  // Keep selectedRoleView in sync when userRole changes externally (e.g. from TopHeader or Sidebar)
  useEffect(() => {
    if (userRole === 'HR' || userRole === 'REQUESTER') {
      setSelectedRoleView('HR Planning Desk');
    } else if (userRole === 'FINANCE') {
      setSelectedRoleView('Procurement central');
      setActiveMenu('price-comparison');
    } else if (userRole === 'CENTRAL') {
      setSelectedRoleView('Central Medical Team');
    }
  }, [userRole]);`;

const newRoleView = `  const [selectedRoleView, setSelectedRoleView] = useState<string>('Central Medical Team');

  useEffect(() => {
    if (userRole === 'CENTRAL') {
      setSelectedRoleView('Central Medical Team');
    }
  }, [userRole]);`;

content = content.replace(oldRoleViewAnchor, newRoleView);

// 3. Update effectiveRole and role flags
const oldEffectiveRole = `  // Effective role perspective: driven by selectedRoleView dropdown, falling back to userRole
  const effectiveRole =
    selectedRoleView === 'HR Planning Desk'
      ? 'HR'
      : selectedRoleView === 'Procurement central'
      ? 'FINANCE'
      : selectedRoleView === 'Central Medical Team'
      ? 'CENTRAL'
      : userRole;

  const isHrRole = effectiveRole === 'HR' || effectiveRole === 'REQUESTER';
  const isProcurementRole = effectiveRole === 'FINANCE';
  const isCentralOrAdmin = effectiveRole === 'CENTRAL' || effectiveRole === 'ADMIN';

  // Handle Role Switching from Dropdown
  const handleRoleViewChange = async (newView: string) => {
    setSelectedRoleView(newView);

    if (newView === 'Procurement central') {
      setActiveMenu('price-comparison');
      showToast('Switched to Procurement Central: Contract Rates & Quota Allocation');
    } else if (newView === 'HR Planning Desk') {
      setActiveMenu('queue');
      showToast('Switched to HR Planning Desk: Advance Quota & Request Status');
    } else {
      setActiveMenu('queue');
      showToast('Switched to Central Medical Team: Slot Allocation Console');
    }

    // Synchronize global role if onSwitchRole is available and user has admin permissions
    if (onSwitchRole) {
      if (newView === 'HR Planning Desk' && userRole !== 'HR') {
        await onSwitchRole('HR');
      } else if (newView === 'Procurement central' && userRole !== 'FINANCE') {
        await onSwitchRole('FINANCE');
      } else if (newView === 'Central Medical Team' && userRole !== 'CENTRAL') {
        await onSwitchRole('CENTRAL');
      }
    }
  };`;

const newEffectiveRole = `  const isProcurementRole = selectedRoleView === 'Procurement central';
  const isCentralOrAdmin = true;
  const isHrRole = false;

  const handleRoleViewChange = (newView: string) => {
    setSelectedRoleView(newView);
    if (newView === 'Procurement central') {
      setActiveMenu('price-comparison');
      showToast('Switched to Procurement Central: Contract Rates & Quota Allocation');
    } else {
      setActiveMenu('queue');
      showToast('Switched to Central Medical Team: Slot Allocation Console');
    }
  };`;

content = content.replace(oldEffectiveRole, newEffectiveRole);

// 4. Update top bar active role display
const oldTopBarRole = `          <span className="text-xs text-slate-500 font-medium">
            {isHrRole
              ? 'HR Advance Quota & Request Status'
              : isProcurementRole
              ? 'Procurement & Clinic Contract Rates Comparison'
              : 'Central Medical Team Slot Allocation & Clinic Dispatch'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Role Indicator Pill */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-xs font-semibold text-slate-700">
            <span className="text-slate-400 font-normal">Active Role:</span>
            <span className="font-bold text-slate-900">
              {isHrRole
                ? 'HR Planning Desk'
                : isProcurementRole
                ? 'Procurement Central'
                : 'Central Medical Team'}
            </span>
          </div>`;

const newTopBarRole = `          <span className="text-xs text-slate-500 font-medium">
            Central Medical Team Slot Allocation &amp; Clinic Dispatch
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold text-emerald-800">
            <span className="text-emerald-600 font-normal">Console:</span>
            <span className="font-bold">Central Medical Team</span>
          </div>`;

content = content.replace(oldTopBarRole, newTopBarRole);

// 5. Update sidebar role dropdown to remove HR Planning Desk
const oldSidebarDropdown = `            {/* Dropdown Selector */}
            <div className="relative">
              <select
                value={selectedRoleView}
                onChange={(e) => handleRoleViewChange(e.target.value)}
                className="w-full bg-[#1b3430] border border-[#284943] text-emerald-100 text-xs font-semibold rounded-lg px-3 py-2 pr-7 appearance-none focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="Central Medical Team">Central Medical Team</option>
                <option value="Procurement central">Procurement central</option>
                <option value="HR Planning Desk">HR Planning Desk</option>
              </select>`;

const newSidebarDropdown = `            {/* Dropdown Selector */}
            <div className="relative">
              <select
                value={selectedRoleView}
                onChange={(e) => handleRoleViewChange(e.target.value)}
                className="w-full bg-[#1b3430] border border-[#284943] text-emerald-100 text-xs font-semibold rounded-lg px-3 py-2 pr-7 appearance-none focus:outline-none focus:border-emerald-400 cursor-pointer"
              >
                <option value="Procurement central">Procurement central</option>
                <option value="Central Medical Team">Central Medical Team</option>
              </select>`;

content = content.replace(oldSidebarDropdown, newSidebarDropdown);

// 6. Remove the blue HR Coordinator View banner in queue tab
const oldBanner = `              {/* Role-Aware Notice Banner */}
              {isHrRole ? (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600 text-[22px]">info</span>
                    <div>
                      <strong className="block">HR Coordinator View: Read-Only Clinic Allocations</strong>
                      <span>You can view clinic assignments confirmed by the Central Medical Team. To request more quotas, click &quot;Pre-Book Slots&quot;.</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPreBookModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl cursor-pointer shrink-0"
                  >
                    + Pre-Book 50 Slots
                  </button>
                </div>
              ) : isProcurementRole ? (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-amber-700 text-[20px]">payments</span>
                    <span>
                      <strong>Procurement Central Console:</strong> Review negotiated SAP contract test prices across accredited clinics and evaluate cost allocation breakdown.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMenu('price-comparison')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg cursor-pointer shrink-0"
                  >
                    View Rates Comparison
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-emerald-700 text-[20px]">medical_services</span>
                  <span>
                    <strong>Central Medical Team Console:</strong> Click any request below to expand the clinic assignment manager. You can assign all slots to one clinic, or use the <strong>clinic dropdowns</strong> to distribute across multiple different clinics.
                  </span>
                </div>
              )}`;

const newBanner = `              {/* Central Medical Team Notice Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-700 text-[20px]">medical_services</span>
                <span>
                  <strong>Central Medical Team Console:</strong> Review incoming pre-booked slot requests sent by HR. Click any request below to assign slots across different clinics or the same clinic using the <strong>clinic dropdowns</strong>, then confirm allocation.
                </span>
              </div>`;

content = content.replace(oldBanner, newBanner);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully cleaned up SlotPortalView roles and removed HR access!");
