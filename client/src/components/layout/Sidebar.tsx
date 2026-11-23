import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: number | string;
  allowedRoles?: string[];
}

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  userRole: string;
  userName: string;
  onSwitchRole: (role: string, vendorId?: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  userName,
  onSwitchRole,
  onLogout
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', allowedRoles: ['HR', 'REQUESTER', 'CENTRAL', 'FINANCE', 'ADMIN'] },
    { id: 'intake', label: 'New Request & Pre-Booking', icon: 'add_circle', allowedRoles: ['HR', 'REQUESTER', 'ADMIN'] },
    { id: 'slots', label: 'Slot Allocation Queue', icon: 'calendar_month', badge: 'Quota', allowedRoles: ['CENTRAL', 'ADMIN'] },
    { id: 'requests', label: 'Requests Queue', icon: 'assignment', badge: 'Active', allowedRoles: ['HR', 'REQUESTER', 'CENTRAL', 'ADMIN'] },
    { id: 'reports', label: 'Medical Clearance', icon: 'verified_user', allowedRoles: ['HR', 'REQUESTER', 'CENTRAL', 'ADMIN'] },
    { id: 'clinic', label: 'Clinic Portal', icon: 'local_hospital', allowedRoles: ['CLINIC', 'ADMIN'] },
    { id: 'finance', label: 'Invoice Clearance', icon: 'receipt_long', allowedRoles: ['FINANCE', 'ADMIN'] },
    { id: 'rates', label: 'Rates & Wage Bands', icon: 'calculate', allowedRoles: ['CENTRAL', 'FINANCE', 'ADMIN'] },
    { id: 'suppliers', label: 'Clinics & Contracts', icon: 'domain', allowedRoles: ['CENTRAL', 'FINANCE', 'ADMIN'] },
    { id: 'audit', label: 'System Audit Log', icon: 'history', allowedRoles: ['ADMIN', 'CENTRAL', 'FINANCE'] },
    { id: 'admin', label: 'Administration', icon: 'admin_panel_settings', badge: 'Master', allowedRoles: ['ADMIN'] },
  ];

  const visibleItems = navItems.filter(item => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole) || userRole === 'ADMIN';
  });

  return (
    <aside className="w-64 bg-[#0A0F1D] text-white flex flex-col justify-between border-r border-slate-800 shrink-0 select-none sticky top-0 h-screen overflow-y-auto z-40">
      <div>
        {/* Brand Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <img src="/expertise-logo-trans.png" alt="Expertise" className="h-6 w-auto object-contain" />
            <span className="bg-secondary text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase">HEALTH</span>
          </div>
        </div>

        {/* Active Facility Card */}
        <div className="mx-3 mt-4 mb-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-inner">
            <div className="mb-1">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Operational Hub</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">domain</span>
                <span className="text-white text-xs font-semibold">ECC Jubail Operations</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Saudi Arabia</span>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-4 pt-3 pb-1">
          <span className="text-[10px] uppercase text-slate-400 tracking-wider font-semibold">Medical Modules</span>
        </div>

        <nav className="px-3 space-y-1.5">
          {visibleItems.map(item => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] ${isActive ? 'text-secondary' : 'text-slate-400'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-secondary/15 text-secondary' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer: Active Role Switcher (Admin Impersonation) & Sign Out */}
      <div className="p-3 border-t border-slate-800/60 bg-[#080C17]">
        {(userRole === 'ADMIN' || localStorage.getItem('ecc_real_role') === 'ADMIN') && (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-2.5 mb-2">
            <div className="flex items-center justify-between mb-1.5 text-[10px] text-slate-400 uppercase font-semibold">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px] text-secondary">sync_alt</span>
                <span>Active Role Switcher</span>
              </div>
              <span className="text-[9.5px] px-1 rounded bg-secondary/20 text-secondary font-mono font-bold">
                {userRole === 'ADMIN' ? 'MASTER' : 'IMPERSONATING'}
              </span>
            </div>
            <select
              value={userRole}
              onChange={(e) => onSwitchRole(e.target.value)}
              className="w-full bg-[#0D121F] text-white text-xs font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700/80 focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="ADMIN">System Administrator</option>
              <option value="CENTRAL">Central Medical Team</option>
              <option value="HR">HR Coordinator</option>
              <option value="REQUESTER">HSE Coordinator</option>
              <option value="CLINIC">Clinic Desk (GAMC / BAK)</option>
              <option value="FINANCE">Finance Controller</option>
            </select>
          </div>
        )}

        {/* User Card with Sign Out */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-900/40 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-6 w-6 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-[10px] shrink-0">
              {userName ? userName[0].toUpperCase() : 'U'}
            </div>
            <div className="truncate text-left leading-tight">
              <div className="text-slate-200 font-bold truncate text-[11px]">{userName}</div>
              <div className="text-slate-400 text-[9.5px]">{userRole}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Sign out to Login Page"
            className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
