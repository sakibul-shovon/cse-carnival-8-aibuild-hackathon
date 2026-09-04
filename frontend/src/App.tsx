import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AlertCircle, ArrowUpRight, CalendarDays, ClipboardList, Plus, Users } from 'lucide-react'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { StatCard } from './components/dashboard/StatCard'
import { ScheduleCard } from './components/dashboard/ScheduleCard'
import { AssignmentCard } from './components/dashboard/AssignmentCard'
import { EventCard } from './components/dashboard/EventCard'
import { AnnouncementCard } from './components/dashboard/AnnouncementCard'
import { QuickActions } from './components/dashboard/QuickActions'
import { announcements, assignments, events, schedules } from './data/mockData'
import { AnnouncementsPage, AssignmentsPage, EventsPage, RoomsPage, SchedulePage } from './pages/ManagementPages'
import { AssistantPage } from './pages/AssistantPage'
import { SettingsPage } from './pages/SettingsPage'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import './App.css'

const titles: Record<string, string> = { '/dashboard': 'Dashboard', '/schedule': 'Schedule', '/rooms': 'Rooms', '/events': 'Events', '/announcements': 'Announcements', '/assignments': 'Assignments', '/ai-assistant': 'AI Assistant', '/settings': 'Settings' }

function PageHeading({ eyebrow, title, copy, action }: { eyebrow?: string; title: string; copy?: string; action?: string }) {
  return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{copy && <p>{copy}</p>}</div>{action && <button className="primary-button"><Plus size={17} /> {action}</button>}</div>
}

function Dashboard() {
  const today = schedules.filter((item) => item.day === 'Sunday')
  return <div className="dashboard"><PageHeading eyebrow="Sunday, September 6, 2026" title="Good morning, Student 👋" copy="Here's what's happening around campus today." /><section className="stat-grid"><StatCard label="Today's classes" value={String(today.length).padStart(2, '0')} note="2 classes left" icon={CalendarDays} tone="blue" /><StatCard label="Upcoming assignments" value="04" note="Next due in 3 days" icon={ClipboardList} tone="violet" /><StatCard label="Upcoming events" value="08" note="Across campus" icon={Users} tone="mint" /><StatCard label="Important announcements" value="03" note="Needs your attention" icon={AlertCircle} tone="coral" /></section><QuickActions /><div className="dashboard-grid"><section className="panel schedule-panel"><div className="panel-heading"><div><span className="eyebrow">Your day</span><h2>Today's schedule</h2></div><a href="/schedule">View calendar <ArrowUpRight size={15} /></a></div><div className="schedule-list">{today.map((item) => <ScheduleCard key={item.id} item={item} />)}</div></section><section className="panel announcements-panel"><div className="panel-heading"><div><span className="eyebrow">Stay informed</span><h2>Latest announcements</h2></div><a href="/announcements">View all <ArrowUpRight size={15} /></a></div>{announcements.slice(0, 3).map((item) => <AnnouncementCard key={item.id} item={item} />)}</section><section className="panel assignments-panel"><div className="panel-heading"><div><span className="eyebrow">Keep moving</span><h2>Upcoming assignments</h2></div><a href="/assignments">View all <ArrowUpRight size={15} /></a></div>{assignments.slice(0, 3).map((item) => <AssignmentCard key={item.id} item={item} />)}</section><section className="panel events-panel"><div className="panel-heading"><div><span className="eyebrow">On campus</span><h2>Upcoming events</h2></div><a href="/events">View all <ArrowUpRight size={15} /></a></div>{events.slice(0, 2).map((item) => <EventCard key={item.id} item={item} />)}</section></div></div>
}

function AppShell() {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('campusos-theme') === 'dark')
  const title = titles[location.pathname] ?? 'Dashboard'
  useEffect(() => { localStorage.setItem('campusos-theme', darkMode ? 'dark' : 'light') }, [darkMode])

  if (loading) return <div className="auth-loading">Loading CampusOS...</div>
  if (!user) return <Routes><Route path="/register" element={<RegisterPage />} /><Route path="*" element={<LoginPage />} /></Routes>
  return <div className={`app-shell ${darkMode ? 'dark-theme' : ''}`}><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />{menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}<main className="main-content"><TopBar title={title} onMenu={() => setMenuOpen(true)} darkMode={darkMode} onToggleTheme={() => setDarkMode((current) => !current)} /><div className="content-wrap"><Routes><Route path="/dashboard" element={<Dashboard />} /><Route path="/schedule" element={<SchedulePage />} /><Route path="/rooms" element={<RoomsPage />} /><Route path="/events" element={<EventsPage />} /><Route path="/announcements" element={<AnnouncementsPage />} /><Route path="/assignments" element={<AssignmentsPage />} /><Route path="/ai-assistant" element={<AssistantPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/dashboard" replace />} /></Routes></div></main></div>
}

export default function App() { return <BrowserRouter><AuthProvider><AppShell /></AuthProvider></BrowserRouter> }
