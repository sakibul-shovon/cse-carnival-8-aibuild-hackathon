import { Bell, Menu } from 'lucide-react'
import { SearchBar } from '../common/SearchBar'

interface TopBarProps { onMenu: () => void; title: string }
export function TopBar({ onMenu, title }: TopBarProps) {
  return <header className="topbar"><button className="icon-button menu-button" onClick={onMenu} aria-label="Open menu"><Menu size={21} /></button><div className="mobile-title">CampusOS</div><div className="topbar-title">{title}</div><div className="topbar-tools"><SearchBar /><button className="icon-button notification" aria-label="Notifications"><Bell size={19} /><i /></button><div className="top-avatar">SH</div></div></header>
}
