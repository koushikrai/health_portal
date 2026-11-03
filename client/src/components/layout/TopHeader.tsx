import React, { useState } from 'react';
import { useTheme } from '../../theme/ThemeContext';
import { ThemeSelectorModal } from '../ui/ThemeSelectorModal';

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

          {/* Sync Status Badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gateways Connected</span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Shortcuts */}
          {onNavigateToTab && (
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => onNavigateToTab('intake')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Direct Walk-in Intake Form"
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">how_to_reg</span>
                <span>Walk-in Intake</span>
              </button>
              <button
                onClick={() => onNavigateToTab('requests')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-semibold transition-colors cursor-pointer"
                title="Incoming Corporate Requests Queue"
              >
                <span className="material-symbols-outlined text-[16px]">assignment_returned</span>
                <span>Corporate Queue</span>
              </button>
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

          {/* Role Quick Selector */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs text-slate-700">
            <span className="font-semibold text-slate-500">Role:</span>
            <select
              value={userRole}
              onChange={(e) => onSwitchRole(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="HR">HR Coordinator</option>
              <option value="REQUESTER">HSE Coordinator</option>
              <option value="CENTRAL">Central Medical Team</option>
              <option value="CLINIC">Clinic Examination Desk</option>
              <option value="FINANCE">Finance Controller</option>
              <option value="ADMIN">System Administrator</option>
            </select>
          </div>

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
