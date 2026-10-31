import React from 'react';

interface TopHeaderProps {
  currentTabLabel: string;
  userRole: string;
  userName: string;
  onSwitchRole: (role: string) => void;
  onLogout: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentTabLabel,
  userRole,
  userName,
  onSwitchRole,
  onLogout
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between shrink-0 select-none">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span className="material-symbols-outlined text-[17px] text-slate-400">domain</span>
        <span>Expertise Contracting Company</span>
        <span>/</span>
        <span className="text-slate-700">Medical Clearance</span>
        <span>/</span>
        <span className="text-secondary font-bold">{currentTabLabel}</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Role Quick Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700">
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

        {/* Notifications Icon with Badge */}
        <button className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-secondary ring-2 ring-white"></span>
        </button>

        {/* User Profile Capsule */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <div className="h-8 w-8 rounded-full bg-secondary text-white font-bold flex items-center justify-center text-xs shadow-sm">
            {userName ? userName[0].toUpperCase() : 'U'}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-800">{userName || 'ECC User'}</div>
            <div className="text-[10.5px] font-medium text-slate-400">{userRole}</div>
          </div>
        </div>

        {/* Logout to Login Page */}
        <button
          onClick={onLogout}
          title="Sign out to Login page"
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[19px]">logout</span>
        </button>
      </div>
    </header>
  );
};
