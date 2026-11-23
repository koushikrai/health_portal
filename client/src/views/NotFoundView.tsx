import React from 'react';

interface NotFoundViewProps {
  onGoHome: () => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onGoHome }) => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-orange-50 border border-orange-200 text-secondary flex items-center justify-center mb-4 shadow-sm">
        <span className="material-symbols-outlined text-3xl">wrong_location</span>
      </div>
      <h2 className="text-xl font-display font-extrabold text-slate-900 mb-1">
        404 - Module Not Found
      </h2>
      <p className="text-xs text-slate-500 max-w-md mb-6">
        The requested medical portal URL does not exist or has been relocated within the Expertise Healthcare Enterprise System.
      </p>
      <button
        onClick={onGoHome}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
      >
        <span className="material-symbols-outlined text-[17px]">arrow_back</span>
        <span>Return to Dashboard</span>
      </button>
    </div>
  );
};
