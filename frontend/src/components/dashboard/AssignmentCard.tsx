import { CalendarClock, CheckCircle2, Circle } from 'lucide-react'
import { Badge } from '../common/Badge'
import type { Assignment } from '../../types/campus'

export function AssignmentCard({ item }: { item: Assignment }) {
  const submitted = item.status === 'submitted'
  return <article className="assignment-card"><div className="assignment-icon">{submitted ? <CheckCircle2 size={18} /> : <Circle size={18} />}</div><div className="assignment-main"><div className="course-row"><span className="course-code">{item.course}</span><Badge tone={submitted ? 'green' : 'amber'}>{submitted ? 'Submitted' : 'Pending'}</Badge></div><h3>{item.title}</h3><p>{item.course_title}</p><div className="deadline"><CalendarClock size={14} /> Due {new Date(`${item.deadline}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}<span>· {item.marks} marks</span></div></div></article>
}
