import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import { Badge } from '../common/Badge'
import type { Event } from '../../types/campus'

export function EventCard({ item }: { item: Event }) {
  const date = new Date(`${item.date}T00:00:00`)
  return <article className="event-card"><div className="event-date"><strong>{date.toLocaleDateString('en-US', { day: '2-digit' })}</strong><span>{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span></div><div className="event-main"><div className="event-heading"><Badge tone="blue">{item.status}</Badge><span>{item.registered}/{item.capacity} registered</span></div><h3>{item.name}</h3><div className="meta"><span><CalendarDays size={14} /> {item.start_time} - {item.end_time}</span><span><MapPin size={14} /> {item.venue}</span><span><UserRound size={14} /> {item.organizer}</span></div></div><button className="outline-button" onClick={() => window.alert(`Registration reserved for ${item.name}`)}>Register</button></article>
}
