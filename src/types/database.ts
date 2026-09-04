export type RoomType = 'classroom' | 'lab' | 'seminar'
export type RoomStatus = 'available' | 'unavailable'
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled' | 'full'
export type AnnouncementPriority = 'high' | 'medium' | 'low'
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'late'

export interface Schedule {
  id: string
  course: string
  title: string
  day: string
  start_time: string
  end_time: string
  room: string
  instructor: string
  section: string
}

export interface Room {
  id: string
  room_number: string
  type: RoomType
  capacity: number
  equipment: string[]
  floor: number
  status: RoomStatus
}

export interface RoomBooking {
  booking_id: string
  room_id: string
  booked_by: string
  date: string
  start_time: string
  end_time: string
  purpose: string
}

export interface Event {
  id: string
  name: string
  description: string
  date: string
  start_time: string
  end_time: string
  end_date: string
  venue: string
  organizer: string
  capacity: number
  registered: number
  status: EventStatus
}

export interface EventRegistration {
  id: string
  event_id: string
  student_id: string
  name: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  date: string
  priority: AnnouncementPriority
  posted_by: string
  expires: string
}

export interface Assignment {
  id: string
  course: string
  course_title: string
  title: string
  description: string
  assigned_date: string
  deadline: string
  submission_platform: string
  status: AssignmentStatus
  marks: number
}

// Database wrapper type for Supabase queries (simplified)
export interface Database {
  public: {
    Tables: {
      schedules: {
        Row: Schedule
        Insert: Schedule
        Update: Partial<Schedule>
      }
      rooms: {
        Row: Room
        Insert: Room
        Update: Partial<Room>
      }
      room_bookings: {
        Row: RoomBooking
        Insert: RoomBooking
        Update: Partial<RoomBooking>
      }
      events: {
        Row: Event
        Insert: Event
        Update: Partial<Event>
      }
      event_registrations: {
        Row: EventRegistration
        Insert: Omit<EventRegistration, 'id' | 'created_at'>
        Update: Partial<Omit<EventRegistration, 'id' | 'created_at'>>
      }
      announcements: {
        Row: Announcement
        Insert: Announcement
        Update: Partial<Announcement>
      }
      assignments: {
        Row: Assignment
        Insert: Assignment
        Update: Partial<Assignment>
      }
    }
  }
}
