import { Bell, Bot, Building2, CalendarDays, ClipboardCheck, LayoutDashboard, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import { Overview } from './pages/Overview'
import { Schedules, Announcements, Assignments } from './pages/Resources'
import { Rooms } from './pages/Rooms'
import { Events } from './pages/Events'
import { Assistant } from './pages/Assistant'
import { usePremiumPointer } from './usePremiumPointer'

const links = [
  ['/', LayoutDashboard, 'Overview'], ['/schedules', CalendarDays, 'Schedule'], ['/rooms', Building2, 'Rooms'],
  ['/events', CalendarDays, 'Events'], ['/announcements', Bell, 'Announcements'], ['/assignments', ClipboardCheck, 'Assignments'], ['/assistant', Bot, 'AI assistant'],
] as const

export function App() {
  usePremiumPointer()
  const [open, setOpen] = useState(false)
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: api.me })
  
  return <div className="app-shell">
    <header className="top-nav">
      <div className="brand">
        <span className="brand-mark">C</span>
        <div className="brand-copy"><strong>CampusOS</strong><small>AUST • CSE</small></div>
      </div>
      
      <nav className={open ? 'nav-links open' : 'nav-links'} aria-label="Primary navigation">
        {links.map(([to, Icon, label], index) => 
          <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} style={{'--nav-index':index} as React.CSSProperties}>
            <span className="nav-icon"><Icon size={18}/></span>
            <span className="nav-label">{label}</span>
            <i className="nav-spark"/>
          </NavLink>
        )}
      </nav>
      
      <div className="top-nav-actions">
        <div className="status-indicator"><span className="status-dot" title="Mock API connected"/></div>
        <div className="profile" title={`${user?.name ?? 'Loading…'} - ${user?.student_id ?? 'Campus account'}`}>
          <span>{user?.name.split(' ').map(x => x[0]).slice(0,2).join('') ?? 'SH'}</span>
        </div>
        <button className="icon-button menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X/> : <Menu/>}
        </button>
      </div>
    </header>
    
    {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)}/>} 
    
    <section className="content">
      <Routes>
        <Route path="/" element={<Overview/>}/>
        <Route path="/schedules" element={<Schedules/>}/>
        <Route path="/rooms" element={<Rooms/>}/>
        <Route path="/events" element={<Events/>}/>
        <Route path="/announcements" element={<Announcements/>}/>
        <Route path="/assignments" element={<Assignments/>}/>
        <Route path="/assistant" element={<Assistant/>}/>
        <Route path="*" element={<Navigate to="/" replace/>}/>
      </Routes>
    </section>
  </div>
}
