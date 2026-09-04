import { useEffect, useState } from 'react'
import { roomAPI } from '../services/api'
import type{ Room, RoomBooking } from '../types/index'

const EMPTY_ROOM = {
  room_number: '', type: '', capacity: 0,
  equipment: [] as string[], floor: '', status: 'available',
}

const EMPTY_BOOKING = {
  booked_by: '', date: '', start_time: '', end_time: '', purpose: '',
}

export default function RoomSection() {
  const [rooms, setRooms]             = useState<Room[]>([])
  const [loading, setLoading]         = useState(true)
  const [showRoomModal, setShowRoomModal]       = useState(false)
  const [showBookModal, setShowBookModal]       = useState(false)
  const [editing, setEditing]         = useState<Room | null>(null)
  const [bookingRoom, setBookingRoom] = useState<Room | null>(null)
  const [form, setForm]               = useState(EMPTY_ROOM)
  const [bookForm, setBookForm]       = useState(EMPTY_BOOKING)
  const [equipInput, setEquipInput]   = useState('')

  const load = async () => {
    setLoading(true)
    const res = await roomAPI.getAll()
    setRooms(res.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY_ROOM)
    setEquipInput('')
    setShowRoomModal(true)
  }

  const openEdit = (r: Room) => {
    setEditing(r)
    setForm({ room_number: r.room_number, type: r.type, capacity: r.capacity,
      equipment: r.equipment, floor: r.floor, status: r.status })
    setEquipInput(r.equipment.join(', '))
    setShowRoomModal(true)
  }

  const openBook = (r: Room) => {
    setBookingRoom(r)
    setBookForm(EMPTY_BOOKING)
    setShowBookModal(true)
  }

  const handleSave = async () => {
    const data = { ...form, equipment: equipInput.split(',').map(e => e.trim()).filter(Boolean) }
    if (editing) {
      await roomAPI.update(editing.id, data)
    } else {
      await roomAPI.create(data)
    }
    setShowRoomModal(false)
    load()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this room?')) return
    await roomAPI.delete(id)
    load()
  }

  const handleBook = async () => {
    if (!bookingRoom) return
    await roomAPI.bookRoom(bookingRoom.id, bookForm)
    setShowBookModal(false)
    load()
  }

  const handleCancelBooking = async (roomId: number, bookingId: number) => {
    if (!confirm('Cancel this booking?')) return
    await roomAPI.cancelBooking(roomId, bookingId)
    load()
  }

  const statusBadge = (status: string) => {
    if (status === 'available') return <span className="badge badge-green">{status}</span>
    if (status === 'occupied')  return <span className="badge badge-red">{status}</span>
    return <span className="badge badge-yellow">{status}</span>
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🚪 Rooms</h2>
        <button className="btn-primary" onClick={openAdd}>+ Add Room</button>
      </div>

      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {rooms.map(r => (
            <div className="card" key={r.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Room {r.room_number}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{r.type} · Floor {r.floor} · Cap: {r.capacity}</p>
                </div>
                {statusBadge(r.status)}
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Equipment:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {r.equipment.map((e, i) => (
                    <span key={i} className="badge badge-blue" style={{ fontSize: '0.7rem' }}>{e}</span>
                  ))}
                </div>
              </div>

              {r.bookings && r.bookings.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem' }}>Bookings:</p>
                  {r.bookings.map((b: RoomBooking) => (
                    <div key={b.id} style={{ background: '#0f172a', borderRadius: '6px', padding: '0.4rem 0.6rem', marginBottom: '0.25rem', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{b.booked_by} · {b.date} · {b.start_time}–{b.end_time}</span>
                      <button className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        onClick={() => handleCancelBooking(r.id, b.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn-secondary" onClick={() => openEdit(r)}>Edit</button>
                <button className="btn-primary" onClick={() => openBook(r)}>Book</button>
                <button className="btn-danger" onClick={() => handleDelete(r.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room Modal */}
      {showRoomModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
              {editing ? 'Edit Room' : 'Add Room'}
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Room Number</label>
                <input value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                  <option value="">Select type</option>
                  {['Classroom','Lab','Seminar Room','Auditorium','Conference Room'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input type="number" value={form.capacity} onChange={e => setForm({...form, capacity: +e.target.value})} />
              </div>
              <div className="form-group">
                <label>Floor</label>
                <input value={form.floor} onChange={e => setForm({...form, floor: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  {['available','occupied','maintenance'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group full-width">
                <label>Equipment (comma separated)</label>
                <input value={equipInput} onChange={e => setEquipInput(e.target.value)} placeholder="Projector, Whiteboard, AC" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowRoomModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {showBookModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>
              Book Room {bookingRoom?.room_number}
            </h3>
            <div className="form-grid">
              <div className="form-group full-width">
                <label>Booked By</label>
                <input value={bookForm.booked_by} onChange={e => setBookForm({...bookForm, booked_by: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Date</label>
                <input type="date" value={bookForm.date} onChange={e => setBookForm({...bookForm, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Start Time</label>
                <input type="time" value={bookForm.start_time} onChange={e => setBookForm({...bookForm, start_time: e.target.value})} />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input type="time" value={bookForm.end_time} onChange={e => setBookForm({...bookForm, end_time: e.target.value})} />
              </div>
              <div className="form-group full-width">
                <label>Purpose</label>
                <input value={bookForm.purpose} onChange={e => setBookForm({...bookForm, purpose: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowBookModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleBook}>Confirm Booking</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}