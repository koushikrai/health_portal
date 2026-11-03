import React from 'react';
import { useTheme } from '../../theme/ThemeContext';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ isOpen, onClose }) => {
  const { themes, themeId, setThemeId } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">palette</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-slate-900">Portal Theme Studio</h3>
              <p className="text-xs text-slate-500">Choose your visual workspace identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body: Theme Grid */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Available Theme Colorways ({themes.length})
          </div>

          <div className="grid grid-cols-1 gap-3">
            {themes.map((t) => {
              const isSelected = t.id === themeId;
              return (
                <div
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isSelected
                      ? 'border-secondary bg-secondary-container/40 ring-2 ring-secondary shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Visual Color Swatches */}
                    <div className="flex items-center -space-x-1.5 shrink-0 p-1 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                      {t.previewColors.map((col, idx) => (
                        <div
                          key={idx}
                          className="h-6 w-6 rounded-full border border-white shadow-xs"
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>

                    {/* Theme Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 group-hover:text-secondary transition-colors truncate">
                          {t.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-secondary text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {t.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{t.subtitle}</p>
                    </div>
                  </div>

                  {/* Radio / Selection Indicator */}
                  <div className="shrink-0 pl-3">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-secondary border-secondary text-white'
                        : 'border-slate-300 group-hover:border-slate-400'
                    }`}>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Theme choices are auto-saved to your local session</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary text-white font-bold hover:bg-secondary-hover shadow-sm transition-all cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
