import React, { useEffect, useState } from 'react';
import { announcementService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Calendar, 
  User, 
  AlertCircle,
  Check,
  X,
  Clock,
  Filter
} from 'lucide-react';

const PRIORITIES = ['All', 'high', 'medium', 'low'];

export default function Announcements() {
  const { user, isAdmin, isTeacher } = useAuth();
  const canManage = isAdmin || isTeacher;
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [toast, setToast] = useState(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    date: '2026-09-04',
    priority: 'medium',
    posted_by: 'CSE Department',
    expires: '2026-09-15'
  });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedPriority !== 'All') params.priority = selectedPriority;
      if (search.trim()) params.search = search.trim();
      const res = await announcementService.getAll(params);
      setAnnouncements(res);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [selectedPriority]);

  const handleOpenCreateModal = () => {
    setEditingAnn(null);
    setFormData({
      title: '',
      body: '',
      date: '2026-09-04',
      priority: 'medium',
      posted_by: 'CSE Department',
      expires: '2026-09-15'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ann) => {
    setEditingAnn(ann);
    setFormData({
      title: ann.title,
      body: ann.body,
      date: ann.date,
      priority: ann.priority,
      posted_by: ann.posted_by,
      expires: ann.expires
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingAnn) {
        await announcementService.update(editingAnn.id, formData);
        showToast(`Announcement "${formData.title}" updated!`);
      } else {
        await announcementService.create(formData);
        showToast(`Announcement "${formData.title}" created!`);
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error saving announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete announcement "${title}"?`)) return;
    try {
      await announcementService.delete(id);
      showToast(`Announcement deleted.`);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      showToast('Error deleting announcement', 'error');
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
            <Megaphone className="w-6 h-6 text-rose-600" /> Campus Announcements & Notices
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Department updates, emergency notices, class reschedules, and official circulars.
          </p>
        </div>
        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Post Notice
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notices by title, content, or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAnnouncements()}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-medium flex items-center gap-1 pl-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Priority:
          </span>
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition shrink-0 ${
                selectedPriority === p
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Announcements */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200"></div>
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Announcements Found</h3>
          <p className="text-xs text-slate-500 mt-1">Try searching for other terms or clear priority filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((ann) => (
            <div 
              key={ann.id}
              className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition space-y-3 group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-extrabold rounded-full border ${
                    ann.priority === 'high' 
                      ? 'bg-rose-50 text-rose-700 border-rose-100' 
                      : ann.priority === 'medium'
                      ? 'bg-amber-50 text-amber-700 border-amber-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {ann.priority} Priority
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {ann.date}
                  </span>
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1 hidden sm:inline-flex">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Expires: {ann.expires}
                  </span>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleOpenEditModal(ann)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                      title="Edit notice"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id, ann.title)}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                      title="Delete notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition">
                  {ann.title}
                </h3>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  {ann.body}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1 font-medium">
                <span className="flex items-center gap-1.5 text-indigo-700 font-semibold">
                  <User className="w-3.5 h-3.5 text-indigo-500" /> Posted by: {ann.posted_by}
                </span>
                <span className="text-slate-400 sm:hidden">
                  Expires: {ann.expires}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAnn ? 'Edit Notice' : 'Post New Notice'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. CSE 4113 Class Rescheduled"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notice Content</label>
                <textarea
                  required
                  rows={4}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Full announcement content..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="low">Low Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Posted By</label>
                  <input
                    type="text"
                    required
                    value={formData.posted_by}
                    onChange={(e) => setFormData({ ...formData, posted_by: e.target.value })}
                    placeholder="e.g. CSE Department"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiration Date</label>
                  <input
                    type="date"
                    required
                    value={formData.expires}
                    onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
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
                  {submitting ? 'Saving...' : editingAnn ? 'Update Notice' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
