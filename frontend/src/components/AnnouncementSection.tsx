import { useEffect, useState } from 'react'
import { announcementAPI } from '../services/api'
import type{ Announcement } from '../types/index'

const EMPTY: Omit<Announcement, 'id'> = {
  title: '', body: '', date: '', priority: 'medium', posted_by: '', expires: '',
}

export default function AnnouncementSection() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading]             = useState(true)
  const [showModal, setShowModal]         = useState(false)
  const [editing, setEditing]             = useState<Announcement | null>(null)
  const [form, setForm]                   = useState(EMPTY)

  const load = async () => {
    setLoading(true)
    const res = await announcementAPI.getAll()
    setAnnouncements(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({ title: a.title, body: a.body, date: a.date,
      priority: a.priority, posted_by: a.posted_by, expires: a.expires || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editing) {
      await announcementAPI.update(editing.id, form)
    } else {
      await announcementAPI.create(form)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this announcement?')) return
    await announcementAPI.delete(id)
    load()
  }

  const priorityBadge = (p: string) => {
    if (p === 'high')   return <span className="badge badge-red">{p}</span>
    if (p === 'medium') return <span className="badge badge-yellow">{p}</span>
    return <span className="badge badge-green">{p}</span>
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📢 Announcements</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Announcement</button>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {announcements.map(a => (
            <div className="card" key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3 style={{ fontWeight: 600 }}>{a.title}</h3>
                  {priorityBadge(a.priority)}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" onClick={() => openEdit(a)}>Edit</button>
                  <button className="btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{a.body}</p>
              <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span>👤 {a.posted_by}</span>
                <span>📅 {a.date}</span>
                {a.expires && <span>⏳ Expires: {a.expires}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
              {editing ? 'Edit Announcement' : 'Add Announcement'}
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Body</label>
                <textarea rows={3} value={form.body}
                  onChange={e => setForm({...form, body: e.target.value})}
                  style={{ resize: 'none' }} />
              </div>
              <div className="form-group">
                <label>Posted By</label>
                <input value={form.posted_by} onChange={e => setForm({...form, posted_by: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as 'low'|'medium'|'high'})}>
                  {['low','medium','high'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Expires (optional)</label>
                <input type="date" value={form.expires} onChange={e => setForm({...form, expires: e.target.value})} />
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