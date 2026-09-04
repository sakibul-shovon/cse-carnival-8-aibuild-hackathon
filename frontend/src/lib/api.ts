const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

interface ApiOptions extends RequestInit {
    userId?: string;
}

async function apiFetch<T>(
    endpoint: string,
    options: ApiOptions = {}
): Promise<T> {
    const { userId, ...fetchOptions } = options;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
    };

    if (userId) {
        headers['X-User-Id'] = userId;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
    });

    if (!response.ok) {
        let errorMessage = 'An error occurred';
        try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return {} as T;
    }

    return response.json();
}

export const api = {
    // Users
    getUsers: (userId: string) =>
        apiFetch<User[]>('/users', { userId }),

    // Announcements
    getAnnouncements: (userId: string) =>
        apiFetch<Announcement[]>('/announcements', { userId }),

    createAnnouncement: (userId: string, data: Omit<Announcement, 'id' | 'posted_by'>) =>
        apiFetch<Announcement>('/announcements', {
            userId,
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateAnnouncement: (userId: string, id: string, data: Partial<Announcement>) =>
        apiFetch<{ success: boolean }>(`/announcements/${id}`, {
            userId,
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteAnnouncement: (userId: string, id: string) =>
        apiFetch<{ success: boolean }>(`/announcements/${id}`, {
            userId,
            method: 'DELETE',
        }),

    // Assignments
    getAssignments: (userId: string) =>
        apiFetch<Assignment[]>('/assignments', { userId }),

    createAssignment: (userId: string, data: Omit<Assignment, 'id' | 'status' | 'created_by'>) =>
        apiFetch<Assignment>('/assignments', {
            userId,
            method: 'POST',
            body: JSON.stringify(data),
        }),

    submitAssignment: (userId: string, assignmentId: string) =>
        apiFetch<{ success: boolean }>(`/assignments/${assignmentId}/submit`, {
            userId,
            method: 'POST',
        }),

    // Schedule
    getSchedule: (userId: string) =>
        apiFetch<ScheduleSlot[]>('/schedule', { userId }),

    createSchedule: (userId: string, data: Omit<ScheduleSlot, 'id'>) =>
        apiFetch<ScheduleSlot>('/schedule', {
            userId,
            method: 'POST',
            body: JSON.stringify(data),
        }),
};