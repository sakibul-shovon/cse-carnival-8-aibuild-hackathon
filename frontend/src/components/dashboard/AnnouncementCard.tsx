import { ArrowUpRight } from 'lucide-react'
import { Badge } from '../common/Badge'
import type { Announcement } from '../../types/campus'

export function AnnouncementCard({ item }: { item: Announcement }) {
  const tone = item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'amber' : 'slate'
  return <article className="announcement-card"><div className="announcement-top"><Badge tone={tone}>{item.priority} priority</Badge><span>{new Date(`${item.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div><h3>{item.title}</h3><p>{item.body}</p><footer><span>{item.posted_by}</span><ArrowUpRight size={16} /></footer></article>
}
