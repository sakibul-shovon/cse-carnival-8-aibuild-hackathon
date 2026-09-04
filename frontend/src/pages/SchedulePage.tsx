import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { ScheduleSlot } from '../types';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { PlusIcon, CalendarDaysIcon } from '../components/Icons';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SchedulePage() {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        course: '',
        day: 'Monday',
        time: '',
        room: '',
        instructor: '',
    });

    const canEdit = user?.role === 'teacher' || user?.role === 'admin';

    const fetchSchedule = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await api.getSchedule(user.id);
            setSchedule(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            await api.createSchedule(user.id, form);
            setModalOpen(false);
            setForm({
                course: '',
                day: 'Monday',
                time: '',
                room: '',
                instructor: '',
            });
            await fetchSchedule();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Create failed');
        }
    };

    const groupedByDay = schedule.reduce((acc, slot) => {
        if (!acc[slot.day]) acc[slot.day] = [];
        acc[slot.day].push(slot);
        return acc;
    }, {} as Record<string, ScheduleSlot[]>);

    const sortedDays = Object.keys(groupedByDay).sort(
        (a, b) => days.indexOf(a) - days.indexOf(b)
    );

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
                        Schedule
                    </h1>
                    <p className="text-sm text-slate-500">
                        Weekly class timetable
                    </p>
                </div>
                {canEdit && (
                    <button onClick={() => setModalOpen(true)} className="btn btn-primary">
                        <PlusIcon className="mr-1.5 h-4 w-4" />
                        Add Class
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {schedule.length === 0 ? (
                <EmptyState
                    title="No schedule entries"
                    description="Add classes to build your weekly timetable."
                    icon={<CalendarDaysIcon className="h-12 w-12" />}
                    action={
                        canEdit ? (
                            <button
                                onClick={() => setModalOpen(true)}
                                className="btn btn-primary"
                            >
                                <PlusIcon className="mr-1.5 h-4 w-4" />
                                Add a class
                            </button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sortedDays.map((day) => (
                        <div key={day} className="card">
                            <h3 className="mb-3 text-sm font-semibold text-primary-700 uppercase tracking-wider">
                                {day}
                            </h3>
                            <div className="space-y-3">
                                {groupedByDay[day]
                                    .sort((a, b) => a.time.localeCompare(b.time))
                                    .map((slot) => (
                                        <div
                                            key={slot.id}
                                            className="rounded-lg border border-slate-100 bg-slate-50 p-3 transition-colors hover:border-primary-200"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-medium text-slate-900">
                                                        {slot.course}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {slot.room}
                                                    </p>
                                                </div>
                                                <span className="text-xs font-medium text-slate-400">
                                                    {slot.time}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-slate-400">
                                                👨‍🏫 {slot.instructor}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Add Class to Schedule"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Course *
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
                            Day *
                        </label>
                        <select
                            value={form.day}
                            onChange={(e) =>
                                setForm({ ...form, day: e.target.value })
                            }
                            className="input mt-1"
                            required
                        >
                            {days.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Time *
                        </label>
                        <input
                            type="text"
                            value={form.time}
                            onChange={(e) =>
                                setForm({ ...form, time: e.target.value })
                            }
                            className="input mt-1"
                            placeholder="e.g. 10:00 AM - 11:30 AM"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Room *
                        </label>
                        <input
                            type="text"
                            value={form.room}
                            onChange={(e) =>
                                setForm({ ...form, room: e.target.value })
                            }
                            className="input mt-1"
                            placeholder="e.g. Room 301"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Instructor *
                        </label>
                        <input
                            type="text"
                            value={form.instructor}
                            onChange={(e) =>
                                setForm({ ...form, instructor: e.target.value })
                            }
                            className="input mt-1"
                            placeholder="e.g. Dr. Smith"
                            required
                        />
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
                            Add Class
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}