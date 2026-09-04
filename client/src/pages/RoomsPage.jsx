import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit,
  CalendarPlus,
  Users,
  Layers,
  Sparkles,
  Tag,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  HelpCircle,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const ROOM_TYPES = ['classroom', 'lab', 'seminar'];
const EQUIPMENT_OPTIONS = ['whiteboard', 'projector', 'AC', 'smart board', 'computers', 'microphone', 'podium', 'document camera'];

export default function RoomsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Booking Modal
  const [bookingRoom, setBookingRoom] = useState(null);
  const [cancellingBooking, setCancellingBooking] = useState(null); // { roomId, bookingId }

  // Form States
  const [formData, setFormData] = useState({
    room_number: '',
    type: 'classroom',
    capacity: 40,
    equipment: ['whiteboard', 'projector', 'AC'],
    floor: 7,
    status: 'available',
  });

  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split('T')[0],
    start_time: '14:00',
    end_time: '16:00',
    booked_by: '',
    purpose: '',
  });

  // Query Rooms
  const { data: rooms = [], isLoading, isError } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.getRooms(),
  });

  // Save Room Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingRoom) {
        return await api.updateRoom(editingRoom.id, data);
      } else {
        return await api.createRoom(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'success',
        title: editingRoom ? 'Room Updated' : 'Room Added',
        message: `Room ${formData.room_number} saved successfully.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save room.',
      });
    },
  });

  // Delete Room Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.deleteRoom(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'info',
        title: 'Room Deleted',
        message: 'Room record deleted successfully.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete room.',
      });
    },
  });

  // Book Room Mutation (with conflict detection)
  const bookMutation = useMutation({
    mutationFn: async ({ roomId, data }) => {
      return await api.bookRoom(roomId, data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'success',
        title: 'Room Booked Successfully',
        message: `Room reserved for ${bookingData.date} (${bookingData.start_time}–${bookingData.end_time}).`,
      });
      setBookingRoom(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Booking Conflict (409)',
        message: err.message || 'Room conflict detected for selected time slot.',
      });
    },
  });

  // Cancel Booking Mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async ({ roomId, bookingId }) => {
      return await api.cancelBooking(roomId, bookingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      addToast({
        type: 'info',
        title: 'Booking Cancelled',
        message: 'The room reservation slot has been released.',
      });
      setCancellingBooking(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Cancellation Failed',
        message: err.message || 'Could not cancel booking.',
      });
    },
  });

  const openAddForm = () => {
    setEditingRoom(null);
    setFormData({
      room_number: '',
      type: 'classroom',
      capacity: 40,
      equipment: ['whiteboard', 'projector', 'AC'],
      floor: 7,
      status: 'available',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number || '',
      type: room.type || 'classroom',
      capacity: room.capacity || 40,
      equipment: room.equipment || [],
      floor: room.floor || 7,
      status: room.status || 'available',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const handleToggleEquipment = (eq) => {
    setFormData((prev) => {
      const exists = prev.equipment.includes(eq);
      return {
        ...prev,
        equipment: exists ? prev.equipment.filter((item) => item !== eq) : [...prev.equipment, eq],
      };
    });
  };

  const handleRoomSubmit = (e) => {
    e.preventDefault();
    if (!formData.room_number.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Room number is required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!bookingData.booked_by.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Please enter who is booking this room.' });
      return;
    }
    if (bookingData.start_time >= bookingData.end_time) {
      addToast({ type: 'error', title: 'Validation Error', message: 'End time must be after start time.' });
      return;
    }
    bookMutation.mutate({ roomId: bookingRoom.id, data: bookingData });
  };

  // Filtered rooms
  const filtered = rooms.filter((r) => {
    const matchesType = selectedType === 'all' || r.type === selectedType;
    const matchesEquip = !equipmentFilter || (r.equipment || []).includes(equipmentFilter);
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      r.room_number?.toLowerCase().includes(query) ||
      r.type?.toLowerCase().includes(query) ||
      (r.equipment || []).some((eq) => eq.toLowerCase().includes(query));
    return matchesType && matchesEquip && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Rooms & Spaces
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Browse classrooms, computer labs, seminar halls, and manage slot reservations.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Space
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Type selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedType === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Types ({rooms.length})
          </button>
          {ROOM_TYPES.map((type) => {
            const count = rooms.filter((r) => r.type === type).length;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  selectedType === type ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {type}s <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Equipment filter & Search */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={equipmentFilter}
            onChange={(e) => setEquipmentFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Filter Equipment (All)</option>
            {EQUIPMENT_OPTIONS.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>

          <div className="relative w-full md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search room number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Grid list */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400">Loading rooms from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-300">
          Failed to load rooms.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No rooms match your filter"
          description="Try changing the type filter or search keyword."
          actionText="Add Space"
          onAction={openAddForm}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((room) => {
            const bookings = room.bookings || [];
            return (
              <div
                key={room.id}
                className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between border border-slate-800/80"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-white font-mono tracking-tight">
                          {room.room_number}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {room.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">Floor {room.floor || 7}</p>
                    </div>

                    <StatusBadge status={room.status} />
                  </div>

                  {/* Room Specs */}
                  <div className="flex items-center gap-4 py-2 border-y border-slate-800/60 my-3 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Capacity: <strong className="text-white font-semibold">{room.capacity}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bookings: <strong className="text-white font-semibold">{bookings.length}</strong></span>
                    </div>
                  </div>

                  {/* Equipment Chips */}
                  <div className="mb-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Equipment
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(room.equipment || []).map((eq) => (
                        <span
                          key={eq}
                          className="px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-900 text-slate-300 border border-slate-800"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Existing Bookings Drawer / List */}
                  {bookings.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Reserved Slots ({bookings.length})
                      </span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {bookings.map((b) => (
                          <div
                            key={b.booking_id}
                            className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px]"
                          >
                            <div>
                              <div className="font-semibold text-white">
                                {b.date} • {b.start_time}–{b.end_time}
                              </div>
                              <div className="text-slate-400 text-[10px] flex items-center gap-1">
                                <span>{b.booked_by}</span>
                                {b.purpose && <span>({b.purpose})</span>}
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                setCancellingBooking({
                                  roomId: room.id,
                                  bookingId: b.booking_id,
                                  details: `${b.date} (${b.start_time}–${b.end_time})`,
                                })
                              }
                              className="text-slate-400 hover:text-rose-400 p-1 transition"
                              title="Cancel this booking"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setBookingRoom(room);
                      setBookingData({
                        date: new Date().toISOString().split('T')[0],
                        start_time: '14:00',
                        end_time: '16:00',
                        booked_by: '',
                        purpose: '',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Book Slot
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditForm(room)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Room"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(room.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Room"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Room Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingRoom ? 'Edit Room Specs' : 'Add New Space / Room'}
        subtitle="Specify room number, capacity, and available facilities."
      >
        <form onSubmit={handleRoomSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7A02"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Space Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Capacity (People) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Floor Number
              </label>
              <input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
          </div>

          {/* Equipment Multi-select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Available Equipment
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EQUIPMENT_OPTIONS.map((eq) => {
                const isSelected = formData.equipment.includes(eq);
                return (
                  <button
                    type="button"
                    key={eq}
                    onClick={() => handleToggleEquipment(eq)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      }`}
                    >
                      {isSelected && '✓'}
                    </span>
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={closeForm}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20"
            >
              {saveMutation.isPending ? 'Saving...' : editingRoom ? 'Update Room' : 'Save Room'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Book Room Modal (Extra Action) */}
      <Modal
        isOpen={Boolean(bookingRoom)}
        onClose={() => setBookingRoom(null)}
        title={`Book Room ${bookingRoom?.room_number}`}
        subtitle="Reserve this space for a class makeup, meeting, or event."
      >
        <form onSubmit={handleBookSubmit} className="space-y-4">
          <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Real-time conflict detection is active. Overlapping bookings will be automatically flagged.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Booking Date *
            </label>
            <input
              type="date"
              required
              value={bookingData.date}
              onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Start Time (24h) *
              </label>
              <input
                type="time"
                required
                value={bookingData.start_time}
                onChange={(e) => setBookingData({ ...bookingData, start_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                End Time (24h) *
              </label>
              <input
                type="time"
                required
                value={bookingData.end_time}
                onChange={(e) => setBookingData({ ...bookingData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Booked By (Person or Club Name) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Nusrat Jahan, AUSTPIC"
              value={bookingData.booked_by}
              onChange={(e) => setBookingData({ ...bookingData, booked_by: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Purpose / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Extra Class, Hackathon Session"
              value={bookingData.purpose}
              onChange={(e) => setBookingData({ ...bookingData, purpose: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setBookingRoom(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bookMutation.isPending}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-lg shadow-amber-600/20"
            >
              {bookMutation.isPending ? 'Checking & Booking...' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Booking Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingBooking)}
        onClose={() => setCancellingBooking(null)}
        onConfirm={() =>
          cancelBookingMutation.mutate({
            roomId: cancellingBooking.roomId,
            bookingId: cancellingBooking.bookingId,
          })
        }
        title="Cancel Room Booking"
        message={`Are you sure you want to cancel the booking for ${cancellingBooking?.details}? This will release the slot for other students.`}
        confirmText="Release Booking"
        isLoading={cancelBookingMutation.isPending}
      />

      {/* Delete Room Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Space / Room"
        message="Are you sure you want to delete this room? All scheduled routines and bookings tied to this room will be affected."
        confirmText="Delete Room"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
