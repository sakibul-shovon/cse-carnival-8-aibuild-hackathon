import React, { useEffect, useState } from 'react';
import { assignmentService } from '../services/api';
import { useAuth } from '../context/AuthContext';
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
  Filter
} from 'lucide-react';

const STATUS_FILTERS = ['All', 'pending', 'submitted', 'graded', 'late'];

export default function Assignments() {
  const { user, isAdmin, isTeacher } = useAuth();
  const canManage = isAdmin || isTeacher;
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
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold text-white ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpenCheck className="w-6 h-6 text-amber-600" /> Course Assignments & Submissions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track homework, lab reports, term papers, and submission deadlines.
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Assignment
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search assignments by course, title, or platform..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAssignments()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Status:
          </span>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                selectedStatus === s
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Assignments */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-slate-200"></div>
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <BookOpenCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Assignments Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try changing the status filter or search keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((asgn) => {
            const isDone = asgn.status === 'submitted' || asgn.status === 'graded';
            const canEditThis = isAdmin || (isTeacher && (!asgn.teacher_id || asgn.teacher_id === user?.id));

            return (
              <div
                key={asgn.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 text-xs font-extrabold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {asgn.course}
                      </span>
                      <span className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${
                        asgn.status === 'submitted'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : asgn.status === 'graded'
                          ? 'bg-violet-50 text-violet-700 border-violet-100'
                          : asgn.status === 'late'
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {asgn.status}
                      </span>
                    </div>

                    {canEditThis && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleOpenEditModal(asgn)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                          title="Edit assignment"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asgn.id, asgn.title)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                          title="Delete assignment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                    {asgn.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {asgn.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">Due: <strong className="text-slate-800">{asgn.deadline}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">Assigned: {asgn.assigned_date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Platform:</span>
                      <span className="truncate text-slate-800 font-semibold">{asgn.submission_platform}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Weight:</span>
                      <span className="truncate text-indigo-700 font-bold">{asgn.marks} Marks</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(asgn)}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAsgn ? 'Edit Assignment' : 'Add New Assignment'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={formData.course}
                    onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                    placeholder="e.g. CSE 4113"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    value={formData.course_title}
                    onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
                    placeholder="e.g. Pattern Recognition"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assignment Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Assignment 1: Naive Bayes Implementation"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Instructions</label>
                <textarea
                  required
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Submission requirements and details..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Date</label>
                  <input
                    type="date"
                    required
                    value={formData.assigned_date}
                    onChange={(e) => setFormData({ ...formData, assigned_date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deadline Date</label>
                  <input
                    type="date"
                    required
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="graded">Graded</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marks</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.marks}
                    onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Platform</label>
                  <input
                    type="text"
                    required
                    value={formData.submission_platform}
                    onChange={(e) => setFormData({ ...formData, submission_platform: e.target.value })}
                    placeholder="e.g. Google Classroom"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
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
