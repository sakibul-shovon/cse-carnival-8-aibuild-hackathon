// Domain types mirror schema/schema.md. Kept in sync with the official CampusOS schema.

export type WeekDay =
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday";

export type Schedule = {
  id: string;
  course: string;
  title: string;
  day: WeekDay;
  start_time: string; // "HH:MM"
  end_time: string; // "HH:MM"
  room: string;
  instructor: string;
  section: string;
};

export type RoomBooking = {
  booking_id: string;
  booked_by: string;
  date: string; // "YYYY-MM-DD"
  start_time: string;
  end_time: string;
  purpose: string;
};

export type RoomType = "classroom" | "lab" | "seminar";
export type RoomStatus = "available" | "unavailable";

export type Room = {
  id: string;
  room_number: string;
  type: RoomType;
  capacity: number;
  equipment: string[];
  floor: number;
  status: RoomStatus;
  bookings: RoomBooking[];
};

export type EventRegistration = {
  student_id: string;
  name: string;
};

export type EventStatus =
  | "upcoming"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "full";

export type CampusEvent = {
  id: string;
  name: string;
  description: string;
  date: string; // "YYYY-MM-DD"
  start_time: string;
  end_time: string;
  end_date: string;
  venue: string;
  organizer: string;
  capacity: number;
  registered: number;
  registrations: EventRegistration[];
  status: EventStatus;
};

export type AnnouncementPriority = "high" | "medium" | "low";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string; // "YYYY-MM-DD"
  priority: AnnouncementPriority;
  posted_by: string;
  expires: string; // "YYYY-MM-DD"
};

export type AssignmentStatus = "pending" | "submitted" | "graded" | "late";

export type Assignment = {
  id: string;
  course: string;
  course_title: string;
  title: string;
  description: string;
  assigned_date: string;
  deadline: string; // "YYYY-MM-DD"
  submission_platform: string;
  status: AssignmentStatus;
  marks: number;
};

export type DashboardData = {
  schedules: Schedule[];
  rooms: Room[];
  events: CampusEvent[];
  announcements: Announcement[];
  assignments: Assignment[];
};
