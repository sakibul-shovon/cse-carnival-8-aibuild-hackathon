import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { 
  CalendarDays, 
  DoorClosed, 
  Sparkles, 
  Megaphone, 
  BookOpenCheck, 
  Bot, 
  ArrowRight,
  Clock, 
  MapPin, 
  User, 
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardService.getStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Could not connect to CampusOS backend API. Make sure the Laravel backend is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-900 rounded-2xl border border-slate-800"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-900 rounded-2xl border border-slate-800"></div>
          <div className="h-80 bg-slate-900 rounded-2xl border border-slate-800"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-800/40 text-center max-w-lg mx-auto mt-12">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">Backend Connection Error</h3>
        <p className="text-sm text-rose-300 mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const counts = data?.counts || {};

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden p-6 md:p-8 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-slate-900 to-violet-950/60 border border-indigo-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> Welcome back to CampusOS
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              AUST Campus Intelligence Center
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time synchronization across schedules, room availability, campus events, and assignments powered by natural language AI.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/assistant"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
            >
              <Bot className="w-4 h-4" />
              Ask AI Assistant
            </Link>
            <button
              onClick={fetchDashboardData}
              title="Refresh live data"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Class Schedules</p>
            <h3 className="text-2xl font-bold text-white mt-1">{counts.schedules ?? 0}</h3>
            <span className="text-xs text-slate-500">Across 5 academic days</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Rooms Available</p>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">
              {counts.available_rooms ?? 0} <span className="text-sm font-normal text-slate-500">/ {counts.rooms ?? 0}</span>
            </h3>
            <span className="text-xs text-slate-500">Labs, Seminars, Classrooms</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DoorClosed className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Upcoming Events</p>
            <h3 className="text-2xl font-bold text-violet-400 mt-1">{counts.upcoming_events ?? 0}</h3>
            <span className="text-xs text-slate-500">{counts.events ?? 0} total on calendar</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-2xl font-bold text-amber-400 mt-1">{counts.pending_assignments ?? 0}</h3>
            <span className="text-xs text-slate-500">{counts.high_priority_announcements ?? 0} high priority notices</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Schedules & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Timetable Snippet */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Class Schedule Overview</h3>
              </div>
              <Link to="/schedules" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {data?.today_schedules?.slice(0, 4).map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {s.course}
                      </span>
                      <span className="text-xs font-semibold text-slate-300 truncate max-w-[180px] sm:max-w-xs">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-500" /> {s.day} {s.start_time}-{s.end_time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> Room {s.room}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-medium hidden sm:inline-block">
                    Sec {s.section || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold text-white text-base">Upcoming Campus Events</h3>
              </div>
              <Link to="/events" className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {data?.upcoming_events?.slice(0, 4).map((evt) => (
                <div key={evt.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">{evt.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                        {evt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3 text-slate-500" /> {evt.date} ({evt.start_time})</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> Venue: {evt.venue}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-indigo-400">{evt.registered}/{evt.capacity}</span>
                    <p className="text-[10px] text-slate-500">registered</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Announcements & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rose-400" />
              <h3 className="font-bold text-white text-base">Recent Notices & Bulletins</h3>
            </div>
            <Link to="/announcements" className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_announcements?.slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{ann.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ann.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {ann.priority} priority
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{ann.body}</p>
                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>By: {ann.posted_by}</span>
                  <span>Date: {ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments Deadline Watch */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-base">Assignments Due Soon</h3>
            </div>
            <Link to="/assignments" className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.upcoming_assignments?.slice(0, 3).map((asgn) => (
              <div key={asgn.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400">{asgn.course}</span>
                    <span className="text-xs font-semibold text-slate-200">{asgn.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Platform: {asgn.submission_platform}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-amber-400">Due: {asgn.deadline}</span>
                  <p className="text-[10px] text-slate-500">Marks: {asgn.marks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
