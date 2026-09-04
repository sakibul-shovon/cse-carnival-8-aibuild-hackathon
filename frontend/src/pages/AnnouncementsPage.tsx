import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Assignment } from '../types';
import Modal from '../components/Modal';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { PlusIcon, ClipboardDocumentListIcon } from '../components/Icons';

export default function AssignmentsPage() {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        course: '',
        course_title: '',
        title: '',
        description: '',
        assigned_date: new Date().toISOString().split('T')[0],
        deadline: '',
        submission_platform: '',
        marks: '',
    });
    const [submitting, setSubmitting] = useState<string | null>(null);

    const isTeacher = user?.role === 'teacher';
    const isStudent = user?.role === 'student';
    const canCreate = isTeacher || user?.role === 'admin';

    const fetchAssignments = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await api.getAssignments(user.id);
            setAssignments(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssignments();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await api.createAssignment(user.id, {
                course: form.course,
                course_title: form.course_title,
                title: form.title,
                description: form.description,
                assigned_date: form.assigned_date,
                deadline: form.deadline,
                submission_platform: form.submission_platform || null,
                marks: form.marks ? Number(form.marks) : null,
            });

            setModalOpen(false);
            setForm({
                course: '',
                course_title: '',
                title: '',
                description: '',
                assigned_date: new Date().toISOString().split('T')[0],
                deadline: '',
                submission_platform: '',
                marks: '',
            });
            await fetchAssignments();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Create failed');
        }
    };

    const handleSubmitAssignment = async (assignmentId: string) => {
        if (!user) return;
        if (!confirm('Submit this assignment?')) return;

        setSubmitting(assignmentId);
        try {
            await api.submitAssignment(user.id, assignmentId);
            await fetchAssignments();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Submission failed');
        } finally {
            setSubmitting(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, 'yellow' | 'green' | 'red' | 'slate'> = {
            pending: 'yellow',
            submitted: 'green',
            not_submitted: 'red',
            graded: 'green',
            active: 'green',
            closed: 'slate',
        };
        return map[status] || 'slate';
    };

    const getStatusLabel = (status: string) => {
        return status.replace('_', ' ').toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Assignments
                    </h1>
                    <p className="text-sm text-slate-500">
                        {isStudent
                            ? 'View and submit your assignments'
                            : 'Manage course assignments'}
                    </p>
                </div>
                {canCreate && (
                    <button onClick={() => setModalOpen(true)} className="btn btn-primary">
                        <PlusIcon className="mr-1.5 h-4 w-4" />
                        New Assignment
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {assignments.length === 0 ? (
                <EmptyState
                    title="No assignments yet"
                    description={
                        isTeacher
                            ? 'Create your first assignment for students.'
                            : 'No assignments have been posted yet.'
                    }
                    icon={<ClipboardDocumentListIcon className="h-12 w-12" />}
                    action={
                        canCreate ? (
                            <button
                                onClick={() => setModalOpen(true)}
                                className="btn btn-primary"
                            >
                                <PlusIcon className="mr-1.5 h-4 w-4" />
                                Create one
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="space-y-4">
                    {assignments.map((a) => {
                        const isOverdue =
                            new Date(a.deadline) < new Date() &&
                            a.my_submission_status !== 'submitted' &&
                            a.my_submission_status !== 'graded';

                        return (
                            <div
                                key={a.id}
                                className={`card transition-colors ${
                                    isOverdue ? 'border-red-200 bg-red-50/30' : ''
                                }`}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-lg font-semibold text-slate-900">
                                                {a.title}
                                            </h3>
                                            <Badge variant="slate">
                                                {a.course_title || a.course}
                                            </Badge>
                                            {isOverdue && (
                                                <Badge variant="red">Overdue</Badge>
                                            )}
                                        </div>
                                        <p className="mt-1 text-sm text-slate-600">
                                            {a.description}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                            <span>
                                                📅 Assigned:{' '}
                                                {new Date(
                                                    a.assigned_date
                                                ).toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span>
                                                ⏰ Deadline:{' '}
                                                {new Date(
                                                    a.deadline
                                                ).toLocaleDateString()}
                                            </span>
                                            {a.marks && (
                                                <>
                                                    <span>•</span>
                                                    <span>🏷️ Max: {a.marks} marks</span>
                                                </>
                                            )}
                                            {a.submission_platform && (
                                                <>
                                                    <span>•</span>
                                                    <span>
                                                        📤 {a.submission_platform}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        {isStudent && (
                                            <>
                                                {a.my_submission_status ===
                                                    'submitted' ||
                                                a.my_submission_status ===
                                                    'graded' ? (
                                                    <Badge
                                                        variant={
                                                            a.my_submission_status ===
                                                            'graded'
                                                                ? 'green'
                                                                : 'blue'
                                                        }
                                                    >
                                                        {getStatusLabel(
                                                            a.my_submission_status
                                                        )}
                                                    </Badge>
                                                ) : (
                                                    <button
                                                        onClick={() =>
                                                            handleSubmitAssignment(
                                                                a.id
                                                            )
                                                        }
                                                        disabled={
                                                            submitting === a.id ||
                                                            isOverdue
                                                        }
                                                        className={`btn btn-primary text-xs px-3 py-1.5 ${
                                                            isOverdue
                                                                ? 'opacity-50 cursor-not-allowed'
                                                                : ''
                                                        }`}
                                                    >
                                                        {submitting === a.id
                                                            ? 'Submitting...'
                                                            : 'Submit'}
                                                    </button>
                                                )}
                                                {isOverdue &&
                                                    a.my_submission_status !==
                                                        'submitted' &&
                                                    a.my_submission_status !==
                                                        'graded' && (
                                                        <span className="text-xs text-red-500">
                                                            Past deadline
                                                        </span>
                                                    )}
                                            </>
                                        )}
                                        {!isStudent && (
                                            <Badge
                                                variant={getStatusBadge(a.status)}
                                            >
                                                {getStatusLabel(a.status)}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Create Assignment"
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Course Code *
                            </label>
                            <input
                                type="text"
                                value={form.course}
                                onChange={(e) =>
                                    setForm({ ...form, course: e.target.value })
                                }
                                className="input mt-1"
                                placeholder="e.g. CS101"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Course Title *
                            </label>
                            <input
                                type="text"
                                value={form.course_title}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        course_title: e.target.value,
                                    })
                                }
                                className="input mt-1"
                                placeholder="e.g. Intro to Programming"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Title *
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={(e) =>
                                setForm({ ...form, title: e.target.value })
                            }
                            className="input mt-1"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Description *
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                setForm({ ...form, description: e.target.value })
                            }
                            rows={3}
                            className="input mt-1"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Assigned Date *
                            </label>
                            <input
                                type="date"
                                value={form.assigned_date}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        assigned_date: e.target.value,
                                    })
                                }
                                className="input mt-1"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Deadline *
                            </label>
                            <input
                                type="date"
                                value={form.deadline}
                                onChange={(e) =>
                                    setForm({ ...form, deadline: e.target.value })
                                }
                                className="input mt-1"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Submission Platform
                            </label>
                            <input
                                type="text"
                                value={form.submission_platform}
                                onChange={(e) =>
                                    setForm({
                                        ...form,
                                        submission_platform: e.target.value,
                                    })
                                }
                                className="input mt-1"
                                placeholder="e.g. Google Classroom"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Max Marks
                            </label>
                            <input
                                type="number"
                                value={form.marks}
                                onChange={(e) =>
                                    setForm({ ...form, marks: e.target.value })
                                }
                                className="input mt-1"
                                placeholder="e.g. 100"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="btn btn-secondary"
                        >
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Create Assignment
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}