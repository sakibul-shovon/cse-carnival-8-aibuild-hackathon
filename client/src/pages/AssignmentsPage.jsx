import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  BookOpenCheck,
  Plus,
  Search,
  Trash2,
  Edit,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Award,
  UploadCloud,
  FileText,
  AlertOctagon,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const STATUS_FILTERS = ['all', 'pending', 'submitted'];

export default function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    course: '',
    course_title: '',
    title: '',
    description: '',
    assigned_date: new Date().toISOString().split('T')[0],
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    submission_platform: 'Google Classroom',
    status: 'pending',
    marks: 10,
  });

  // Query Assignments
  const { data: assignments = [], isLoading, isError } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => api.getAssignments(),
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return await api.updateAssignment(editingItem.id, data);
      } else {
        return await api.createAssignment(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      addToast({
        type: 'success',
        title: editingItem ? 'Assignment Updated' : 'Assignment Added',
        message: `Task '${formData.title}' saved successfully.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save assignment.',
      });
    },
  });

  // Toggle Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (item) => {
      const nextStatus = item.status === 'submitted' ? 'pending' : 'submitted';
      return await api.updateAssignment(item.id, { ...item, status: nextStatus });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      addToast({
        type: updated.status === 'submitted' ? 'success' : 'info',
        title: `Status: ${updated.status}`,
        message: `Assignment marked as ${updated.status}.`,
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.deleteAssignment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      addToast({
        type: 'info',
        title: 'Assignment Deleted',
        message: 'Assignment removed from database.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete assignment.',
      });
    },
  });

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({
      course: '',
      course_title: '',
      title: '',
      description: '',
      assigned_date: new Date().toISOString().split('T')[0],
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      submission_platform: 'Google Classroom',
      status: 'pending',
      marks: 10,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      course: item.course || '',
      course_title: item.course_title || '',
      title: item.title || '',
      description: item.description || '',
      assigned_date: item.assigned_date || new Date().toISOString().split('T')[0],
      deadline: item.deadline || '',
      submission_platform: item.submission_platform || 'Google Classroom',
      status: item.status || 'pending',
      marks: item.marks || 10,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.course.trim() || !formData.title.trim() || !formData.deadline) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Course, title, and deadline are required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter and sort by deadline
  const filtered = assignments.filter((item) => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.course?.toLowerCase().includes(query) ||
      item.course_title?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BookOpenCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Coursework & Assignments
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Track lab reports, term papers, homework submissions, and deadlines sorted chronologically.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Assignment
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Status selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {STATUS_FILTERS.map((status) => {
            const count = status === 'all' ? assignments.length : assignments.filter((a) => a.status === status).length;
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
            placeholder="Search assignments or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400">Loading assignments from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-300">
          Failed to load assignments.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No assignments found"
          description="No tasks match your search or filter. Create a new assignment to begin."
          actionText="Add Assignment"
          onAction={openAddForm}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => {
            const isOverdue = item.deadline && item.deadline < todayStr && item.status !== 'submitted';
            const isDueSoon =
              item.deadline &&
              item.deadline >= todayStr &&
              new Date(item.deadline) - new Date(todayStr) <= 3 * 24 * 60 * 60 * 1000 &&
              item.status !== 'submitted';

            return (
              <div
                key={item.id}
                className={`glass-card glass-card-hover rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                  isOverdue
                    ? 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30'
                    : isDueSoon
                    ? 'border-amber-500/40'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="space-y-3">
                  {/* Header tags */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {item.course}
                      </span>
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                          <AlertOctagon className="w-3.5 h-3.5" /> OVERDUE
                        </span>
                      )}
                      {isDueSoon && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3.5 h-3.5" /> Due Soon
                        </span>
                      )}
                    </div>

                    <StatusBadge status={item.status} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">
                      {item.title}
                    </h3>
                    {item.course_title && (
                      <p className="text-xs text-slate-400 mt-0.5">{item.course_title}</p>
                    )}
                  </div>

                  {/* Task description */}
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/60">
                    {item.description}
                  </p>

                  {/* Meta Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Deadline: <strong className={`font-mono ${isOverdue ? 'text-rose-400 font-bold' : 'text-white'}`}>{item.deadline}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Award className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span>Marks: <strong className="text-white font-mono">{item.marks || 10} pts</strong></span>
                    </div>

                    <div className="flex items-center gap-2 col-span-2">
                      <UploadCloud className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">Platform: <strong className="text-white font-medium">{item.submission_platform || 'Classroom'}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer action buttons */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                  <button
                    onClick={() => toggleStatusMutation.mutate(item)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                      item.status === 'submitted'
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.status === 'submitted' ? 'Mark as Pending' : 'Mark as Submitted'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditForm(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Assignment"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Assignment"
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? 'Edit Course Assignment' : 'Add Coursework / Assignment'}
        subtitle="Specify course code, deadline, submission platform, and description."
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
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Course Full Title
              </label>
              <input
                type="text"
                placeholder="e.g. Pattern Recognition and Machine Learning"
                value={formData.course_title}
                onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Assignment Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Assignment 1: Bayes Classifier Implementation"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Description
            </label>
            <textarea
              rows="3"
              placeholder="Describe deliverables, required toolsets, instructions..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Assigned Date
              </label>
              <input
                type="date"
                value={formData.assigned_date}
                onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Deadline Date *
              </label>
              <input
                type="date"
                required
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Marks / Points
              </label>
              <input
                type="number"
                min="1"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Submission Platform
              </label>
              <input
                type="text"
                placeholder="e.g. Google Classroom, In-Person"
                value={formData.submission_platform}
                onChange={(e) => setFormData({ ...formData, submission_platform: e.target.value })}
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
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
              </select>
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
              {saveMutation.isPending ? 'Saving...' : editingItem ? 'Update Assignment' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Assignment"
        message="Are you sure you want to delete this assignment? It will be removed from all upcoming task lists."
        confirmText="Delete Assignment"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
