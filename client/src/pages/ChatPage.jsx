import React from 'react';
import ChatWidget from '../chat/ChatWidget';
import { Bot, ShieldCheck, Database } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-80px)] md:h-[calc(100vh-73px)] flex flex-col bg-white dark:bg-transparent">
      {/* Top Banner */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight flex items-center gap-2">
              CampusCopilot <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">AI</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-black dark:text-emerald-400/80 font-medium mt-1">
            Your smart university assistant — real-time class routines, room booking, event RSVPs & live campus intelligence.
          </p>
        </div>

        {/* Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0a0a0a] border border-emerald-200 dark:border-emerald-800 text-black dark:text-emerald-200 shadow-sm font-semibold">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Always Live Data</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0a0a0a] border border-emerald-200 dark:border-emerald-800 text-black dark:text-emerald-200 shadow-sm font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Conflict Safe</span>
          </div>
        </div>
      </div>

      {/* Main Full-Height Chat Container */}
      <div className="flex-1 min-h-0">
        <ChatWidget isFullPage={true} />
      </div>
    </div>
  );
}
