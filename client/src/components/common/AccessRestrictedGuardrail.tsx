import React from 'react';

interface AccessRestrictedGuardrailProps {
  currentTab: string;
  userRole: string;
  userName: string;
  onNavigateToTab: (tabId: string) => void;
  onSwitchRole?: (role: string) => void;
}

interface ModuleInfo {
  name: string;
  icon: string;
  description: string;
  authorizedRoles: string[];
}

const MODULE_REGISTRY: Record<string, ModuleInfo> = {
  dashboard: {
    name: 'Executive KPI Dashboard',
    icon: 'dashboard',
    description: 'Corporate medical clearance analytics, throughput metrics, and clinic capacity utilization.',
    authorizedRoles: ['HR', 'REQUESTER', 'CENTRAL', 'FINANCE', 'ADMIN']
  },
  intake: {
    name: 'Employee Medical Clearance Intake & Pre-Booking',
    icon: 'add_circle',
    description: 'Single employee eligibility check, Iqama validation, bulk roster upload, and advance 50-slot pre-booking for undecided staff.',
    authorizedRoles: ['HR', 'REQUESTER', 'ADMIN']
  },
  slots: {
    name: 'Medical Slot Portal & Allocation Queue',
    icon: 'calendar_month',
    description: 'Central Medical Team capacity management: dispatching pre-booked slots across accredited clinics, split allocations, and tariff comparisons.',
    authorizedRoles: ['CENTRAL', 'ADMIN']
  },
  requests: {
    name: 'Clearance Requests & Central Triage Queue',
    icon: 'assignment',
    description: 'Medical clearance triage console, quota balancing, and clinic appointment scheduling.',
    authorizedRoles: ['HR', 'REQUESTER', 'CENTRAL', 'ADMIN']
  },
  reports: {
    name: 'Medical Fitness Certificate Library',
    icon: 'folder_shared',
    description: 'Archival repository of certified FIT/UNFIT determinations and printable bilingual certificates.',
    authorizedRoles: ['HR', 'REQUESTER', 'CENTRAL', 'ADMIN']
  },
  clinic: {
    name: 'Accredited Medical Center Portal',
    icon: 'local_hospital',
    description: 'Clinical examination desk, biometric check-in, physician outcome entry, and batch invoice generation.',
    authorizedRoles: ['CLINIC', 'ADMIN']
  },
  finance: {
    name: 'Finance 3-Way Match & Clearance',
    icon: 'receipt_long',
    description: 'PO-to-Report rate variance audit, duplicate billing defense, and SAP SES clearance approval.',
    authorizedRoles: ['FINANCE', 'ADMIN']
  },
  suppliers: {
    name: 'Accredited Clinics & Rate Cards',
    icon: 'domain',
    description: 'Contract terms, approved test price masters, and accredited medical facility profiles.',
    authorizedRoles: ['CENTRAL', 'FINANCE', 'ADMIN']
  },
  audit: {
    name: 'System Security & Audit Trail',
    icon: 'history',
    description: 'Immutable regulatory log of clearance creations, clinic assignments, medical results, and financial clearances.',
    authorizedRoles: ['ADMIN']
  },
  admin: {
    name: 'Master System Administration Console',
    icon: 'admin_panel_settings',
    description: 'User identity & access management (IAM), accredited clinic onboarding, SAP contracts, and rate cards governance.',
    authorizedRoles: ['ADMIN']
  }
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  HR: 'HR Coordinator',
  REQUESTER: 'HSE Coordinator',
  CENTRAL: 'Central Medical Team',
  CLINIC: 'Accredited Medical Center',
  FINANCE: 'Finance Controller',
  ADMIN: 'System Administrator'
};

const ROLE_DEFAULT_TABS: Record<string, string> = {
  HR: 'dashboard',
  REQUESTER: 'intake',
  CENTRAL: 'slots',
  CLINIC: 'clinic',
  FINANCE: 'finance',
  ADMIN: 'admin'
};

export const AccessRestrictedGuardrail: React.FC<AccessRestrictedGuardrailProps> = ({
  currentTab,
  userRole,
  userName,
  onNavigateToTab,
  onSwitchRole
}) => {
  const currentModule = MODULE_REGISTRY[currentTab] || {
    name: currentTab,
    icon: 'lock',
    description: 'Restricted system module.',
    authorizedRoles: ['ADMIN']
  };

  const defaultTab = ROLE_DEFAULT_TABS[userRole] || 'dashboard';
  const defaultModule = MODULE_REGISTRY[defaultTab] || { name: 'Home' };

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[75vh]">
      <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl relative overflow-hidden">
        {/* Top Warning Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-secondary to-red-500"></div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
              <span className="material-symbols-outlined text-[34px]">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wider">
                  Role Guardrail Enforced
                </span>
                <span className="text-slate-400 text-xs">&bull;</span>
                <span className="text-slate-500 text-xs font-mono">RBAC Security Layer</span>
              </div>
              <h2 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">
                Access Restricted: {currentModule.name}
              </h2>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-right">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Current Session</span>
            <div className="text-xs font-bold text-slate-800">{userName || 'Active User'}</div>
            <div className="text-[11px] font-semibold text-secondary">{ROLE_DISPLAY_NAMES[userRole] || userRole}</div>
          </div>
        </div>

        {/* Guardrail Explanation */}
        <div className="py-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Your authenticated enterprise role as <strong className="text-slate-900 font-bold">{ROLE_DISPLAY_NAMES[userRole] || userRole}</strong> does
            not grant operational permissions to access or modify records within the <strong className="text-slate-900 font-bold">{currentModule.name}</strong> module.
          </p>

          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-slate-500">verified_user</span>
              <span>Authorized Roles for this Workspace:</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentModule.authorizedRoles.map(r => {
                const isCurrentRole = r === userRole;
                return (
                  <span
                    key={r}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border ${
                      isCurrentRole
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200 shadow-sm'
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${isCurrentRole ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    <span>{ROLE_DISPLAY_NAMES[r] || r} ({r})</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab(defaultTab)}
              className="bg-secondary hover:bg-orange-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-secondary/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Return to {defaultModule.name}</span>
            </button>
          </div>

          {onSwitchRole && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Switch role to test access:</span>
              <select
                value={userRole}
                onChange={(e) => onSwitchRole(e.target.value)}
                className="bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="HR">HR Coordinator</option>
                <option value="REQUESTER">HSE Coordinator</option>
                <option value="CENTRAL">Central Medical Team</option>
                <option value="CLINIC">Accredited Clinic</option>
                <option value="FINANCE">Finance Controller</option>
                <option value="ADMIN">System Administrator</option>
              </select>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
