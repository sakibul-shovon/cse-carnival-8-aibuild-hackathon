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
  GraduationCap,
  BookOpen,
  Users,
  Plus,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function Overview() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
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
        <div className="h-32 bg-white rounded-3xl border border-slate-200"></div>
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition shadow-xs cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const counts = data?.counts || {};
  const todaySchedules = data?.today_schedules || [];
  const recentAssignments = data?.recent_assignments || [];
  const upcomingEvents = data?.upcoming_events || [];
  const latestAnnouncements = data?.latest_announcements || [];
  const myCourses = data?.my_courses || [];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className={`relative overflow-hidden p-6 md:p-8 rounded-3xl text-white shadow-lg ${
        isAdmin 
          ? 'bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800' 
          : isTeacher
          ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700'
          : 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700'
      }`}>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-semibold mb-3 border border-white/20">
              {isAdmin ? <Shield className="w-3.5 h-3.5 text-emerald-200" /> : isTeacher ? <BookOpen className="w-3.5 h-3.5 text-amber-200" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-200" />}
              {isAdmin ? 'CampusOS Administrator Hub' : isTeacher ? 'Faculty & Instructor Portal' : 'Student Academic Portal'}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.name || 'User'}!
            </h1>
            <p className="text-sm text-white/90 mt-1 max-w-2xl font-normal leading-relaxed">
              {isAdmin && 'Full university operations control: live schedules, course catalog, lab reservations, events, and AI agent execution.'}
              {isTeacher && 'Manage your teaching courses, track enrolled students, publish assignments, and create announcements.'}
              {isStudent && 'Your personalized academic hub: enrolled courses, today\'s classes, pending coursework, and live AI assistant.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/assistant"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-50 text-sm font-bold transition shadow-md cursor-pointer"
            >
              <Bot className="w-4 h-4 text-indigo-600" />
              Ask AI Agent
            </Link>
            <button
              onClick={fetchDashboardData}
              title="Refresh live data"
              className="p-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition border border-white/20 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Courses */}
        <Link to="/courses" className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-indigo-300 hover:shadow-sm transition group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isTeacher ? 'My Teaching Courses' : isStudent ? 'Enrolled Courses' : 'Total Courses'}
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
              {counts.courses ?? (isTeacher || isStudent ? (counts.my_courses ?? myCourses.length) : 0)}
            </h3>
            <span className="text-xs text-indigo-600 font-semibold group-hover:underline">
              View Curriculum &rarr;
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
        </Link>

        {/* Card 2: Schedules */}
        <Link to="/schedules" className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-emerald-300 hover:shadow-sm transition group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isTeacher ? 'Today\'s Classes' : 'Class Schedules'}
            </p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">
              {counts.today_schedules ?? counts.schedules ?? 0}
            </h3>
            <span className="text-xs text-emerald-600 font-semibold group-hover:underline">
              Timetable &rarr;
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <CalendarDays className="w-6 h-6" />
          </div>
        </Link>

        {/* Card 3: Assignments */}
        <Link to="/assignments" className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-amber-300 hover:shadow-sm transition group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isTeacher ? 'Assignments Given' : 'Pending Coursework'}
            </p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
              {counts.assignments ?? 0}
            </h3>
            <span className="text-xs text-amber-600 font-semibold group-hover:underline">
              Deadlines & Tasks &rarr;
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </Link>

        {/* Card 4: Events / Rooms */}
        <Link to={isAdmin ? "/rooms" : "/events"} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between hover:border-purple-300 hover:shadow-sm transition group">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAdmin ? 'Rooms Available' : 'Upcoming Events'}
            </p>
            <h3 className="text-2xl font-extrabold text-purple-600 mt-1">
              {isAdmin ? (counts.available_rooms ?? counts.rooms ?? 0) : (counts.upcoming_events ?? counts.events ?? 0)}
            </h3>
            <span className="text-xs text-purple-600 font-semibold group-hover:underline">
              {isAdmin ? 'View Inventory &rarr;' : 'Explore Events &rarr;'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
            {isAdmin ? <DoorClosed className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </div>
        </Link>
      </div>

      {/* Two Column Grid: Today's Schedule & My Courses / Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: Today's Classes */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Today's Class Schedule</h2>
                  <p className="text-xs text-slate-500">Live database timetable for Friday / Academic Day</p>
                </div>
              </div>
              <Link to="/schedules" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                View All
              </Link>
            </div>

            {todaySchedules.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No classes scheduled for today.
              </div>
            ) : (
              <div className="space-y-3">
                {todaySchedules.slice(0, 4).map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-black">
                          {s.course}
                        </span>
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{s.title}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {s.start_time} - {s.end_time}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          Room {s.room}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      Sec {s.section || 'A'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to="/schedules"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 text-xs font-bold text-indigo-600 border border-slate-200/80 transition"
            >
              <span>Explore Full 5-Day Weekly Routine</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Column 2: Courses & Active Coursework */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
                  <BookOpenCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isTeacher ? 'Assigned Teaching Courses' : 'Active Coursework & Deadlines'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isTeacher ? 'Course enrollment and student capacity' : 'Upcoming assignment submissions'}
                  </p>
                </div>
              </div>
              <Link to={isTeacher ? "/courses" : "/assignments"} className="text-xs font-bold text-amber-600 hover:text-amber-700">
                Manage
              </Link>
            </div>

            {isTeacher ? (
              myCourses.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  You have not been assigned to any courses yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {myCourses.slice(0, 4).map((c) => (
                    <div key={c.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-black">
                            {c.course_code}
                          </span>
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{c.course_name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{c.credits} Credits &bull; Section Active</p>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          <Users className="w-3 h-3 text-slate-400" />
                          {c.enrolled_count || 0}/{c.capacity || 40}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              recentAssignments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  <BookOpenCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  No pending assignments due at this time.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAssignments.slice(0, 4).map((a) => (
                    <div key={a.id} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-black">
                            {a.course}
                          </span>
                          <span className="text-xs font-bold text-slate-800 line-clamp-1">{a.title}</span>
                        </div>
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">Due: {a.deadline}</p>
                      </div>
                      <span className="text-xs font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        {a.marks} Marks
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100">
            <Link
              to={isTeacher ? "/courses" : "/assignments"}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-amber-50 text-xs font-bold text-amber-700 border border-slate-200/80 transition"
            >
              <span>{isTeacher ? 'View All Teaching Courses' : 'View All Assignments & Submissions'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3: Official Announcements & Campus Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latest Announcements */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Official Notices & Circulars</h2>
                <p className="text-xs text-slate-500">Departmental bulletins and exam notices</p>
              </div>
            </div>
            <Link to="/announcements" className="text-xs font-bold text-rose-600 hover:text-rose-700">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {latestAnnouncements.slice(0, 3).map((ann) => (
              <div key={ann.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{ann.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    ann.priority === 'high' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">{ann.body}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>By: {ann.posted_by}</span>
                  <span>Date: {ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Upcoming Campus Events</h2>
                <p className="text-xs text-slate-500">Workshops, hackathons & guest lectures</p>
              </div>
            </div>
            <Link to="/events" className="text-xs font-bold text-purple-600 hover:text-purple-700">
              View All
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingEvents.slice(0, 3).map((evt) => (
              <div key={evt.id} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">{evt.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {evt.date} &bull; {evt.start_time} - {evt.end_time} &bull; Venue: {evt.venue}
                  </p>
                  <p className="text-[10px] text-purple-600 font-semibold mt-1">
                    {evt.registered || 0}/{evt.capacity || 50} Registered
                  </p>
                </div>
                <Link
                  to="/events"
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition"
                >
                  Details
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
