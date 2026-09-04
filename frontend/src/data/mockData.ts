import type { Announcement, Assignment, Event, Room, Schedule } from '../types/campus'

export const schedules: Schedule[] = [
  { id: 'sch-001', course: 'CSE 4113', title: 'Pattern Recognition and Machine Learning', day: 'Sunday', start_time: '13:00', end_time: '13:50', room: '7A07', instructor: 'Prof. Dr. Md. Shahriar Mahbub', section: 'B' },
  { id: 'sch-002', course: 'CSE 4173', title: 'Cyber Security', day: 'Sunday', start_time: '11:20', end_time: '12:10', room: '7A03', instructor: 'Prof. Dr. Md. Shamim Akhter', section: 'CS' },
  { id: 'sch-003', course: 'CSE 4114', title: 'Pattern Recognition and Machine Learning Lab', day: 'Monday', start_time: '13:00', end_time: '14:40', room: '7B08', instructor: 'Prof. Dr. Shahriar Mahbub', section: 'B1/B2' },
  { id: 'sch-004', course: 'CSE 4129', title: 'Formal Languages and Compilers', day: 'Tuesday', start_time: '08:00', end_time: '08:50', room: '7A05', instructor: 'Ms. Nusrat Jahan', section: 'B' },
  { id: 'sch-005', course: 'CSE 4137', title: 'Soft Computing', day: 'Wednesday', start_time: '16:20', end_time: '17:10', room: '7A03', instructor: 'Prof. Dr. Faisal Muhammad Shah', section: 'B' },
]

const booking = { booking_id: 'bk-001', booked_by: 'Nusrat Jahan', date: '2026-09-07', start_time: '13:00', end_time: '14:40', purpose: 'CSE 4129 Extra Class' }
export const rooms: Room[] = [
  ...['7A01', '7A02', '7A03', '7A04', '7A05', '7A06', '7A07'].map((room_number, index) => ({ id: `room-a-${index}`, room_number, type: 'classroom', capacity: index > 5 ? 50 : 40, equipment: ['whiteboard', 'projector', 'AC'], floor: 7, status: index === 5 ? 'booked' : 'available', bookings: index === 5 ? [booking] : [] })),
  ...['7B01', '7B02', '7B03', '7B04', '7B05', '7B06', '7B07', '7B08'].map((room_number, index) => ({ id: `room-b-${index}`, room_number, type: 'lab', capacity: 30, equipment: ['computers', 'AC', 'projector'], floor: 7, status: index === 4 ? 'maintenance' : 'available', bookings: [] })),
  ...['7C01', '7C02', '7C03', '7C04', '7C05'].map((room_number, index) => ({ id: `room-c-${index}`, room_number, type: 'seminar hall', capacity: 70, equipment: ['projector', 'sound system', 'AC'], floor: 7, status: 'available', bookings: [] })),
]

export const events: Event[] = [
  { id: 'evt-001', name: 'AUSTPIC AI Build Hackathon', description: '24-hour hackathon focused on building AI-powered applications. Open to all CSE students.', date: '2026-09-10', start_time: '09:00', end_time: '09:00', end_date: '2026-09-11', venue: '7C01', organizer: 'AUSTPIC', capacity: 60, registered: 47, registrations: [], status: 'upcoming' },
  { id: 'evt-002', name: 'Guest Lecture: Deep Learning in Medical Imaging', description: 'Industry talk by Dr. Iftekhar Ahmed on practical applications of CNNs in healthcare.', date: '2026-09-08', start_time: '14:00', end_time: '16:00', end_date: '2026-09-08', venue: '7C05', organizer: 'CSE Department', capacity: 70, registered: 62, registrations: [], status: 'upcoming' },
  { id: 'evt-003', name: 'Soft Computing Mid-Term Review Session', description: 'Extra prep session covering fuzzy logic and neural network basics.', date: '2026-09-06', start_time: '16:00', end_time: '18:00', end_date: '2026-09-06', venue: '7A04', organizer: 'Prof. Faisal Muhammad Shah', capacity: 45, registered: 38, registrations: [], status: 'upcoming' },
  { id: 'evt-004', name: 'CSE Carnival 8.0 Planning Meeting', description: 'Volunteers and organizers meeting to finalize the event lineup.', date: '2026-09-05', start_time: '15:30', end_time: '17:00', end_date: '2026-09-05', venue: '7C02', organizer: 'AUSTPIC', capacity: 30, registered: 22, registrations: [], status: 'upcoming' },
]

export const announcements: Announcement[] = [
  { id: 'ann-001', title: 'CSE 4113 Class Rescheduled', body: 'The Pattern Recognition class on Sunday at 1:00 PM has moved to Room 7A04 at 3:30 PM.', date: '2026-09-04', priority: 'high', posted_by: 'Prof. Shahriar Mahbub', expires: '2026-09-07' },
  { id: 'ann-002', title: 'CSE 4137 Midterm Syllabus', body: 'The Soft Computing midterm covers fuzzy sets, neural networks, and genetic algorithms.', date: '2026-09-03', priority: 'high', posted_by: 'Prof. Faisal Muhammad Shah', expires: '2026-09-20' },
  { id: 'ann-003', title: 'IPE 4111 Instructor Update', body: 'Mr. Md. Arif Hossain will conduct IPE 4111 from next week. The schedule remains unchanged.', date: '2026-09-02', priority: 'medium', posted_by: 'CSE Department', expires: '2026-09-10' },
  { id: 'ann-004', title: 'Library Closed on September 5', body: 'The AUST Central Library will remain closed due to maintenance work. Normal operations resume Saturday.', date: '2026-09-03', priority: 'low', posted_by: 'Library Authority', expires: '2026-09-05' },
]

export const assignments: Assignment[] = [
  { id: 'asgn-001', course: 'CSE 4113', course_title: 'Pattern Recognition and Machine Learning', title: 'Assignment 1: Bayes Classifier Implementation', description: 'Implement a Naive Bayes classifier from scratch using the Iris dataset.', assigned_date: '2026-08-28', deadline: '2026-09-09', submission_platform: 'Google Classroom', status: 'pending', marks: 10 },
  { id: 'asgn-002', course: 'CSE 4130', course_title: 'Formal Languages and Compilers Lab', title: 'Assignment 2: Lexical Analyzer using Flex', description: 'Write a lexical analyzer for a subset of C language using Flex.', assigned_date: '2026-08-25', deadline: '2026-09-10', submission_platform: 'Google Classroom', status: 'pending', marks: 15 },
  { id: 'asgn-003', course: 'CSE 4137', course_title: 'Soft Computing', title: 'Term Paper: Fuzzy Logic Application', description: 'Write a 2000-word term paper on a real-world application of fuzzy logic.', assigned_date: '2026-08-20', deadline: '2026-09-15', submission_platform: 'Physical submission', status: 'pending', marks: 20 },
  { id: 'asgn-004', course: 'CSE 4142', course_title: 'Data Warehousing and Mining Lab', title: 'Lab Report 1: Data Preprocessing with WEKA', description: 'Perform data preprocessing on the provided sales dataset using WEKA.', assigned_date: '2026-08-27', deadline: '2026-09-07', submission_platform: 'Physical submission', status: 'submitted', marks: 10 },
  { id: 'asgn-005', course: 'CSE 4173', course_title: 'Cyber Security', title: 'Assignment 1: CIA Triad Analysis', description: 'Analyze a documented cybersecurity breach using the CIA Triad framework.', assigned_date: '2026-08-29', deadline: '2026-09-11', submission_platform: 'Google Classroom', status: 'pending', marks: 10 },
]
