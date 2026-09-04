import React, { useEffect, useState } from 'react';
import { assignmentService } from '../services/api';
import { 
  BookOpenCheck, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  X,
  Check,
  Filter,
  ExternalLink
} from 'lucide-react';

const STATUS_FILTERS = ['All', 'pending', 'submitted', 'graded', 'late'];

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [toast, setToast] = useState(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsgn, setEditingAsgn] = useState(null);
  const [formData, setFormData] = useState({
    course: '',
    course_title: '',
    title: '',
    description: '',
    assigned_date: '2026-09-04',
    deadline: '2026-09-12',
    submission_platform: 'Google Classroom',
    status: 'pending',
    marks: 10
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStatus !== 'All') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();
      const res = await assignmentService.getAll(params);
      setAssignments(res);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedStatus]);

  const handleOpenCreateModal = () => {
    setEditingAsgn(null);
    setFormData({
      course: '',
      course_title: '',
      title: '',
      description: '',
      assigned_date: '2026-09-04',
      deadline: '2026-09-12',
      submission_platform: 'Google Classroom',
      status: 'pending',
      marks: 10
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asgn) => {
    setEditingAsgn(asgn);
    setFormData({
      course: asgn.course,
      course_title: asgn.course_title,
      title: asgn.title,
      description: asgn.description,
      assigned_date: asgn.assigned_date,
      deadline: asgn.deadline,
      submission_platform: asgn.submission_platform,
      status: asgn.status,
      marks: asgn.marks
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingAsgn) {
        await assignmentService.update(editingAsgn.id, formData);
        showToast(`Assignment "${formData.title}" updated!`);
      } else {
        await assignmentService.create(formData);
        showToast(`Assignment "${formData.title}" created!`);
      }
      setIsModalOpen(false);
      fetchAssignments();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error saving assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (asgn) => {
    const nextStatus = asgn.status === 'submitted' ? 'pending' : 'submitted';
    try {
      await assignmentService.update(asgn.id, {
        ...asgn,
        status: nextStatus
      });
      showToast(`Marked as ${nextStatus}!`);
      fetchAssignments();
    } catch (err) {
      console.error(err);
      showToast('Error updating status', 'error');
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete assignment "${title}"?`)) return;
    try {
      await assignmentService.delete(id);
      showToast(`Assignment deleted.`);
      fetchAssignments();
    } catch (err) {
      console.error(err);
      showToast('Error deleting assignment', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-bounce ${
          toast.type === 'error' 
            ? 'bg-rose-950/90 border-rose-700 text-rose-200' 
            : 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <Check className="w-5 h-5 text-emerald-400" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BookOpenCheck className="w-6 h-6 text-indigo-400" /> Course Assignments & Submissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track homework, lab reports, term papers, and submission deadlines.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" /> Add Assignment
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments by course, title, or platform..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAssignments()}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5" /> Status:
          </span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition shrink-0 ${
                selectedStatus === s
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Assignments */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-slate-900 rounded-2xl border border-slate-800"></div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
          <BookOpenCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No assignments found</h3>
          <p className="text-xs text-slate-500 mt-1">Great job! You have no pending submissions matching this filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((asgn) => {
            const isDone = asgn.status === 'submitted' || asgn.status === 'graded';
            return (
              <div
                key={asgn.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition shadow-sm space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg">
                        {asgn.course}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        asgn.status === 'submitted'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : asgn.status === 'graded'
                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          : asgn.status === 'late'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {asgn.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEditModal(asgn)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                        title="Edit assignment"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asgn.id, asgn.title)}
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Delete assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                    {asgn.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {asgn.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">Due: <strong>{asgn.deadline}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">Assigned: {asgn.assigned_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Platform:</span>
                      <span className="truncate text-slate-200">{asgn.submission_platform}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400 font-medium">Weight:</span>
                      <span className="truncate text-indigo-300 font-semibold">{asgn.marks} Marks</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(asgn)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isDone ? 'Mark as Pending' : 'Mark as Submitted'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">
                {editingAsgn ? 'Edit Assignment' : 'Add New Assignment'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    placeholder="e.g. CSE 4113"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={formData.course_title}
                    onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
                    placeholder="e.g. Pattern Recognition"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Assignment 1: Naive Bayes Implementation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Instructions</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Submission requirements and details..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Date</label>
                  <input
                    type="date"
                    required
                    value={formData.assigned_date}
                    onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="graded">Graded</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Marks</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Platform</label>
                  <input
                    type="text"
                    required
                    value={formData.submission_platform}
                    onChange={(e) => setFormData({ ...formData, submission_platform: e.target.value })}
                    placeholder="e.g. Google Classroom"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition shadow-lg shadow-indigo-600/30"
                >
                  {submitting ? 'Saving...' : editingAsgn ? 'Update Assignment' : 'Add Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
