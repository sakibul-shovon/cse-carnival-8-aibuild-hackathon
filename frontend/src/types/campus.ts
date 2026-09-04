export interface Booking {
  booking_id: string
  booked_by: string
  date: string
  start_time: string
  end_time: string
  purpose: string
}

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
  type: string
  capacity: number
  equipment: string[]
  floor: number
  status: string
  bookings: Booking[]
}

export interface Registration {
  student_id: string
  name: string
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
  registrations: Registration[]
  status: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  date: string
  priority: string
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
  status: string
  marks: number
}
