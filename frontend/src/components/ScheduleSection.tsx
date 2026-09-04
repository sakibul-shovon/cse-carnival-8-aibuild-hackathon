import { useEffect, useState } from 'react'
import { scheduleAPI } from '../services/api'
import type{ Schedule } from '../types/index'

const EMPTY: Omit<Schedule, 'id'> = {
  course: '', title: '', day: '', start_time: '',
  end_time: '', room: '', instructor: '', section: '',
}

const DAYS = ['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday']

export default function ScheduleSection() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState<Schedule | null>(null)
  const [form, setForm]           = useState(EMPTY)

  const load = async () => {
    setLoading(true)
    const res = await scheduleAPI.getAll()
    setSchedules(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (s: Schedule) => {
    setEditing(s)
    setForm({ course: s.course, title: s.title, day: s.day,
      start_time: s.start_time, end_time: s.end_time,
      room: s.room, instructor: s.instructor, section: s.section })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editing) {
      await scheduleAPI.update(editing.id, form)
    } else {
      await scheduleAPI.create(form)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this schedule?')) return
    await scheduleAPI.delete(id)
    load()
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📅 Schedules</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Schedule</button>
      </div>

      {loading ? (
        <p style={{ color: '#64748b' }}>Loading...</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Course</th><th>Title</th><th>Day</th>
                <th>Time</th><th>Room</th><th>Instructor</th><th>Section</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map(s => (
                <tr key={s.id}>
                  <td><span className="badge badge-blue">{s.course}</span></td>
                  <td>{s.title}</td>
                  <td>{s.day}</td>
                  <td>{s.start_time} – {s.end_time}</td>
                  <td>{s.room}</td>
                  <td>{s.instructor}</td>
                  <td>{s.section}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" onClick={() => openEdit(s)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(s.id)}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
              {editing ? 'Edit Schedule' : 'Add Schedule'}
            </h3>
            <div className="form-grid">
              {(['course','title','room','instructor','section'] as const).map(field => (
                <div className="form-group" key={field}>
                  <label>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                  <input value={form[field]} onChange={e => setForm({...form, [field]: e.target.value})} />
                </div>
              ))}
              <div className="form-group">
                <label>Day</label>
                <select value={form.day} onChange={e => setForm({...form, day: e.target.value})}>
                  <option value="">Select day</option>
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}