import { Bell, Menu, Moon, Sun } from 'lucide-react'
import { SearchBar } from '../common/SearchBar'

interface TopBarProps { onMenu: () => void; title: string; darkMode: boolean; onToggleTheme: () => void }
export function TopBar({ onMenu, title, darkMode, onToggleTheme }: TopBarProps) {
  return <header className="topbar"><button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={21} /></button><div className="mobile-title">CampusOS</div><div className="topbar-title">{title}</div><div className="topbar-tools"><SearchBar /><button className="icon-button theme-toggle" onClick={onToggleTheme} aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Light mode' : 'Dark mode'}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button><div className="top-avatar">SH</div></div></header>
}
