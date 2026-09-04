import { useEffect, useState } from 'react'
import { assignmentAPI } from '../services/api'
import type{ Assignment } from '../types/index'

const EMPTY: Omit<Assignment, 'id'> = {
  course: '', course_title: '', title: '', description: '',
  deadline: '', submission_platform: '', status: 'pending', marks: 0,
}

export default function AssignmentSection() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<Assignment | null>(null)
  const [form, setForm]               = useState(EMPTY)

  const load = async () => {
    setLoading(true)
    const res = await assignmentAPI.getAll()
    setAssignments(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit = (a: Assignment) => {
    setEditing(a)
    setForm({ course: a.course, course_title: a.course_title, title: a.title,
      description: a.description, deadline: a.deadline,
      submission_platform: a.submission_platform, status: a.status, marks: a.marks || 0 })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (editing) {
      await assignmentAPI.update(editing.id, form)
    } else {
      await assignmentAPI.create(form)
    }
    setShowModal(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this assignment?')) return
    await assignmentAPI.delete(id)
    load()
  }

  const statusBadge = (s: string) => {
    if (s === 'completed') return <span className="badge badge-green">{s}</span>
    if (s === 'pending')   return <span className="badge badge-yellow">{s}</span>
    return <span className="badge badge-red">{s}</span>
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">📝 Assignments</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Assignment</button>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Course</th><th>Title</th><th>Deadline</th>
                <th>Platform</th><th>Marks</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a.id}>
                  <td>
                    <div><span className="badge badge-blue">{a.course}</span></div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.course_title}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{a.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.description}</div>
                  </td>
                  <td>{a.deadline}</td>
                  <td>{a.submission_platform}</td>
                  <td>{a.marks ?? '—'}</td>
                  <td>{statusBadge(a.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-secondary" onClick={() => openEdit(a)}>Edit</button>
                      <button className="btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>
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
              {editing ? 'Edit Assignment' : 'Add Assignment'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Course Code</label>
                <input value={form.course} onChange={e => setForm({...form, course: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Course Title</label>
                <input value={form.course_title} onChange={e => setForm({...form, course_title: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Assignment Title</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Description</label>
                <textarea rows={2} value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  style={{ resize: 'none' }} />
              </div>
              <div className="form-group">
                <label>Deadline</label>
                <input type="datetime-local" value={form.deadline}
                  onChange={e => setForm({...form, deadline: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Submission Platform</label>
                <input value={form.submission_platform}
                  onChange={e => setForm({...form, submission_platform: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {['pending','completed','overdue'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Marks</label>
                <input type="number" value={form.marks}
                  onChange={e => setForm({...form, marks: +e.target.value})} />
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