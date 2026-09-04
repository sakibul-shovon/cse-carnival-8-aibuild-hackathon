import React from 'react';

export default function EmptyState({ icon: Icon, title, description, actionText, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center glass-card rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800/60 my-6 transition-colors duration-300">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm shadow-emerald-500/10">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-lg font-bold text-emerald-950 dark:text-white tracking-tight">{title}</h3>
      <p className="text-sm text-black dark:text-emerald-400/80 max-w-sm mt-1 mb-5">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
