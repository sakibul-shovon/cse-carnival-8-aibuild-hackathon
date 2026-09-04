import { useEffect, useState } from 'react'
import { eventAPI } from '../services/api'
import type{ Event, EventRegistration } from '../types/index'

const EMPTY_EVENT = {
  name: '', description: '', date: '', start_time: '',
  end_time: '', venue: '', capacity: 0, status: 'upcoming',
}

const EMPTY_REG = { student_id: '', name: '' }

export default function EventSection() {
  const [events, setEvents]           = useState<Event[]>([])
  const [loading, setLoading]         = useState(true)
  const [showEventModal, setShowEventModal]   = useState(false)
  const [showRegModal, setShowRegModal]       = useState(false)
  const [editing, setEditing]         = useState<Event | null>(null)
  const [regEvent, setRegEvent]       = useState<Event | null>(null)
  const [form, setForm]               = useState(EMPTY_EVENT)
  const [regForm, setRegForm]         = useState(EMPTY_REG)

  const load = async () => {
    setLoading(true)
    const res = await eventAPI.getAll()
    setEvents(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(EMPTY_EVENT); setShowEventModal(true) }
  const openEdit = (e: Event) => {
    setEditing(e)
    setForm({ name: e.name, description: e.description, date: e.date,
      start_time: e.start_time, end_time: e.end_time,
      venue: e.venue, capacity: e.capacity, status: e.status })
    setShowEventModal(true)
  }

  const openReg = (e: Event) => { setRegEvent(e); setRegForm(EMPTY_REG); setShowRegModal(true) }

  const handleSave = async () => {
    if (editing) {
      await eventAPI.update(editing.id, form)
    } else {
      await eventAPI.create(form)
    }
    setShowEventModal(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event?')) return
    await eventAPI.delete(id)
    load()
  }

  const handleRegister = async () => {
    if (!regEvent) return
    await eventAPI.registerEvent(regEvent.id, regForm)
    setShowRegModal(false)
    load()
  }

  const handleCancelReg = async (eventId: number, regId: number) => {
    if (!confirm('Cancel this registration?')) return
    await eventAPI.cancelRegistration(eventId, regId)
    load()
  }

  const statusBadge = (status: string) => {
    if (status === 'upcoming')   return <span className="badge badge-blue">{status}</span>
    if (status === 'completed')  return <span className="badge badge-green">{status}</span>
    return <span className="badge badge-red">{status}</span>
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🎉 Events</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Event</button>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {events.map(e => (
            <div className="card" key={e.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ fontWeight: 600 }}>{e.name}</h3>
                {statusBadge(e.status)}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{e.description}</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>📍 {e.venue} · 📅 {e.date}</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                🕐 {e.start_time}–{e.end_time} · 👥 {e.registered}/{e.capacity}
              </p>

              {e.registrations && e.registrations.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Registrations:</p>
                  {e.registrations.map((r: EventRegistration) => (
                    <div key={r.id} style={{ background: '#0f172a', borderRadius: '6px', padding: '0.4rem 0.6rem', marginBottom: '0.25rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{r.name} ({r.student_id})</span>
                      <button className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        onClick={() => handleCancelReg(e.id, r.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => openEdit(e)}>Edit</button>
                <button className="btn-primary" onClick={() => openReg(e)}>Register</button>
                <button className="btn-danger" onClick={() => handleDelete(e.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showEventModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>{editing ? 'Edit Event' : 'Add Event'}</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ resize: 'none' }} />
              </div>
              <div className="form-group full-width">
                <label>Venue</label>
                <input value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {['upcoming','ongoing','completed','cancelled'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowEventModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Register for {regEvent?.name}</h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Student ID</label>
                <input value={regForm.student_id} onChange={e => setRegForm({...regForm, student_id: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Full Name</label>
                <input value={regForm.name} onChange={e => setRegForm({...regForm, name: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowRegModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleRegister}>Register</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}