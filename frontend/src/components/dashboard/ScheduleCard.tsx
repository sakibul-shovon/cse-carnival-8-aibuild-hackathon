import { Clock3, MapPin, UserRound } from 'lucide-react'
import type { Schedule } from '../../types/campus'

export function ScheduleCard({ item }: { item: Schedule }) {
  return <article className="schedule-item"><div className="schedule-time"><strong>{item.start_time}</strong><span>{item.end_time}</span></div><div className="timeline-line"><i /></div><div className="schedule-info"><div className="course-row"><span className="course-code">{item.course}</span><span className="section">Section {item.section}</span></div><h3>{item.title}</h3><div className="meta"><span><Clock3 size={14} /> {item.start_time} - {item.end_time}</span><span><MapPin size={14} /> Room {item.room}</span><span><UserRound size={14} /> {item.instructor}</span></div></div></article>
}
