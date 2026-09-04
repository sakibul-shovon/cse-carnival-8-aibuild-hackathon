import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { User } from '../types';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { UsersIcon } from '../components/Icons';

const roleColors: Record<string, 'blue' | 'green' | 'purple'> = {
    student: 'green',
    teacher: 'blue',
    admin: 'purple',
};

export default function UsersPage() {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await api.getUsers(user.id);
            setUsers(data);
            setError('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [user]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                <p className="text-sm text-slate-500">
                    {users.length} members in the campus community
                </p>
            </div>

            {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {users.length === 0 ? (
                <EmptyState
                    title="No users found"
                    description="There was an issue loading the user directory."
                    icon={<UsersIcon className="h-12 w-12" />}
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {users.map((u) => {
                        const isCurrent = user?.id === u.id;
                        return (
                            <div
                                key={u.id}
                                className={`card transition-colors ${
                                    isCurrent ? 'border-primary-300 bg-primary-50/50' : ''
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                                            isCurrent
                                                ? 'bg-primary-600 text-white'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {u.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .toUpperCase()
                                            .slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-slate-900 truncate">
                                                {u.name}
                                            </p>
                                            {isCurrent && (
                                                <Badge variant="blue">You</Badge>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">
                                            {u.email}
                                        </p>
                                    </div>
                                    <Badge variant={roleColors[u.role] || 'slate'}>
                                        {u.role}
                                    </Badge>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}