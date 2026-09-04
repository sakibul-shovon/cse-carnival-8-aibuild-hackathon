import { NavLink } from 'react-router-dom'
import { BarChart3, Bell, CalendarDays, ClipboardList, DoorOpen, LayoutDashboard, Settings, Sparkles, Users, X } from 'lucide-react'

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/rooms', label: 'Rooms', icon: DoorOpen },
  { to: '/events', label: 'Events', icon: Users },
  { to: '/announcements', label: 'Announcements', icon: Bell },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
]

interface SidebarProps { open: boolean; onClose: () => void }
export function Sidebar({ open, onClose }: SidebarProps) {
  return <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
    <div className="brand"><span className="brand-mark"><BarChart3 size={21} /></span><span>Campus<span>OS</span></span><button className="icon-button sidebar-close" onClick={onClose} aria-label="Close menu"><X size={19} /></button></div>
    <div className="nav-label">Workspace</div>
    <nav>{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}><Icon size={18} /><span>{label}</span></NavLink>)}</nav>
    <div className="sidebar-bottom">
      <NavLink to="/ai-assistant" onClick={onClose} className="assistant-link"><Sparkles size={18} /><span>AI Assistant</span><span className="new-dot">NEW</span></NavLink>
      <NavLink to="/settings" onClick={onClose} className="nav-link"><Settings size={18} /><span>Settings</span></NavLink>
      <div className="profile"><div className="avatar">SH</div><div><strong>Sakibul Hassan</strong><small>Student · 20-40532</small></div><span className="status-dot" /></div>
    </div>
  </aside>
}
