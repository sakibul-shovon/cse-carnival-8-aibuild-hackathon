import type { LucideIcon } from 'lucide-react'

interface StatCardProps { label: string; value: string; note: string; icon: LucideIcon; tone: string }
export function StatCard({ label, value, note, icon: Icon, tone }: StatCardProps) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small className={tone === 'coral' ? 'warning' : ''}>{note}</small></div><div className="stat-trend">↗</div></article>
}
