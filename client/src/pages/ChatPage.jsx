import React from 'react';
import ChatWidget from '../chat/ChatWidget';
import { Bot, Sparkles, Zap, ShieldCheck, Database } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-80px)] md:h-screen flex flex-col">
      {/* Top Banner */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              CampusCopilot <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI</span>
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Your smart university copilot — instant routines, room booking, event RSVPs & live campus intelligence.
          </p>
        </div>

        {/* Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Always Live Data</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
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
