import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  PartyPopper,
  Plus,
  Search,
  Trash2,
  Edit,
  UserPlus,
  Users,
  MapPin,
  Calendar,
  Clock,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const EVENT_STATUSES = ['all', 'upcoming', 'ongoing', 'full', 'completed', 'cancelled'];

export default function EventsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Registration Modal
  const [registeringEvent, setRegisteringEvent] = useState(null);
  const [cancellingReg, setCancellingReg] = useState(null); // { eventId, studentId, studentName }

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '10:00',
    end_time: '13:00',
    end_date: new Date().toISOString().split('T')[0],
    venue: '7C01',
    organizer: 'AUSTPIC',
    capacity: 60,
    status: 'upcoming',
  });

  const [studentData, setStudentData] = useState({
    student_id: '',
    name: '',
  });

  // Query events
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.getEvents(),
  });

  // Save Event Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingEvent) {
        return await api.updateEvent(editingEvent.id, data);
      } else {
        return await api.createEvent(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: editingEvent ? 'Event Updated' : 'Event Created',
        message: `Event '${formData.name}' saved successfully.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save event.',
      });
    },
  });

  // Delete Event Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.deleteEvent(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'info',
        title: 'Event Deleted',
        message: 'Event and registrations removed.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete event.',
      });
    },
  });

  // Register Student Mutation
  const registerMutation = useMutation({
    mutationFn: async ({ eventId, data }) => {
      return await api.registerEvent(eventId, data);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'success',
        title: 'Registration Confirmed',
        message: `Registered ${studentData.name} (${studentData.student_id}) successfully.`,
      });
      setRegisteringEvent(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Registration Blocked',
        message: err.message || 'Capacity limit reached or student already registered.',
      });
    },
  });

  // Cancel Registration Mutation
  const cancelRegMutation = useMutation({
    mutationFn: async ({ eventId, studentId }) => {
      return await api.cancelRegistration(eventId, studentId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      addToast({
        type: 'info',
        title: 'Registration Cancelled',
        message: 'Student removed from attendee list.',
      });
      setCancellingReg(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Cancellation Error',
        message: err.message || 'Could not cancel registration.',
      });
    },
  });

  const openAddForm = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      start_time: '10:00',
      end_time: '13:00',
      end_date: new Date().toISOString().split('T')[0],
      venue: '7C01',
      organizer: 'AUSTPIC',
      capacity: 60,
      status: 'upcoming',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (evt) => {
    setEditingEvent(evt);
    setFormData({
      name: evt.name || '',
      description: evt.description || '',
      date: evt.date || new Date().toISOString().split('T')[0],
      start_time: evt.start_time || '10:00',
      end_time: evt.end_time || '13:00',
      end_date: evt.end_date || evt.date || new Date().toISOString().split('T')[0],
      venue: evt.venue || '7C01',
      organizer: evt.organizer || '',
      capacity: evt.capacity || 60,
      status: evt.status || 'upcoming',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.venue.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Name and venue are required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!studentData.student_id.trim() || !studentData.name.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Student ID and full name are required.' });
      return;
    }
    registerMutation.mutate({ eventId: registeringEvent.id, data: studentData });
  };

  // Filtered events
  const filtered = events.filter((evt) => {
    const matchesStatus = selectedStatus === 'all' || evt.status === selectedStatus;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      evt.name?.toLowerCase().includes(query) ||
      evt.description?.toLowerCase().includes(query) ||
      evt.organizer?.toLowerCase().includes(query) ||
      evt.venue?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <PartyPopper className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Events & Hackathons
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Browse guest lectures, workshops, club sessions, and manage attendee registrations with strict capacity limits.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {EVENT_STATUSES.map((status) => {
            const count = status === 'all' ? events.length : events.filter((e) => e.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  selectedStatus === status ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {status} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search event name, speaker, venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400">Loading events from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-300">
          Failed to load events.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No events found"
          description="Try selecting a different status filter or create a new event."
          actionText="Create Event"
          onAction={openAddForm}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((evt) => {
            const isFull = evt.registered >= evt.capacity || evt.status === 'full';
            const registrations = evt.registrations || [];
            const percentFilled = Math.min(100, Math.round(((evt.registered || 0) / (evt.capacity || 1)) * 100));

            return (
              <div
                key={evt.id}
                className="glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border border-slate-800/80"
              >
                <div className="space-y-4">
                  {/* Top tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        {evt.organizer || 'AUST'}
                      </span>
                      <h3 className="text-lg font-extrabold text-white mt-2 leading-snug">
                        {evt.name}
                      </h3>
                    </div>
                    <StatusBadge status={evt.status} />
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {evt.description}
                  </p>

                  {/* Date, Time, Venue */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{evt.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono">{evt.start_time} – {evt.end_time}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Venue: <strong className="text-white font-semibold">{evt.venue}</strong></span>
                    </div>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400" />
                        Registrations
                      </span>
                      <span className="font-bold text-white">
                        {evt.registered} / {evt.capacity}{' '}
                        <span className={`text-[11px] font-semibold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ({percentFilled}%)
                        </span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFull
                            ? 'bg-rose-500'
                            : percentFilled > 80
                            ? 'bg-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 to-emerald-400'
                        }`}
                        style={{ width: `${percentFilled}%` }}
                      />
                    </div>
                  </div>

                  {/* Registered Attendees Drawer */}
                  {registrations.length > 0 && (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Registered Students ({registrations.length})</span>
                      </span>
                      <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                        {registrations.map((reg) => (
                          <div
                            key={reg.student_id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/80 border border-slate-800/60 text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-indigo-300 font-medium">{reg.student_id}</span>
                              <span className="text-slate-200 truncate">{reg.name}</span>
                            </div>
                            <button
                              onClick={() =>
                                setCancellingReg({
                                  eventId: evt.id,
                                  studentId: reg.student_id,
                                  studentName: reg.name,
                                })
                              }
                              className="text-slate-400 hover:text-rose-400 p-0.5 transition"
                              title="Cancel this student registration"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => {
                      setRegisteringEvent(evt);
                      setStudentData({ student_id: '20-40532', name: 'Sakibul Hassan' });
                    }}
                    disabled={isFull}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-md transition ${
                      isFull
                        ? 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                        : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/20 hover:scale-[1.02]'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isFull ? 'Event Full' : 'Register Student'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditForm(evt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Event"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(evt.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Event"
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

      {/* Add / Edit Event Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingEvent ? 'Edit Campus Event' : 'Create Campus Event'}
        subtitle="Specify event schedule, venue, organizer, and capacity."
      >
        <form onSubmit={handleEventSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AUSTPIC AI Build Hackathon"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows="3"
              placeholder="Provide event details, objectives, and prerequisites..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Start Time (24h) *
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
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
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Venue Room *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7C01"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Organizer
              </label>
              <input
                type="text"
                placeholder="e.g. AUSTPIC"
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Capacity *
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
              {saveMutation.isPending ? 'Saving...' : editingEvent ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Register Student Modal */}
      <Modal
        isOpen={Boolean(registeringEvent)}
        onClose={() => setRegisteringEvent(null)}
        title={`Register for ${registeringEvent?.name}`}
        subtitle={`Capacity: ${registeringEvent?.registered}/${registeringEvent?.capacity} registered.`}
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Student ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 20-40532"
              value={studentData.student_id}
              onChange={(e) => setStudentData({ ...studentData, student_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sakibul Hassan"
              value={studentData.name}
              onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setRegisteringEvent(null)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm shadow-lg shadow-purple-600/20"
            >
              {registerMutation.isPending ? 'Registering...' : 'Confirm Registration'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Registration Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(cancellingReg)}
        onClose={() => setCancellingReg(null)}
        onConfirm={() =>
          cancelRegMutation.mutate({
            eventId: cancellingReg.eventId,
            studentId: cancellingReg.studentId,
          })
        }
        title="Cancel Registration"
        message={`Are you sure you want to remove registration for ${cancellingReg?.studentName} (${cancellingReg?.studentId})? This will free up a registration slot.`}
        confirmText="Remove Student"
        isLoading={cancelRegMutation.isPending}
      />

      {/* Delete Event Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Campus Event"
        message="Are you sure you want to delete this event? All attendee registrations will be permanently removed."
        confirmText="Delete Event"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
