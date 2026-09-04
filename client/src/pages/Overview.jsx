import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardService } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  RefreshCw,
  Shield,
  GraduationCap
} from 'lucide-react';

export default function Overview() {
  const { user, isAdmin } = useAuth();
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
        <div className="h-28 bg-white rounded-2xl border border-slate-200"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white rounded-2xl border border-slate-200"></div>
          <div className="h-80 bg-white rounded-2xl border border-slate-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Backend Connection Error</h3>
        <p className="text-sm text-rose-600 mb-6">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-xs"
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
      <div className={`relative overflow-hidden p-6 md:p-8 rounded-3xl text-white shadow-lg ${
        isAdmin 
          ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800' 
          : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold mb-3 border border-white/20">
              {isAdmin ? <Shield className="w-3.5 h-3.5 text-amber-300" /> : <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              {isAdmin ? 'CampusOS Administrator Hub' : 'Student Portal'}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'Student'}!
            </h1>
            <p className="text-sm text-indigo-100 mt-1 max-w-2xl font-normal leading-relaxed">
              {isAdmin 
                ? 'Manage campus schedules, lab inventory, event registrations, and departmental broadcasts in real-time.' 
                : 'Real-time synchronization across schedules, room availability, campus events, and assignments powered by natural language AI.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/assistant"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-bold transition shadow-md"
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              Ask AI Assistant
            </Link>
            <button
              onClick={fetchDashboardData}
              title="Refresh live data"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition border border-white/20"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class Schedules</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{counts.schedules ?? 0}</h3>
            <span className="text-xs text-slate-500">Across 5 academic days</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rooms Available</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
              {counts.available_rooms ?? 0} <span className="text-sm font-normal text-slate-400">/ {counts.rooms ?? 0}</span>
            </h3>
            <span className="text-xs text-slate-500">Labs, Seminars, Classrooms</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <DoorClosed className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Upcoming Events</p>
            <h3 className="text-2xl font-extrabold text-violet-600 mt-1">{counts.upcoming_events ?? 0}</h3>
            <span className="text-xs text-slate-500">{counts.events ?? 0} total on calendar</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-slate-300 transition">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Tasks</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{counts.pending_assignments ?? 0}</h3>
            <span className="text-xs text-slate-500">{counts.high_priority_announcements ?? 0} high priority notices</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Schedules & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Class Timetable Snippet */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-base">Class Schedule Overview</h3>
              </div>
              <Link to="/schedules" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {data?.today_schedules?.slice(0, 4).map((s) => (
                <div key={s.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/80 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-700">
                        {s.course}
                      </span>
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-xs">{s.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /> {s.day} {s.start_time}-{s.end_time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Room {s.room}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold hidden sm:inline-block shadow-2xs">
                    Sec {s.section || 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="font-bold text-slate-800 text-base">Upcoming Campus Events</h3>
              </div>
              <Link to="/events" className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {data?.upcoming_events?.slice(0, 4).map((evt) => (
                <div key={evt.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/80 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{evt.name}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-violet-100 text-violet-700">
                        {evt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5 text-slate-400" /> {evt.date} ({evt.start_time})</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> Venue: {evt.venue}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-600">{evt.registered}/{evt.capacity}</span>
                    <p className="text-[10px] text-slate-400">registered</p>
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
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-800 text-base">Recent Notices & Bulletins</h3>
            </div>
            <Link to="/announcements" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_announcements?.slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5 hover:bg-slate-100/80 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">{ann.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    ann.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {ann.priority} priority
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{ann.body}</p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 font-medium">
                  <span>By: {ann.posted_by}</span>
                  <span>Date: {ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignments Deadline Watch */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-800 text-base">Assignments Due Soon</h3>
            </div>
            <Link to="/assignments" className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.upcoming_assignments?.slice(0, 3).map((asgn) => (
              <div key={asgn.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/80 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">{asgn.course}</span>
                    <span className="text-xs font-bold text-slate-800">{asgn.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Platform: {asgn.submission_platform}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Due: {asgn.deadline}</span>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Marks: {asgn.marks}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
