import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Layers,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const AUST_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];

export default function SchedulesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    course: '',
    title: '',
    day: 'Sunday',
    start_time: '08:00',
    end_time: '08:50',
    room: '',
    instructor: '',
    section: 'B',
  });

  // Query schedules
  const { data: schedules = [], isLoading, isError } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.getSchedules(),
  });

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingSchedule) {
        return await api.updateSchedule(editingSchedule.id, data);
      } else {
        return await api.createSchedule(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      addToast({
        type: 'success',
        title: editingSchedule ? 'Schedule Updated' : 'Class Added',
        message: `Class ${formData.course} saved successfully.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save schedule.',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.deleteSchedule(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      addToast({
        type: 'info',
        title: 'Class Cancelled',
        message: 'The class schedule slot has been removed.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete schedule.',
      });
    },
  });

  const openAddForm = () => {
    setEditingSchedule(null);
    setFormData({
      course: '',
      title: '',
      day: 'Sunday',
      start_time: '08:00',
      end_time: '08:50',
      room: '',
      instructor: '',
      section: 'B',
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingSchedule(item);
    setFormData({
      course: item.course || '',
      title: item.title || '',
      day: item.day || 'Sunday',
      start_time: item.start_time || '08:00',
      end_time: item.end_time || '08:50',
      room: item.room || '',
      instructor: item.instructor || '',
      section: item.section || 'B',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSchedule(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate
    if (!formData.course.trim() || !formData.title.trim() || !formData.room.trim()) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please provide course code, title, and room number.',
      });
      return;
    }

    if (formData.start_time >= formData.end_time) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'End time must be strictly after start time.',
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  // Filtered schedules
  const filtered = schedules.filter((s) => {
    const matchesDay = selectedDay === 'all' || s.day === selectedDay;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      s.course?.toLowerCase().includes(query) ||
      s.title?.toLowerCase().includes(query) ||
      s.room?.toLowerCase().includes(query) ||
      s.instructor?.toLowerCase().includes(query);
    return matchesDay && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Class Schedules
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage routines, room allocations, instructor schedules, and cancelled classes.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Class Routine
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedDay === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Days ({schedules.length})
          </button>
          {AUST_DAYS.map((day) => {
            const count = schedules.filter((s) => s.day === day).length;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedDay === day ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {day} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search course, room, instructor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Main Table / Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400">Loading schedules from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-300">
          Failed to load class schedules. Please verify backend connection.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No classes scheduled"
          description={
            search || selectedDay !== 'all'
              ? 'No classes match your current search or day filter.'
              : 'Add your first class routine to get started.'
          }
          actionText="Add Class"
          onAction={openAddForm}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="glass-card glass-card-hover rounded-2xl p-5 flex flex-col justify-between relative group"
            >
              <div>
                {/* Header tag and Day */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                    {item.course}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.day}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                      Sec: {item.section || 'All'}
                    </span>
                  </div>
                </div>

                <h3 className="font-bold text-white text-base leading-snug line-clamp-2 mb-3">
                  {item.title}
                </h3>

                {/* Details List */}
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-mono font-medium">
                      {item.start_time} – {item.end_time}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Room: <strong className="text-white font-semibold">{item.room}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-sky-400" />
                    <span className="truncate">{item.instructor || 'TBA'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-800/80">
                <button
                  onClick={() => openEditForm(item)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Edit Class Routine"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingId(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  title="Cancel / Delete Class"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal Form */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingSchedule ? 'Edit Class Schedule' : 'Add New Class Routine'}
        subtitle="Specify exact course code, time slot, and room allocation."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE 4113"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Section
              </label>
              <input
                type="text"
                placeholder="e.g. B, B1/B2"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Course Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pattern Recognition and Machine Learning"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Day (Sun–Thu) *
              </label>
              <select
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {AUST_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Room Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 7A07"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructor Name
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Dr. Md. Shahriar Mahbub"
                value={formData.instructor}
                onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
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
              {saveMutation.isPending ? 'Saving...' : editingSchedule ? 'Update Class' : 'Save Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Cancel Class Routine"
        message="Are you sure you want to cancel and delete this class schedule? This will immediately remove it for all students and the AI Agent."
        confirmText="Cancel Class"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
