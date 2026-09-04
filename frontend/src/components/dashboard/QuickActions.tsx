import { BellPlus, CalendarPlus, ClipboardPlus, DoorOpen } from 'lucide-react'

const actions = [{ label: 'Add event', icon: CalendarPlus }, { label: 'Book room', icon: DoorOpen }, { label: 'Add announcement', icon: BellPlus }, { label: 'Add assignment', icon: ClipboardPlus }]
export function QuickActions() { return <div className="quick-actions">{actions.map(({ label, icon: Icon }) => <button key={label} className="quick-action" onClick={() => window.alert(`${label} is ready for local setup.`)}><span><Icon size={17} /></span>{label}<b>+</b></button>)}</div> }
