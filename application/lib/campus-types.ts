export type SystemName = 'schedules' | 'rooms' | 'events' | 'announcements' | 'assignments';
export type CampusRecord = Record<string, unknown> & { id: string };
export type CampusData = Record<SystemName, CampusRecord[]>;

export const SYSTEMS: SystemName[] = ['schedules', 'rooms', 'events', 'announcements', 'assignments'];

export const singular: Record<SystemName, string> = {
  schedules: 'Schedule', rooms: 'Room', events: 'Event', announcements: 'Announcement', assignments: 'Assignment',
};

export type FieldDefinition = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'time' | 'textarea' | 'select' | 'tags'; options?: string[]; required?: boolean };

export const FIELDS: Record<SystemName, FieldDefinition[]> = {
  schedules: [
    { key: 'course', label: 'Course code', required: true }, { key: 'title', label: 'Course title', required: true },
    { key: 'day', label: 'Day', type: 'select', options: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], required: true },
    { key: 'start_time', label: 'Start time', type: 'time', required: true }, { key: 'end_time', label: 'End time', type: 'time', required: true },
    { key: 'room', label: 'Room', required: true }, { key: 'instructor', label: 'Instructor', required: true }, { key: 'section', label: 'Section', required: true },
  ],
  rooms: [
    { key: 'room_number', label: 'Room number', required: true }, { key: 'type', label: 'Type', type: 'select', options: ['classroom', 'lab', 'seminar'], required: true },
    { key: 'capacity', label: 'Capacity', type: 'number', required: true }, { key: 'equipment', label: 'Equipment (comma separated)', type: 'tags', required: true },
    { key: 'floor', label: 'Floor', type: 'number', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['available', 'unavailable'], required: true },
  ],
  events: [
    { key: 'name', label: 'Event name', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true },
    { key: 'date', label: 'Start date', type: 'date', required: true }, { key: 'start_time', label: 'Start time', type: 'time', required: true },
    { key: 'end_time', label: 'End time', type: 'time', required: true }, { key: 'end_date', label: 'End date', type: 'date', required: true },
    { key: 'venue', label: 'Venue', required: true }, { key: 'organizer', label: 'Organizer', required: true },
    { key: 'capacity', label: 'Capacity', type: 'number', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['upcoming', 'ongoing', 'completed', 'cancelled', 'full'], required: true },
  ],
  announcements: [
    { key: 'title', label: 'Title', required: true }, { key: 'body', label: 'Announcement', type: 'textarea', required: true },
    { key: 'date', label: 'Posted date', type: 'date', required: true }, { key: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'], required: true },
    { key: 'posted_by', label: 'Posted by', required: true }, { key: 'expires', label: 'Expires', type: 'date', required: true },
  ],
  assignments: [
    { key: 'course', label: 'Course code', required: true }, { key: 'course_title', label: 'Course title', required: true },
    { key: 'title', label: 'Assignment title', required: true }, { key: 'description', label: 'Description', type: 'textarea', required: true },
    { key: 'assigned_date', label: 'Assigned date', type: 'date', required: true }, { key: 'deadline', label: 'Deadline', type: 'date', required: true },
    { key: 'submission_platform', label: 'Submission platform', required: true }, { key: 'status', label: 'Status', type: 'select', options: ['pending', 'submitted', 'graded', 'late'], required: true },
    { key: 'marks', label: 'Marks', type: 'number', required: true },
  ],
};
