import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  trendText?: string;
  isPositiveTrend?: boolean;
  icon: string;
  iconBgColor?: string;
  iconColor?: string;
  ceilingPercent?: number;
  targetText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  trendText,
  isPositiveTrend = true,
  icon,
  iconBgColor = 'bg-secondary/10',
  iconColor = 'text-secondary',
  ceilingPercent,
  targetText
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header with Label and Icon */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`h-8 w-8 rounded-xl ${iconBgColor} flex items-center justify-center shrink-0`}>
          <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>{icon}</span>
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="font-display font-extrabold text-2xl lg:text-[26px] text-slate-900 tracking-tight my-1">
        {value}
      </div>

      {/* Trend Pill */}
      {trendText && (
        <div className="flex items-center gap-1.5 text-xs font-semibold mt-1">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10.5px] ${
            isPositiveTrend
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
          }`}>
            <span className="material-symbols-outlined text-[13px]">
              {isPositiveTrend ? 'trending_up' : 'trending_down'}
            </span>
            <span>{trendText}</span>
          </span>
        </div>
      )}

      {/* Ceiling Progress Bar */}
      {ceilingPercent !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5">
            <div
              className="bg-secondary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ceilingPercent)}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-slate-400 font-medium">
            <span>{ceilingPercent}% of ceiling</span>
            <span>{targetText || 'Target: Optimal'}</span>
          </div>
        </div>
      )}
    </div>
  );
};
