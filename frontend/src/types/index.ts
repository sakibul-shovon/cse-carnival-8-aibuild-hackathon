export interface Schedule {
  id: number;
  course: string;
  title: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  instructor: string;
  section: string;
}

export interface RoomBooking {
  id: number;
  room_id: number;
  booked_by: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string;
}

export interface Room {
  id: number;
  room_number: string;
  type: string;
  capacity: number;
  equipment: string[];
  floor: string;
  status: string;
  bookings: RoomBooking[];
}

export interface EventRegistration {
  id: number;
  event_id: number;
  student_id: string;
  name: string;
}

export interface Event {
  id: number;
  name: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  capacity: number;
  registered: number;
  status: string;
  registrations: EventRegistration[];
}

export interface Announcement {
  id: number;
  title: string;
  body: string;
  date: string;
  priority: 'low' | 'medium' | 'high';
  posted_by: string;
  expires?: string;
}

export interface Assignment {
  id: number;
  course: string;
  course_title: string;
  title: string;
  description: string;
  deadline: string;
  submission_platform: string;
  status: string;
  marks?: number;
}