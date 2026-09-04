import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Calendar,
  Building2,
  PartyPopper,
  Megaphone,
  BookOpenCheck,
  ShieldCheck,
  Zap,
  Layers,
  Clock,
  CheckCircle2,
  Database,
  Cpu,
  Users,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

const SYSTEM_FEATURES = [
  {
    title: 'Class Schedules',
    desc: 'Sunday–Thursday AUST routine management with room allocations, instructor tracking, and instant class cancellation updates.',
    icon: Calendar,
    path: '/schedules',
    color: 'from-emerald-500/20 to-teal-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    title: 'Rooms & Lab Booking',
    desc: 'Instant slot reservations with real-time overlap conflict detection, capacity filters, and equipment tagging (projector, AC).',
    icon: Building2,
    path: '/rooms',
    color: 'from-teal-500/20 to-emerald-600/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
  {
    title: 'Events & Hackathons',
    desc: 'Automated student registration with strict capacity enforcement, live attendee rosters, and status management.',
    icon: PartyPopper,
    path: '/events',
    color: 'from-emerald-500/20 to-teal-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    title: 'Announcements',
    desc: 'Priority-based notice broadcasting (high, medium, low) with auto-expiring flags and department advisory updates.',
    icon: Megaphone,
    path: '/announcements',
    color: 'from-teal-500/20 to-emerald-600/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
  {
    title: 'Course Assignments',
    desc: 'Chronologically sorted deadlines, automated overdue alerts, point scores, and 1-click submission status toggles.',
    icon: BookOpenCheck,
    path: '/assignments',
    color: 'from-emerald-500/20 to-teal-600/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    title: 'AI Agent Assistant',
    desc: 'LLM wired with real tool calling to look up live routines, book rooms, register for talks, and refuse unauthorized operations.',
    icon: Bot,
    path: '/chat',
    color: 'from-teal-500/20 to-emerald-600/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
  },
];

const STATS = [
  { value: '24', label: 'Class Routines' },
  { value: '20', label: 'Campus Spaces' },
  { value: '7', label: 'Flagship Events' },
  { value: '100%', label: 'Live Synced' },
];

export default function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="relative min-h-screen bg-white dark:bg-[#000000] text-slate-900 dark:text-slate-100 overflow-hidden selection:bg-emerald-500 selection:text-white flex flex-col justify-between transition-colors duration-300">
      {/* Background Campus Image Watermark with Low Opacity & Theme Lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/aust_campus.png"
          alt="AUST Campus Building"
          className="w-full h-full object-cover object-center opacity-[0.14] dark:opacity-[0.12] filter brightness-100 dark:brightness-90 contrast-115 scale-105"
        />
        {/* Gradients blending with green & white theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/85 to-white/70 dark:from-black dark:via-black/85 dark:to-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent dark:from-emerald-600/15" />
        
        {/* Subtle decorative glowing mesh */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-10 w-[450px] h-[300px] bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Top Navigation */}
        <header className="border-b border-emerald-900/10 dark:border-emerald-800/30 bg-white/75 dark:bg-black/60 backdrop-blur-md sticky top-0 z-50 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold tracking-tight text-emerald-950 dark:text-white text-lg leading-tight flex items-center gap-2">
                  CampusOS
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    AUST
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800/70 dark:text-slate-400">Campus Intelligence System</p>
              </div>
            </Link>

            {/* Nav Links & Authentication Options */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden lg:flex items-center gap-5 text-sm text-emerald-950/80 dark:text-slate-300 font-medium mr-2">
                <a href="#features" className="hover:text-emerald-600 dark:hover:text-white transition">Systems</a>
                <a href="#stats" className="hover:text-emerald-600 dark:hover:text-white transition">Overview</a>
                <Link to="/chat" className="hover:text-emerald-600 dark:hover:text-emerald-300 transition flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  CampusCopilot
                </Link>
              </div>

              {/* Theme Switcher Toggle */}
              <ThemeToggle compact={true} />

              {/* AUTH BUTTONS / USER PROFILE */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-950 dark:text-emerald-200">
                    <span className="text-base">{user.avatar || '👨‍🎓'}</span>
                    <span className="truncate max-w-[120px]">{user.name}</span>
                  </div>

                  <Link
                    to="/schedules"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-2 rounded-xl text-emerald-900/70 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Login Link */}
                  <Link
                    to="/auth?mode=login"
                    id="nav-login-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-emerald-900 dark:text-emerald-200 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50/80 dark:hover:bg-slate-900 border border-emerald-300 dark:border-emerald-800/60 transition"
                  >
                    <LogIn className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Log In</span>
                  </Link>

                  {/* Register Link */}
                  <Link
                    to="/auth?mode=register"
                    id="nav-register-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.03]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16 text-center">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold mb-6 shadow-inner backdrop-blur-md animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Ahsanullah University of Science and Technology • CSE Carnival 8.0</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-emerald-950 dark:text-white tracking-tight leading-[1.15] mb-6 max-w-4xl mx-auto">
            Unified Campus Intelligence &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400 bg-clip-text text-transparent">
              Real-Time AI Orchestration
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-emerald-900/80 dark:text-slate-300 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            A single, live source of truth for the entire campus. Effortlessly manage class routines, reserve lab slots with conflict detection, organize hackathon registrations, track assignments, and interact with our autonomous function-calling AI agent.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <Link
              to="/schedules"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/auth?mode=login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl glass-card hover:bg-emerald-50/80 dark:hover:bg-slate-800 text-emerald-950 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-white border border-emerald-300 dark:border-emerald-800/80 font-semibold text-sm sm:text-base shadow-md transition-all hover:scale-105"
            >
              <LogIn className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Sign In / Register</span>
            </Link>
          </div>

          {/* Key Stat Cards */}
          <div id="stats" className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {STATS.map((stat, idx) => (
              <div
                key={idx}
                className="glass-card rounded-2xl p-5 border border-emerald-500/20 dark:border-emerald-800/80 backdrop-blur-lg flex flex-col items-center justify-center shadow-lg"
              >
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-950 dark:text-white font-mono bg-gradient-to-tr from-emerald-700 to-teal-500 dark:from-white dark:to-emerald-200 bg-clip-text text-transparent">
                  {stat.value}
                </span>
                <span className="text-xs font-semibold text-emerald-800/80 dark:text-slate-400 mt-1 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Grid Section */}
        <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-white tracking-tight">
              Five Integrated Campus Systems + AI Orchestrator
            </h2>
            <p className="text-sm text-emerald-800/80 dark:text-slate-400 mt-2 max-w-xl mx-auto">
              Every system guarantees live read-write consistency without stale caches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SYSTEM_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <Link
                  key={idx}
                  to={feat.path}
                  className="glass-card glass-card-hover rounded-2xl p-6 border flex flex-col justify-between group cursor-pointer transition-all duration-300"
                >
                  <div>
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center mb-4 border transition-transform group-hover:scale-110`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <h3 className="text-lg font-bold text-emerald-950 dark:text-white mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                      <span>{feat.title}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-600 dark:text-emerald-400" />
                    </h3>

                    <p className="text-xs text-emerald-900/80 dark:text-slate-300 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-emerald-900/10 dark:border-emerald-800/80 flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <span>Manage {feat.title.split(' ')[0]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Highlights Banner */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 py-10 w-full">
          <div className="glass-card rounded-3xl p-8 sm:p-10 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-white/80 to-teal-500/10 dark:from-emerald-950/40 dark:via-black/80 dark:to-teal-950/30 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Live Backend & AI Synchronization
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-white">
                Experience CampusOS in Action
              </h3>
              <p className="text-xs sm:text-sm text-emerald-900/80 dark:text-slate-300 max-w-xl">
                Sign in with your student profile, edit data in the dashboard, open the AI agent, and ask it anything. Live functions ensure instant, accurate answers and zero stale caching.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                to="/auth?mode=register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-105"
              >
                <UserPlus className="w-5 h-5" />
                <span>Create Account</span>
              </Link>
              <Link
                to="/chat"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl glass-card text-emerald-950 dark:text-white font-bold text-sm shadow-md transition-all hover:scale-105"
              >
                <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>CampusCopilot</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-emerald-900/10 dark:border-emerald-800/80 bg-white/80 dark:bg-black/90 py-8 px-5 sm:px-8 mt-12 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-900/60 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-emerald-950 dark:text-slate-300">CampusOS</span>
            <span>•</span>
            <span>Ahsanullah University of Science and Technology (AUST)</span>
          </div>
          <div>
            Built for <strong className="text-emerald-900 dark:text-slate-400">CSE Carnival 8.0 AI-Build Hackathon</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
