import React from 'react';
import ChatWidget from '../chat/ChatWidget';
import { Bot, Sparkles, Zap, ShieldCheck, Database } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto w-full h-[calc(100vh-80px)] md:h-screen flex flex-col">
      {/* Top Banner */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AI Student Assistant & Tool Orchestrator
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time tool-calling interface powered by live database integration and reasoning algorithms.
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
