export interface User {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin';
}

export interface Announcement {
    id: string;
    title: string;
    body: string;
    date: string;
    priority: 'low' | 'medium' | 'high';
    posted_by: string;
    expires: string | null;
}

export interface Assignment {
    id: string;
    course: string;
    course_title: string;
    title: string;
    description: string;
    assigned_date: string;
    deadline: string;
    submission_platform: string | null;
    status: 'pending' | 'active' | 'closed';
    marks: number | null;
    created_by: string;
    my_submission_status?: 'not_submitted' | 'submitted' | 'graded';
}

export interface ScheduleSlot {
    id: number;
    course: string;
    day: string;
    time: string;
    room: string;
    instructor: string;
}

export interface Submission {
    id: string;
    assignment_id: string;
    student_id: string;
    status: 'submitted' | 'graded';
    submitted_at: string;
    marks: number | null;
}