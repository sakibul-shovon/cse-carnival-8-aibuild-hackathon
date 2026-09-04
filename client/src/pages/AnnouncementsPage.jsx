import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import {
  Megaphone,
  Plus,
  Search,
  Trash2,
  Edit,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Flame,
  CheckCircle2,
  CalendarOff,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { useToast } from '../components/Toast';

const PRIORITIES = ['high', 'medium', 'low'];

export default function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [hideExpired, setHideExpired] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    date: new Date().toISOString().split('T')[0],
    priority: 'medium',
    posted_by: '',
    expires: '',
  });

  // Query Announcements
  const { data: announcements = [], isLoading, isError } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.getAnnouncements(),
  });

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingItem) {
        return await api.updateAnnouncement(editingItem.id, data);
      } else {
        return await api.createAnnouncement(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      addToast({
        type: 'success',
        title: editingItem ? 'Announcement Updated' : 'Announcement Posted',
        message: `Notice '${formData.title}' saved successfully.`,
      });
      closeForm();
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save announcement.',
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      return await api.deleteAnnouncement(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      addToast({
        type: 'info',
        title: 'Notice Removed',
        message: 'Announcement deleted successfully.',
      });
      setDeletingId(null);
    },
    onError: (err) => {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete announcement.',
      });
    },
  });

  const openAddForm = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      body: '',
      date: new Date().toISOString().split('T')[0],
      priority: 'medium',
      posted_by: 'CSE Department',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title || '',
      body: item.body || '',
      date: item.date || new Date().toISOString().split('T')[0],
      priority: item.priority || 'medium',
      posted_by: item.posted_by || '',
      expires: item.expires || '',
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Title and body text are required.' });
      return;
    }
    saveMutation.mutate(formData);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered list
  const filtered = announcements.filter((item) => {
    const isExpired = item.expires && item.expires < todayStr;
    if (hideExpired && isExpired) return false;

    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;
    const query = search.toLowerCase();
    const matchesSearch =
      !search ||
      item.title?.toLowerCase().includes(query) ||
      item.body?.toLowerCase().includes(query) ||
      item.posted_by?.toLowerCase().includes(query);

    return matchesPriority && matchesSearch;
  });

  return (
    <div className="p-5 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Megaphone className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Campus Announcements
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Broadcast emergency alerts, department syllabus updates, class reschedules, and club notices.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Post Announcement
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Priority Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSelectedPriority('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedPriority === 'all' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({announcements.length})
          </button>
          {PRIORITIES.map((p) => {
            const count = announcements.filter((a) => a.priority === p).length;
            return (
              <button
                key={p}
                onClick={() => setSelectedPriority(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
                  selectedPriority === p ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p} <span className="opacity-60 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Hide expired toggle + Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0"
            />
            Hide Expired Notices
          </label>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <p className="text-sm text-slate-400">Loading notices from database...</p>
        </div>
      ) : isError ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center text-rose-300">
          Failed to load announcements.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No announcements found"
          description="No notices match your current filters. Post one or adjust your criteria."
          actionText="Post Notice"
          onAction={openAddForm}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => {
            const isExpired = item.expires && item.expires < todayStr;

            return (
              <div
                key={item.id}
                className={`glass-card rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                  isExpired
                    ? 'opacity-60 bg-slate-950/40 border-slate-800/40 grayscale-[25%]'
                    : item.priority === 'high'
                    ? 'border-rose-500/30 shadow-rose-950/20'
                    : 'border-slate-800/80'
                }`}
              >
                <div>
                  {/* Top metadata */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={item.priority} type="priority" />
                      {isExpired && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          <CalendarOff className="w-3 h-3" /> Expired
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.date}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    className={`text-lg font-bold leading-snug mb-3 ${
                      isExpired ? 'text-slate-300 line-through decoration-slate-600' : 'text-white'
                    }`}
                  >
                    {item.title}
                  </h3>

                  {/* Body text */}
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-900/50 p-3.5 rounded-xl border border-slate-800/60 mb-4">
                    {item.body}
                  </p>
                </div>

                {/* Footer details & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-slate-300 font-medium truncate">{item.posted_by || 'AUST'}</span>
                    </span>
                    {item.expires && (
                      <span className="hidden sm:inline-block text-[11px]">
                        Expires: <strong className="font-mono text-slate-300">{item.expires}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditForm(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Edit Announcement"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete Announcement"
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

      {/* Add / Edit Announcement Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingItem ? 'Edit Announcement' : 'Post Campus Notice'}
        subtitle="Specify headline, body details, priority level, and expiry date."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Headline Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. CSE 4113 Class Rescheduled — Sunday 7 Sep"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Announcement Body Content *
            </label>
            <textarea
              rows="4"
              required
              placeholder="Write the full announcement text, directives, instructions..."
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Priority Level *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500 capitalize"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Post Date *
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
                Expiry Date
              </label>
              <input
                type="date"
                value={formData.expires}
                onChange={(e) => setFormData({ ...formData, expires: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Posted By (Authority or Department)
            </label>
            <input
              type="text"
              placeholder="e.g. Prof. Dr. Md. Shahriar Mahbub, CSE Department"
              value={formData.posted_by}
              onChange={(e) => setFormData({ ...formData, posted_by: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
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
              {saveMutation.isPending ? 'Saving...' : editingItem ? 'Update Notice' : 'Publish Notice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deleteMutation.mutate(deletingId)}
        title="Delete Announcement"
        message="Are you sure you want to delete this campus announcement? This will remove the notice from the noticeboard and agent lookups."
        confirmText="Delete Notice"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
