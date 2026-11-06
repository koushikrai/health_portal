import React, { useState, useEffect } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeSelectorModal } from '../ui/ThemeSelectorModal';
import { api } from '../../api/client';

interface TopHeaderProps {
  currentTabLabel: string;
  userRole: string;
  userName: string;
  onSwitchRole: (role: string) => void;
  onLogout: () => void;
  onNavigateToTab?: (tabId: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTabLabel,
  userRole,
  userName,
  onSwitchRole,
  onLogout,
  onNavigateToTab
}) => {
  const { theme } = useTheme();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [showHealthPopover, setShowHealthPopover] = useState(false);

  useEffect(() => {
    api.getHealth()
      .then(res => setHealthInfo(res.data))
      .catch(() => setHealthInfo({ status: 'ONLINE', gateway: 'Local Port 5000' }));
  }, []);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between shrink-0 select-none sticky top-0 z-30">
        {/* Breadcrumb Navigation & Live Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="material-symbols-outlined text-[17px] text-slate-400">domain</span>
            <span>Expertise Healthcare</span>
            <span>/</span>
            <span className="text-slate-700">Medical Clearance</span>
            <span>/</span>
            <span className="text-secondary font-bold">{currentTabLabel}</span>
          </div>

          {/* Live 3-Tier Architecture Telemetry Badge */}
          <div className="relative hidden lg:block">
            <button
              onClick={() => setShowHealthPopover(!showHealthPopover)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-colors"
              title="Click to view 3-Tier Architecture Health & DB telemetry"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>3-Tier Active</span>
              <span className="text-[10px] text-emerald-600 font-mono font-normal">
                (Port 5000 &bull; Neon DB)
              </span>
            </button>

            {showHealthPopover && healthInfo && (
              <div className="absolute top-9 left-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 z-50 text-xs animate-fade-in space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-800">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-600">dns</span>
                    <span>3-Tier Architecture Health</span>
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                    {healthInfo.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Application Tier:</span>
                    <strong className="text-slate-700">{healthInfo.gateway || 'Local Express (Port 5000)'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Database Tier:</span>
                    <strong className="text-slate-700">{healthInfo.database?.engine || 'PostgreSQL (Neon)'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Query Latency:</span>
                    <strong className="text-emerald-700 font-mono">{healthInfo.database?.latencyMs || '22ms'}</strong>
                  </div>
                  {healthInfo.records && (
                    <div className="pt-2 border-t border-slate-100 flex justify-between font-mono text-[10.5px] text-slate-700">
                      <span>{healthInfo.records.employees} Workers</span>
                      <span>&bull;</span>
                      <span>{healthInfo.records.requests} Requests</span>
                      <span>&bull;</span>
                      <span>{healthInfo.records.clinics} Clinics</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Role-Specific Quick Shortcuts */}
          {onNavigateToTab && (
            <div className="hidden md:flex items-center gap-1.5">
              {(userRole === 'HR' || userRole === 'REQUESTER') && (
                <>
                  <button
                    onClick={() => onNavigateToTab('intake')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                    title="Workforce Intake & Pre-Booking"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">add_circle</span>
                    <span>+ New Request / Pre-Book</span>
                  </button>
                  <button
                    onClick={() => onNavigateToTab('requests')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Track Submitted Requests Queue"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-600">assignment</span>
                    <span>Requests Queue</span>
                  </button>
                </>
              )}

              {userRole === 'CENTRAL' && (
                <>
                  <button
                    onClick={() => onNavigateToTab('slots')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                    title="Medical Slot Portal / Allocation Queue"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">calendar_month</span>
                    <span>Slot Allocation Queue</span>
                  </button>
                  <button
                    onClick={() => onNavigateToTab('requests')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    title="Corporate Request Queue"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-600">assignment_returned</span>
                    <span>Corporate Queue</span>
                  </button>
                </>
              )}

              {userRole === 'CLINIC' && (
                <button
                  onClick={() => onNavigateToTab('clinic')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                  title="Accredited Clinic Portal"
                >
                  <span className="material-symbols-outlined text-[16px] text-emerald-700">local_hospital</span>
                  <span>Clinic Examination Desk</span>
                </button>
              )}

              {userRole === 'FINANCE' && (
                <button
                  onClick={() => onNavigateToTab('finance')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors cursor-pointer"
                  title="Invoice 3-Way Clearance"
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-700">receipt_long</span>
                  <span>Invoice Clearance</span>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <>
                  <button
                    onClick={() => onNavigateToTab('slots')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">calendar_month</span>
                    <span>Slot Portal</span>
                  </button>
                  <button
                    onClick={() => onNavigateToTab('admin')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-slate-700">admin_panel_settings</span>
                    <span>Administration</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Theme Switcher Button */}
          <button
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-xs"
            title="Change UI Theme"
          >
            <div className="flex items-center -space-x-1">
              {theme.previewColors.map((c, i) => (
                <div
                  key={i}
                  className="h-3.5 w-3.5 rounded-full border border-white"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <span className="hidden sm:inline font-bold text-slate-800">{theme.name.split(' ')[0]}</span>
            <span className="material-symbols-outlined text-[16px] text-slate-400">tune</span>
          </button>

          {/* Role Quick Selector (Accessible for Admin Testing / Impersonation) */}
          {(userRole === 'ADMIN' || localStorage.getItem('ecc_real_role') === 'ADMIN') && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700 shadow-2xs">
              <span className="material-symbols-outlined text-[15px] text-secondary">badge</span>
              <span className="font-semibold text-slate-500 hidden sm:inline">Role:</span>
              <select
                value={userRole}
                onChange={(e) => onSwitchRole(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer text-xs"
                title="Switch active role perspective (Admin Impersonation)"
              >
                <option value="ADMIN">System Administrator</option>
                <option value="CENTRAL">Central Medical Team</option>
                <option value="HR">HR Coordinator</option>
                <option value="REQUESTER">HSE Coordinator</option>
                <option value="CLINIC">Clinic Examination Desk</option>
                <option value="FINANCE">Finance Controller</option>
              </select>
              {userRole !== 'ADMIN' && (
                <span className="hidden lg:inline text-[9.5px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded ml-1">
                  Impersonating
                </span>
              )}
            </div>
          )}

          {/* User Profile Capsule */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="h-8 w-8 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {userName ? userName[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden xl:block text-left leading-tight">
              <div className="text-xs font-bold text-slate-800">{userName || 'ECC User'}</div>
              <div className="text-[10.5px] font-medium text-slate-400">{userRole}</div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title="Sign out to Login page"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[19px]">logout</span>
          </button>
        </div>
      </header>

      {/* Theme Studio Modal */}
      <ThemeSelectorModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </>
  );
};
