import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Calendar,
  Building2,
  PartyPopper,
  Megaphone,
  BookOpenCheck,
  BotMessageSquare,
  Sparkles,
  RotateCcw,
  Layers,
  Menu,
  X,
  Radio,
} from 'lucide-react';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './Toast';

const NAV_ITEMS = [
  { path: '/', label: 'Schedules', icon: Calendar, desc: 'Class routines & slots' },
  { path: '/rooms', label: 'Rooms', icon: Building2, desc: 'Classrooms, labs & booking' },
  { path: '/events', label: 'Events', icon: PartyPopper, desc: 'Hackathons & registrations' },
  { path: '/announcements', label: 'Announcements', icon: Megaphone, desc: 'Notices & advisories' },
  { path: '/assignments', label: 'Assignments', icon: BookOpenCheck, desc: 'Tasks & deadlines' },
  { path: '/chat', label: 'Agent Chat', icon: BotMessageSquare, desc: 'AI assistant & live actions', highlight: true },
];

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const location = useLocation();

  const handleResetSeed = () => {
    if (window.confirm('Reset all 5 systems back to the original seed data?')) {
      api.resetToSeed();
      queryClient.invalidateQueries();
      addToast({
        type: 'info',
        title: 'Data Reset',
        message: 'All 5 databases restored to original seed fixtures.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-white text-lg">CampusOS</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 lg:w-72 border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl shrink-0 sticky top-0 h-auto md:h-screen z-30`}
      >
        {/* Logo / Brand Header */}
        <div className="p-6 hidden md:flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-white text-lg leading-tight flex items-center gap-1.5">
                CampusOS
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  v8.0
                </span>
              </div>
              <p className="text-xs text-slate-400">Campus Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="p-4 flex-1 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Campus Systems
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`group flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? item.highlight
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800/90 text-white border border-slate-700/60 shadow-sm'
                    : item.highlight
                    ? 'bg-indigo-950/40 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-900/50 hover:text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? (item.highlight ? 'text-white' : 'text-indigo-400') : item.highlight ? 'text-indigo-400' : 'text-slate-400'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                        AI
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${isActive ? (item.highlight ? 'text-indigo-100' : 'text-slate-400') : 'text-slate-400'}`}>
                    {item.desc}
                  </p>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-900/30 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
            <span className="font-mono text-[11px] text-slate-400">AUST Fall 26</span>
          </div>

          <button
            onClick={handleResetSeed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition"
            title="Reload initial seed datasets from JSON"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Seed Data
          </button>
        </div>
      </aside>

      {/* Main App Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
