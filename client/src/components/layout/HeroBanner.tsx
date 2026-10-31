import React from 'react';

interface HeroBannerProps {
  title: string;
  accentText: string;
  subtitle: string;
  telemetryChips?: Array<{ icon: string; text: string; highlight?: boolean }>;
  timePeriod?: string;
  onTimePeriodChange?: (period: string) => void;
  actionButton?: {
    label: string;
    icon: string;
    onClick: () => void;
  };
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  title,
  accentText,
  subtitle,
  telemetryChips = [
    { icon: 'settings_input_component', text: '4 Terminals Connected' },
    { icon: 'schedule', text: 'Shift 1 Active (07:00 - 15:30)' },
    { icon: 'verified', text: 'Biometric Terminal Sync: 99.8%', highlight: true }
  ],
  timePeriod = 'This Week',
  onTimePeriodChange,
  actionButton
}) => {
  const periods = ['Today', 'This Week', 'This Month', 'Quarterly'];

  return (
    <div className="bg-[#131B35] rounded-2xl p-6 lg:p-7 text-white shadow-md relative overflow-hidden mb-6 border border-slate-800/80">
      {/* Background radial gradient glow */}
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div>
          {/* Main Title with Orange Gradient Accent */}
          <h1 className="font-display font-extrabold text-2xl lg:text-3xl tracking-tight text-white mb-2">
            {title}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-[#F7A65E]">
              {accentText}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs lg:text-sm text-slate-300 max-w-2xl leading-relaxed mb-4">
            {subtitle}
          </p>

          {/* Telemetry Micro-Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {telemetryChips.map((chip, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                  chip.highlight
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-900/70 border-slate-700/60 text-slate-300'
                }`}
              >
                <span className={`material-symbols-outlined text-[14px] ${chip.highlight ? 'text-emerald-400' : 'text-secondary'}`}>
                  {chip.icon}
                </span>
                <span>{chip.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Time Filter Pills */}
          <div className="inline-flex bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl shadow-inner">
            {periods.map((p) => {
              const active = timePeriod === p;
              return (
                <button
                  key={p}
                  onClick={() => onTimePeriodChange && onTimePeriodChange(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-secondary text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Action CTA Button */}
          {actionButton && (
            <button
              onClick={actionButton.onClick}
              className="bg-secondary hover:bg-orange-600 active:scale-95 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">{actionButton.icon}</span>
              <span>{actionButton.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
