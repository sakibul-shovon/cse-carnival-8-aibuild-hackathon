import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              toast.type === 'success'
                ? 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-950 dark:text-emerald-50 border-emerald-300 dark:border-emerald-700/60 shadow-emerald-500/10'
                : toast.type === 'error'
                ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-950 dark:text-rose-50 border-rose-300 dark:border-rose-700/60 shadow-rose-500/10'
                : 'bg-white text-black dark:bg-[#0a0a0a] dark:text-emerald-50 border-emerald-200 dark:border-emerald-800 shadow-emerald-950/10'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="font-bold text-sm tracking-tight leading-none mb-1">{toast.title}</h5>}
              {toast.message && <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
