USE CampusOS;
GO

/* Development admin account. Password is supplied out-of-band, never stored as plaintext. */
INSERT INTO dbo.Users (id, name, email, student_id, password_hash, role)
SELECT 'usr-admin-001', 'CampusOS Administrator', 'admin@campusos.local', NULL, '$2b$12$ZlVW5ePSgelplxvUr1O8QuVQbbJ/yqtrW3m1fA3SmvHXGXESe1.oC', 'admin'
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users WHERE email = 'admin@campusos.local');
GO

/* Rooms */
INSERT INTO dbo.Rooms (id, room_number, [type], capacity, floor, [status])
SELECT source.id, source.room_number, source.[type], source.capacity, source.floor, source.[status]
FROM (VALUES
    ('room-001', '7A01', 'classroom', 40, 7, 'available'),
    ('room-002', '7A02', 'classroom', 40, 7, 'available'),
    ('room-003', '7A03', 'classroom', 45, 7, 'available'),
    ('room-004', '7A04', 'classroom', 45, 7, 'available'),
    ('room-005', '7A05', 'classroom', 40, 7, 'available'),
    ('room-006', '7A06', 'classroom', 40, 7, 'booked'),
    ('room-007', '7A07', 'classroom', 50, 7, 'available'),
    ('room-008', '7B01', 'lab', 30, 7, 'available'),
    ('room-009', '7B02', 'lab', 30, 7, 'available'),
    ('room-010', '7B03', 'lab', 30, 7, 'available'),
    ('room-011', '7B04', 'lab', 30, 7, 'available'),
    ('room-012', '7B05', 'lab', 30, 7, 'available'),
    ('room-013', '7B06', 'lab', 30, 7, 'available'),
    ('room-014', '7B07', 'lab', 30, 7, 'available'),
    ('room-015', '7B08', 'lab', 30, 7, 'available'),
    ('room-016', '7C01', 'seminar hall', 70, 7, 'available'),
    ('room-017', '7C02', 'seminar hall', 55, 7, 'available'),
    ('room-018', '7C03', 'seminar hall', 55, 7, 'available'),
    ('room-019', '7C04', 'seminar hall', 60, 7, 'available'),
    ('room-020', '7C05', 'seminar hall', 70, 7, 'available')
) AS source(id, room_number, [type], capacity, floor, [status])
WHERE NOT EXISTS (SELECT 1 FROM dbo.Rooms AS target WHERE target.id = source.id);
GO

/* Normalized room equipment */
INSERT INTO dbo.RoomEquipment (room_id, equipment)
SELECT rooms.id, equipment.equipment
FROM dbo.Rooms AS rooms
JOIN (VALUES
    ('7A01', 'whiteboard'), ('7A01', 'projector'), ('7A01', 'AC'),
    ('7A02', 'whiteboard'), ('7A02', 'projector'), ('7A02', 'AC'),
    ('7A03', 'whiteboard'), ('7A03', 'projector'), ('7A03', 'AC'), ('7A03', 'smart board'),
    ('7A04', 'whiteboard'), ('7A04', 'projector'), ('7A04', 'AC'),
    ('7A05', 'whiteboard'), ('7A05', 'projector'), ('7A05', 'AC'),
    ('7A06', 'whiteboard'), ('7A06', 'projector'), ('7A06', 'AC'),
    ('7A07', 'whiteboard'), ('7A07', 'projector'), ('7A07', 'AC'), ('7A07', 'document camera'),
    ('7B01', 'computers'), ('7B01', 'AC'), ('7B01', 'projector'), ('7B01', 'whiteboard'),
    ('7B02', 'computers'), ('7B02', 'AC'), ('7B02', 'projector'),
    ('7B03', 'computers'), ('7B03', 'AC'), ('7B03', 'projector'),
    ('7B04', 'computers'), ('7B04', 'AC'), ('7B04', 'projector'),
    ('7B05', 'computers'), ('7B05', 'AC'), ('7B05', 'projector'),
    ('7B06', 'computers'), ('7B06', 'AC'), ('7B06', 'projector'),
    ('7B07', 'computers'), ('7B07', 'AC'), ('7B07', 'projector'),
    ('7B08', 'computers'), ('7B08', 'AC'), ('7B08', 'projector'),
    ('7C01', 'projector'), ('7C01', 'sound system'), ('7C01', 'AC'),
    ('7C02', 'projector'), ('7C02', 'sound system'), ('7C02', 'AC'),
    ('7C03', 'projector'), ('7C03', 'sound system'), ('7C03', 'AC'),
    ('7C04', 'projector'), ('7C04', 'sound system'), ('7C04', 'AC'),
    ('7C05', 'projector'), ('7C05', 'sound system'), ('7C05', 'AC')
) AS equipment(room_number, equipment) ON equipment.room_number = rooms.room_number
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.RoomEquipment AS existing
    WHERE existing.room_id = rooms.id AND existing.equipment = equipment.equipment
);
GO

/* Schedules */
INSERT INTO dbo.Schedules (id, course, title, day, start_time, end_time, room, instructor, section)
SELECT source.id, source.course, source.title, source.day, source.start_time, source.end_time, source.room, source.instructor, source.section
FROM (VALUES
    ('sch-001', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Sunday', '13:00', '13:50', '7A07', 'Prof. Dr. Md. Shahriar Mahbub', 'B'),
    ('sch-002', 'CSE 4173', 'Cyber Security', 'Sunday', '11:20', '12:10', '7A03', 'Prof. Dr. Md. Shamim Akhter', 'CS'),
    ('sch-003', 'CSE 4114', 'Pattern Recognition and Machine Learning Lab', 'Monday', '13:00', '14:40', '7B08', 'Prof. Dr. Shahriar Mahbub', 'B1/B2'),
    ('sch-004', 'CSE 4129', 'Formal Languages and Compilers', 'Tuesday', '08:00', '08:50', '7A05', 'Ms. Nusrat Jahan', 'B'),
    ('sch-005', 'CSE 4137', 'Soft Computing', 'Wednesday', '16:20', '17:10', '7A03', 'Prof. Dr. Faisal Muhammad Shah', 'B'),
    ('sch-006', 'CSE 4141', 'Data Warehousing and Mining', 'Thursday', '17:10', '18:00', '7A03', 'Mr. Saha Reno', 'DWM')
) AS source(id, course, title, day, start_time, end_time, room, instructor, section)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Schedules AS target WHERE target.id = source.id);
GO

/* Room bookings */
INSERT INTO dbo.RoomBookings (booking_id, room_id, booked_by, [date], start_time, end_time, purpose)
SELECT source.booking_id, rooms.id, source.booked_by, source.[date], source.start_time, source.end_time, source.purpose
FROM (VALUES
    ('bk-001', '7A06', 'Nusrat Jahan', '2026-09-07', '13:00', '14:40', 'CSE 4129 Extra Class'),
    ('bk-002', '7B05', 'AUSTPIC', '2026-09-07', '13:00', '15:00', 'Git and GitHub Workshop Setup'),
    ('bk-003', '7C02', 'CSE Department', '2026-09-05', '15:30', '17:00', 'CSE Carnival Planning Meeting')
) AS source(booking_id, room_number, booked_by, [date], start_time, end_time, purpose)
JOIN dbo.Rooms AS rooms ON rooms.room_number = source.room_number
WHERE NOT EXISTS (SELECT 1 FROM dbo.RoomBookings AS target WHERE target.booking_id = source.booking_id);
GO

/* Events */
INSERT INTO dbo.Events (id, name, description, [date], start_time, end_time, end_date, venue, organizer, capacity, registered, [status])
SELECT source.id, source.name, source.description, source.[date], source.start_time, source.end_time, source.end_date, source.venue, source.organizer, source.capacity, source.registered, source.[status]
FROM (VALUES
    ('evt-001', 'AUSTPIC AI Build Hackathon', '24-hour hackathon focused on building AI-powered applications. Open to all CSE students.', '2026-09-10', '09:00', '09:00', '2026-09-11', '7C01', 'AUSTPIC', 60, 47, 'upcoming'),
    ('evt-002', 'Guest Lecture: Deep Learning in Medical Imaging', 'Industry talk by Dr. Iftekhar Ahmed on practical applications of CNNs in Bangladeshi healthcare.', '2026-09-08', '14:00', '16:00', '2026-09-08', '7C05', 'CSE Department', 70, 62, 'upcoming'),
    ('evt-003', 'Soft Computing Mid-Term Review Session', 'Extra prep session covering fuzzy logic and neural network basics.', '2026-09-06', '16:00', '18:00', '2026-09-06', '7A04', 'Prof. Dr. Faisal Muhammad Shah', 45, 38, 'upcoming'),
    ('evt-004', 'CSE Carnival 8.0 Planning Meeting', 'Volunteers and organizers meeting to finalize the event lineup.', '2026-09-05', '15:30', '17:00', '2026-09-05', '7C02', 'AUSTPIC', 30, 22, 'upcoming'),
    ('evt-005', 'Freshers Orientation - CSE Fall 2026', 'Welcome session for newly admitted CSE students.', '2026-09-12', '10:00', '13:00', '2026-09-12', '7C05', 'CSE Department', 70, 55, 'upcoming')
) AS source(id, name, description, [date], start_time, end_time, end_date, venue, organizer, capacity, registered, [status])
WHERE NOT EXISTS (SELECT 1 FROM dbo.Events AS target WHERE target.id = source.id);
GO

/* Event registrations */
INSERT INTO dbo.EventRegistrations (student_id, event_id, name)
SELECT source.student_id, source.event_id, source.name
FROM (VALUES
    ('20-40532', 'evt-001', 'Sakibul Hassan'),
    ('20-40511', 'evt-001', 'Farhan Ahmed'),
    ('20-40498', 'evt-001', 'Tasnia Islam'),
    ('20-40532', 'evt-002', 'Sakibul Hassan'),
    ('21-41205', 'evt-002', 'Rafi Hossain'),
    ('20-40532', 'evt-003', 'Sakibul Hassan'),
    ('20-40511', 'evt-004', 'Farhan Ahmed')
) AS source(student_id, event_id, name)
WHERE NOT EXISTS
(
    SELECT 1
    FROM dbo.EventRegistrations AS target
    WHERE target.student_id = source.student_id AND target.event_id = source.event_id
);
GO

/* Announcements */
INSERT INTO dbo.Announcements (id, title, body, [date], priority, posted_by, expires)
SELECT source.id, source.title, source.body, source.[date], source.priority, source.posted_by, source.expires
FROM (VALUES
    ('ann-001', 'CSE 4113 Class Rescheduled', 'The Pattern Recognition class on Sunday at 1:00 PM has moved to Room 7A04 at 3:30 PM.', '2026-09-04', 'high', 'Prof. Shahriar Mahbub', '2026-09-07'),
    ('ann-002', 'CSE 4137 Midterm Syllabus', 'The Soft Computing midterm covers fuzzy sets, neural networks, and genetic algorithms.', '2026-09-03', 'high', 'Prof. Faisal Muhammad Shah', '2026-09-20'),
    ('ann-003', 'IPE 4111 Instructor Update', 'Mr. Md. Arif Hossain will conduct IPE 4111 from next week. The schedule remains unchanged.', '2026-09-02', 'medium', 'CSE Department', '2026-09-10'),
    ('ann-004', 'Library Closed on September 5', 'The AUST Central Library will remain closed due to maintenance work. Normal operations resume Saturday.', '2026-09-03', 'low', 'Library Authority', '2026-09-05'),
    ('ann-005', 'CSE 4130 Lab Assignment Deadline Extended', 'The deadline for CSE 4130 Lab Assignment 2 has been extended to September 10, 2026.', '2026-09-01', 'high', 'Ms. Nusrat Jahan', '2026-09-10')
) AS source(id, title, body, [date], priority, posted_by, expires)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Announcements AS target WHERE target.id = source.id);
GO

/* Assignments */
INSERT INTO dbo.Assignments (id, course, course_title, title, description, assigned_date, deadline, submission_platform, [status], marks)
SELECT source.id, source.course, source.course_title, source.title, source.description, source.assigned_date, source.deadline, source.submission_platform, source.[status], source.marks
FROM (VALUES
    ('asgn-001', 'CSE 4113', 'Pattern Recognition and Machine Learning', 'Assignment 1: Bayes Classifier Implementation', 'Implement a Naive Bayes classifier from scratch using the Iris dataset.', '2026-08-28', '2026-09-09', 'Google Classroom', 'pending', 10),
    ('asgn-002', 'CSE 4130', 'Formal Languages and Compilers Lab', 'Assignment 2: Lexical Analyzer using Flex', 'Write a lexical analyzer for a subset of C language using Flex.', '2026-08-25', '2026-09-10', 'Google Classroom', 'pending', 15),
    ('asgn-003', 'CSE 4137', 'Soft Computing', 'Term Paper: Fuzzy Logic Application', 'Write a 2000-word term paper on a real-world application of fuzzy logic.', '2026-08-20', '2026-09-15', 'Physical submission', 'pending', 20),
    ('asgn-004', 'CSE 4142', 'Data Warehousing and Mining Lab', 'Lab Report 1: Data Preprocessing with WEKA', 'Perform data preprocessing on the provided sales dataset using WEKA.', '2026-08-27', '2026-09-07', 'Physical submission', 'submitted', 10),
    ('asgn-005', 'CSE 4173', 'Cyber Security', 'Assignment 1: CIA Triad Analysis', 'Analyze a documented cybersecurity breach using the CIA Triad framework.', '2026-08-29', '2026-09-11', 'Google Classroom', 'pending', 10),
    ('asgn-006', 'CSE 4129', 'Formal Languages and Compilers', 'Problem Set 1: DFA and NFA Construction', 'Solve problems on constructing DFAs and NFAs for given languages.', '2026-08-26', '2026-09-04', 'Physical submission in class', 'submitted', 10)
) AS source(id, course, course_title, title, description, assigned_date, deadline, submission_platform, [status], marks)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Assignments AS target WHERE target.id = source.id);
GO
