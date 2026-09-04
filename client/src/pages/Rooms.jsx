import React, { useEffect, useState } from 'react';
import { roomService } from '../services/api';
import { 
  DoorClosed, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Users, 
  Tv, 
  Layers, 
  Calendar, 
  Clock, 
  Check, 
  X, 
  BookmarkCheck,
  AlertCircle
} from 'lucide-react';

const ROOM_TYPES = ['All', 'classroom', 'lab', 'seminar'];

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [toast, setToast] = useState(null);

  // Modals
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    room_number: '',
    type: 'classroom',
    capacity: 40,
    floor: 7,
    status: 'available',
    equipmentStr: 'projector, AC, whiteboard',
  });

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState(null);
  const [bookForm, setBookForm] = useState({
    booked_by: '',
    date: '2026-09-05',
    start_time: '14:00',
    end_time: '16:00',
    purpose: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedType !== 'All') params.type = selectedType;
      if (search.trim()) params.search = search.trim();
      const res = await roomService.getAll(params);
      setRooms(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [selectedType]);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const openCreateRoomModal = () => {
    setEditingRoom(null);
    setRoomForm({
      room_number: '',
      type: 'classroom',
      capacity: 40,
      floor: 7,
      status: 'available',
      equipmentStr: 'projector, AC, whiteboard',
    });
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (room) => {
    setEditingRoom(room);
    setRoomForm({
      room_number: room.room_number,
      type: room.type,
      capacity: room.capacity,
      floor: room.floor,
      status: room.status,
      equipmentStr: (room.equipment || []).join(', '),
    });
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        room_number: roomForm.room_number,
        type: roomForm.type,
        capacity: parseInt(roomForm.capacity, 10),
        floor: parseInt(roomForm.floor, 10),
        status: roomForm.status,
        equipment: roomForm.equipmentStr.split(',').map(s => s.trim()).filter(Boolean),
      };

      if (editingRoom) {
        await roomService.update(editingRoom.id, payload);
        showToastMsg(`Room ${payload.room_number} updated.`);
      } else {
        await roomService.create(payload);
        showToastMsg(`Room ${payload.room_number} created.`);
      }
      setIsRoomModalOpen(false);
      fetchRooms();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Delete room ${room.room_number}?`)) return;
    try {
      await roomService.delete(room.id);
      showToastMsg(`Room ${room.room_number} deleted.`);
      fetchRooms();
    } catch (err) {
      alert('Error deleting room: ' + (err.response?.data?.message || err.message));
    }
  };

  const openBookModal = (room) => {
    setSelectedRoomForBooking(room);
    setBookForm({
      booked_by: '',
      date: '2026-09-05',
      start_time: '14:00',
      end_time: '16:00',
      purpose: '',
    });
    setIsBookModalOpen(true);
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await roomService.book(selectedRoomForBooking.id, bookForm);
      showToastMsg(`Successfully booked ${selectedRoomForBooking.room_number}`);
      setIsBookModalOpen(false);
      fetchRooms();
    } catch (err) {
      alert('Booking failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (roomId, bookingId) => {
    if (!window.confirm('Cancel this room reservation?')) return;
    try {
      await roomService.cancelBooking(roomId, bookingId);
      showToastMsg('Reservation cancelled.');
      fetchRooms();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-white bg-emerald-600 shadow-xl">
          <Check className="w-4 h-4" /> {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campus Rooms & Labs</h1>
          <p className="text-sm text-slate-400">Classrooms (7A), Labs (7B), and Seminar Halls (7C) with live bookings.</p>
        </div>
        <button
          onClick={openCreateRoomModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      {/* Type Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {ROOM_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                selectedType === type
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); fetchRooms(); }} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search room (e.g. 7A03)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700"
          >
            Search
          </button>
        </form>
      </div>

      {/* Grid of Rooms */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-52 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <DoorClosed className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-base font-semibold text-slate-300">No rooms found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => {
            const bookings = room.bookings || [];
            return (
              <div
                key={room.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-white tracking-tight">Room {room.room_number}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {room.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => openEditRoomModal(room)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        title="Edit Room"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition"
                        title="Delete Room"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Capacity: <strong className="text-slate-200">{room.capacity}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Floor: <strong className="text-slate-200">{room.floor}</strong></span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Equipment:</p>
                    <div className="flex flex-wrap gap-1">
                      {(room.equipment || []).map((eq, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bookings Section */}
                  {bookings.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1.5">
                      <p className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Current Bookings ({bookings.length}):
                      </p>
                      {bookings.map((b) => (
                        <div key={b.booking_id} className="flex items-center justify-between text-[11px] text-slate-300 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                          <div>
                            <p className="font-semibold text-white">{b.purpose}</p>
                            <p className="text-[10px] text-slate-400">{b.date} • {b.start_time}-{b.end_time} ({b.booked_by})</p>
                          </div>
                          <button
                            onClick={() => handleCancelBooking(room.id, b.booking_id)}
                            className="text-rose-400 hover:text-rose-300 p-1"
                            title="Cancel Booking"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${
                    room.status === 'available' ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    ● {room.status}
                  </span>
                  <button
                    onClick={() => openBookModal(room)}
                    className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                  >
                    + Book Slot
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Modal */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">
                {editingRoom ? `Edit Room ${editingRoom.room_number}` : 'Add New Room'}
              </h2>
              <button onClick={() => setIsRoomModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Room Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7A08"
                    value={roomForm.room_number}
                    onChange={(e) => setRoomForm({ ...roomForm, room_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Type</label>
                  <select
                    value={roomForm.type}
                    onChange={(e) => setRoomForm({ ...roomForm, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 capitalize"
                  >
                    <option value="classroom">Classroom</option>
                    <option value="lab">Lab</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Capacity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={roomForm.capacity}
                    onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Floor</label>
                  <input
                    type="number"
                    value={roomForm.floor}
                    onChange={(e) => setRoomForm({ ...roomForm, floor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status</label>
                  <select
                    value={roomForm.status}
                    onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Equipment (comma separated)</label>
                <input
                  type="text"
                  placeholder="projector, AC, whiteboard, smart board"
                  value={roomForm.equipmentStr}
                  onChange={(e) => setRoomForm({ ...roomForm, equipmentStr: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRoomModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white"
                >
                  {submitting ? 'Saving...' : editingRoom ? 'Save Changes' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Book Room Modal */}
      {isBookModalOpen && selectedRoomForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Book Room {selectedRoomForBooking.room_number}</h2>
                <p className="text-xs text-slate-400">Capacity: {selectedRoomForBooking.capacity} seats</p>
              </div>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Booked By / Organizer</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nusrat Jahan / AUSTPIC"
                  value={bookForm.booked_by}
                  onChange={(e) => setBookForm({ ...bookForm, booked_by: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={bookForm.date}
                  onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Start Time (24h)</label>
                  <input
                    type="text"
                    required
                    placeholder="14:00"
                    value={bookForm.start_time}
                    onChange={(e) => setBookForm({ ...bookForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">End Time (24h)</label>
                  <input
                    type="text"
                    required
                    placeholder="16:00"
                    value={bookForm.end_time}
                    onChange={(e) => setBookForm({ ...bookForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Purpose</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Extra Class / Hackathon Preparation"
                  value={bookForm.purpose}
                  onChange={(e) => setBookForm({ ...bookForm, purpose: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white"
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
