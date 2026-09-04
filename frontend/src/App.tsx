import { useState } from 'react'
import ScheduleSection from './components/ScheduleSection'
import RoomSection from './components/RoomSection'
import EventSection from './components/EventSection.tsx'
import AnnouncementSection from './components/AnnouncementSection.tsx'
import AssignmentSection from './components/AssignmentSection.tsx'
// import AgentChat from './components/AgentChat'

const NAV_ITEMS = [
  { key: 'schedules', label: '📅 Schedules' },
  { key: 'rooms', label: '🚪 Rooms' },
  { key: 'events', label: '🎉 Events' },
  { key: 'announcements', label: '📢 Announcements' },
  { key: 'assignments', label: '📝 Assignments' },
]

export default function App() {
  const [active, setActive] = useState('schedules')
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: '#1e293b',
        borderRight: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        gap: '0.5rem',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#6366f1' }}>CampusOS</h1>
          <p style={{ fontSize: '0.7rem', color: '#64748b' }}>AI Build Hackathon</p>
        </div>

        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            style={{
              background: active === item.key ? '#6366f1' : 'transparent',
              color: active === item.key ? 'white' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '0.6rem 1rem',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: active === item.key ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            {item.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto' }}>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            🤖 AI Agent
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '220px', flex: 1, padding: '2rem' }}>
        {active === 'schedules'     && <ScheduleSection />}
        {active === 'rooms'         && <RoomSection />}
        {active === 'events'        && <EventSection />}
        {active === 'announcements' && <AnnouncementSection />}
        {active === 'assignments'   && <AssignmentSection />}
      </main>

      {/* AI Chat Sidebar */}
      {chatOpen && (
        <div style={{
          position: 'fixed',
          right: 0, top: 0, bottom: 0,
          width: '380px',
          background: '#1e293b',
          borderLeft: '1px solid #334155',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #334155',
          }}>
            <span style={{ fontWeight: 600 }}>🤖 AI Agent</span>
            <button onClick={() => setChatOpen(false)} className="btn-secondary">✕</button>
          </div>
          {/* <AgentChat /> */}
        </div>
      )}
    </div>
  )
}