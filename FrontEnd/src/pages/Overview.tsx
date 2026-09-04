import { ArrowRight, Bell, Building2, CalendarDays, ClipboardCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { ErrorState, Loading } from '../components/ResourcePage'

export function Overview(){
  const schedules=useQuery({queryKey:['schedules'],queryFn:()=>api.list('schedules')})
  const rooms=useQuery({queryKey:['rooms'],queryFn:()=>api.list('rooms')})
  const events=useQuery({queryKey:['events'],queryFn:()=>api.list('events')})
  const announcements=useQuery({queryKey:['announcements'],queryFn:()=>api.list('announcements')})
  const assignments=useQuery({queryKey:['assignments'],queryFn:()=>api.list('assignments')})
  const me=useQuery({queryKey:['me'],queryFn:api.me})
  const results=[schedules,rooms,events,announcements,assignments]
  if(results.some(item=>item.isLoading))return <main className="page"><Loading/></main>
  if(results.some(item=>item.isError))return <main className="page"><ErrorState message="The campus API is unavailable." retry={()=>results.forEach(item=>item.refetch())}/></main>
  const pending=assignments.data!.items.filter(item=>item.status==='pending'); const nextEvents=events.data!.items.filter(item=>item.status==='upcoming').slice(0,3)
  return <main className="page">
    <div className="hero"><div className="hero-copy"><span className="eyebrow reveal-text">Friday, 4 September</span><h1><span className="reveal-line"><span>Good afternoon,</span></span><span className="reveal-line accent-line"><span>{me.data?.name.split(' ')[0]??'Sakibul'}.</span></span></h1><p className="reveal-text delay-2">Your campus, organized. Here’s what needs your attention.</p></div><div className="hero-orb"><span>{pending.length}</span><small>open tasks</small></div></div>
    <div className="stats">{[[<CalendarDays/>,schedules.data!.total,'Weekly classes','green'],[<Building2/>,rooms.data!.total,'Campus rooms','blue'],[<ClipboardCheck/>,pending.length,'Pending work','orange'],[<Bell/>,announcements.data!.total,'Announcements','purple']].map(([icon,value,label,color],index)=><Stat key={String(label)} icon={icon as React.ReactNode} value={value as number} label={label as string} color={color as string} index={index}/>)}</div>
    <div className="overview-grid"><section className="card panel"><PanelTitle title="Campus events" to="/events"/>{nextEvents.map(event=><div className="timeline-item" key={event.id}><div><strong>{new Date(`${event.date}T00:00:00`).getDate()}</strong><small>SEP</small></div><section><h3>{event.name}</h3><p>{event.start_time} · {event.venue}</p></section><span className="pill">{event.status}</span></div>)}</section><section className="card panel"><PanelTitle title="Assignments" to="/assignments"/>{pending.slice(0,4).map(item=><div className="deadline" key={item.id}><span>{item.course}</span><div><h3>{item.title}</h3><p>Due {item.deadline} · {item.marks} marks</p></div></div>)}</section></div>
  </main>
}
function PanelTitle({title,to}:{title:string;to:string}){return <div className="panel-title"><div><span className="eyebrow">Coming up</span><h2>{title}</h2></div><Link to={to}>View all <ArrowRight size={15}/></Link></div>}
function Stat({icon,value,label,color,index}:{icon:React.ReactNode;value:number;label:string;color:string;index:number}){return <div className="card stat animated-stat" style={{'--delay':`${index*70+280}ms`} as React.CSSProperties}><span className={color}>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>}
