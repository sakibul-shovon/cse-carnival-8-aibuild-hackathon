import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'max-w-xl' }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 dark:bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} glass-modal rounded-2xl p-6 sm:p-8 shadow-2xl z-10 text-black dark:text-emerald-50 max-h-[90vh] flex flex-col transition-colors duration-300`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-emerald-100 dark:border-emerald-800/60">
          <div>
            <h3 className="text-xl font-extrabold text-black dark:text-white tracking-tight">
              {title}
            </h3>
            {subtitle && <p className="text-sm text-black/75 dark:text-emerald-400/80 font-medium mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-black hover:text-black dark:text-emerald-300 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-emerald-900/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
