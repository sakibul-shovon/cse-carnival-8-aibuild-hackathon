import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '', compact = false }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      id="theme-toggle-btn"
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode (Green & White)' : 'Switch to Dark Mode'}
      className={`relative group inline-flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl transition-all duration-300 ${
        isDark
          ? 'bg-[#14241d] hover:bg-[#1a3026] text-emerald-200 border border-emerald-800/60 shadow-md shadow-emerald-950/40'
          : 'bg-white hover:bg-emerald-50/80 text-emerald-950 border border-emerald-300 shadow-sm'
      } ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {isDark ? (
          <Moon className="w-4 h-4 text-emerald-300 transition-transform duration-300 group-hover:-rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-emerald-700 transition-transform duration-300 group-hover:rotate-45" />
        )}
      </div>

      {!compact && (
        <span className="text-xs font-bold tracking-tight hidden sm:inline-block">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}

      {/* Subtle indicator dot */}
      <span
        className={`w-2 h-2 rounded-full ${
          isDark ? 'bg-emerald-400/90 shadow-[0_0_6px_#34d399]' : 'bg-emerald-600 shadow-[0_0_6px_#059669]'
        }`}
      />
    </button>
  );
}
