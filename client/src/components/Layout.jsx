import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom';
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
  Compass,
  Home,
} from 'lucide-react';
import { api } from '../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './Toast';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { path: '/schedules', label: 'Schedules', icon: Calendar, desc: 'Class routines & slots' },
  { path: '/rooms', label: 'Rooms', icon: Building2, desc: 'Classrooms, labs & booking' },
  { path: '/events', label: 'Events', icon: PartyPopper, desc: 'Hackathons & registrations' },
  { path: '/announcements', label: 'Announcements', icon: Megaphone, desc: 'Notices & advisories' },
  { path: '/assignments', label: 'Assignments', icon: BookOpenCheck, desc: 'Tasks & deadlines' },
  { path: '/chat', label: 'CampusCopilot', icon: BotMessageSquare, desc: 'AI Copilot & live actions', highlight: true },
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

  const currentNav = NAV_ITEMS.find((item) => item.path === location.pathname) || {
    label: 'Dashboard',
    desc: 'Campus Management',
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-emerald-50 flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3.5 border-b border-emerald-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/25">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-black dark:text-white text-lg">
            CampusOS
          </span>
        </Link>

        {/* Upper Corner Controls on Mobile */}
        <div className="flex items-center gap-2">
          <ThemeToggle compact={true} />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-black dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:flex flex-col w-full md:w-64 lg:w-72 border-r border-emerald-200/80 dark:border-emerald-900/40 bg-white/85 dark:bg-black/85 backdrop-blur-2xl shrink-0 sticky top-0 h-auto md:h-screen z-30 transition-colors duration-300 shadow-sm md:shadow-none`}
      >
        {/* Logo / Brand Header */}
        <div className="p-5 hidden md:flex items-center justify-between border-b border-emerald-100/80 dark:border-emerald-900/40">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-black dark:text-white text-lg leading-tight flex items-center gap-1.5">
                CampusOS
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/25">
                  v8.0
                </span>
              </div>
              <p className="text-xs text-black font-semibold">
                Campus Intelligence
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="p-3.5 flex-1 space-y-1.5 overflow-y-auto">
          {/* Back to Landing Page link */}
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-black dark:text-emerald-300/80 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800/40 transition mb-2"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>← Landing Overview</span>
          </Link>

          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-black dark:text-emerald-400/70">
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
                className={`group flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? item.highlight
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 dark:bg-emerald-500 dark:text-emerald-950'
                      : 'bg-emerald-100/90 dark:bg-emerald-900/50 text-black dark:text-white border border-emerald-300/80 dark:border-emerald-700/50 font-bold shadow-sm'
                    : item.highlight
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 text-black dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                    : 'text-black dark:text-emerald-200/80 hover:text-black dark:hover:text-white hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive
                      ? item.highlight
                        ? 'text-white dark:text-emerald-950'
                        : 'text-emerald-700 dark:text-emerald-300'
                      : item.highlight
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-black dark:text-emerald-400/70 group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="truncate">{item.label}</span>
                    {item.highlight && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-200 dark:bg-emerald-500/20 text-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-400/30">
                        AI
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs truncate font-medium ${
                      isActive
                        ? item.highlight
                          ? 'text-emerald-50 dark:text-emerald-900'
                          : 'text-black dark:text-emerald-300'
                        : 'text-black/75 dark:text-emerald-400/60'
                    }`}
                  >
                    {item.desc}
                  </p>
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-emerald-100/80 dark:border-emerald-900/40 bg-white/60 dark:bg-black/60 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-black dark:text-emerald-300/80">
            <span className="flex items-center gap-1.5 font-bold text-black dark:text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]"></span>
              Live Synced
            </span>
            <span className="font-mono text-[11px] font-bold text-black dark:text-emerald-400">
              AUST Fall 26
            </span>
          </div>

          <button
            onClick={handleResetSeed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-black dark:text-emerald-200 bg-white dark:bg-emerald-950/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 shadow-sm transition"
            title="Reload initial seed datasets from JSON"
          >
            <RotateCcw className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            Reset Seed Data
          </button>
        </div>
      </aside>

      {/* Main App Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto bg-white dark:bg-black">
        {/* Global Desktop Top Bar with Theme Toggle at Upper Right Corner */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-emerald-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-black/80 backdrop-blur-2xl sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-black dark:text-emerald-100 tracking-tight">
                {currentNav.label}
              </h2>
              <p className="text-xs font-semibold text-black dark:text-emerald-400/70">
                {currentNav.desc}
              </p>
            </div>
          </div>

          {/* Upper Right Corner Theme Switcher & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-black dark:text-emerald-300 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Real-time Database Active
            </div>

            {/* THEME TOGGLE (Upper Right Corner) */}
            <ThemeToggle />
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 bg-white dark:bg-transparent">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
