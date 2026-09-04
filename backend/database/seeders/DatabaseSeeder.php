<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Event;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 0. Seed Demo Users (Student, Teacher, Admin)
        $studentUser = User::updateOrCreate(
            ['email' => 'student@campusos.com'],
            [
                'name' => 'Sakibul Hassan',
                'password' => Hash::make('password'),
                'role' => 'student',
            ]
        );

        $studentMahi = User::updateOrCreate(
            ['email' => 'mahi@campusos.com'],
            [
                'name' => 'Mahi Chowdhury',
                'password' => Hash::make('password'),
                'role' => 'student',
            ]
        );

        $teacherUser = User::updateOrCreate(
            ['email' => 'teacher@campusos.com'],
            [
                'name' => 'Dr. Tariq Rahman',
                'password' => Hash::make('password'),
                'role' => 'teacher',
            ]
        );

        $teacherAhmed = User::updateOrCreate(
            ['email' => 'prof.ahmed@campusos.com'],
            [
                'name' => 'Prof. Shakil Ahmed',
                'password' => Hash::make('password'),
                'role' => 'teacher',
            ]
        );

        $adminUser = User::updateOrCreate(
            ['email' => 'admin@campusos.com'],
            [
                'name' => 'CampusOS Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        // 1. Seed Core Courses with Teacher Ownership
        $coursesData = [
            [
                'id' => 'CRS-CSE321',
                'course_code' => 'CSE 321',
                'course_name' => 'Computer Networks',
                'description' => 'Architecture, routing protocols, TCP/IP stack, socket programming, and wireless networks.',
                'teacher_id' => $teacherUser->id,
                'section' => 'A',
                'capacity' => 40,
                'status' => 'active',
            ],
            [
                'id' => 'CRS-CSE331',
                'course_code' => 'CSE 331',
                'course_name' => 'Database Systems',
                'description' => 'Relational modeling, SQL, ACID transactions, indexing, query optimization, and normalization.',
                'teacher_id' => $teacherUser->id,
                'section' => 'B',
                'capacity' => 35,
                'status' => 'active',
            ],
            [
                'id' => 'CRS-CSE341',
                'course_code' => 'CSE 341',
                'course_name' => 'Artificial Intelligence',
                'description' => 'Search algorithms, heuristics, knowledge representation, reinforcement learning, and neural networks.',
                'teacher_id' => $teacherAhmed->id,
                'section' => 'A',
                'capacity' => 40,
                'status' => 'active',
            ],
            [
                'id' => 'CRS-CSE351',
                'course_code' => 'CSE 351',
                'course_name' => 'Software Engineering',
                'description' => 'Agile processes, design patterns, microservices architecture, CI/CD pipelines, and software testing.',
                'teacher_id' => $teacherAhmed->id,
                'section' => 'C',
                'capacity' => 30,
                'status' => 'active',
            ],
            [
                'id' => 'CRS-CSE4113',
                'course_code' => 'CSE 4113',
                'course_name' => 'Industrial Management',
                'description' => 'Organizational leadership, financial engineering, operations research, and product strategy.',
                'teacher_id' => $teacherUser->id,
                'section' => 'B',
                'capacity' => 45,
                'status' => 'active',
            ],
            [
                'id' => 'CRS-CSE4125',
                'course_code' => 'CSE 4125',
                'course_name' => 'Distributed Databases',
                'description' => 'Distributed query execution, 2-phase commit, consensus algorithms (Raft/Paxos), and NoSQL scaling.',
                'teacher_id' => $teacherAhmed->id,
                'section' => 'A',
                'capacity' => 40,
                'status' => 'active',
            ],
        ];

        foreach ($coursesData as $cData) {
            \App\Models\Course::updateOrCreate(['id' => $cData['id']], $cData);
        }

        // 2. Seed Student Enrollments
        \App\Models\CourseEnrollment::updateOrCreate(
            ['student_id' => $studentUser->id, 'course_id' => 'CRS-CSE321'],
            ['status' => 'enrolled', 'enrolled_at' => now()->subDays(5)]
        );
        \App\Models\CourseEnrollment::updateOrCreate(
            ['student_id' => $studentUser->id, 'course_id' => 'CRS-CSE331'],
            ['status' => 'enrolled', 'enrolled_at' => now()->subDays(4)]
        );
        \App\Models\CourseEnrollment::updateOrCreate(
            ['student_id' => $studentUser->id, 'course_id' => 'CRS-CSE4113'],
            ['status' => 'enrolled', 'enrolled_at' => now()->subDays(2)]
        );

        \App\Models\CourseEnrollment::updateOrCreate(
            ['student_id' => $studentMahi->id, 'course_id' => 'CRS-CSE321'],
            ['status' => 'enrolled', 'enrolled_at' => now()->subDays(3)]
        );
        \App\Models\CourseEnrollment::updateOrCreate(
            ['student_id' => $studentMahi->id, 'course_id' => 'CRS-CSE341'],
            ['status' => 'enrolled', 'enrolled_at' => now()->subDays(1)]
        );

        $dataPath = base_path('../data');

        // Schedules
        if (File::exists("$dataPath/schedules.json")) {
            $schedules = json_decode(File::get("$dataPath/schedules.json"), true);
            foreach ($schedules as $item) {
                Schedule::updateOrCreate(['id' => $item['id']], $item);
            }
        }

        // Rooms
        if (File::exists("$dataPath/rooms.json")) {
            $rooms = json_decode(File::get("$dataPath/rooms.json"), true);
            foreach ($rooms as $item) {
                Room::updateOrCreate(['id' => $item['id']], [
                    'id' => $item['id'],
                    'room_number' => $item['room_number'],
                    'type' => $item['type'],
                    'capacity' => $item['capacity'],
                    'equipment' => $item['equipment'] ?? [],
                    'floor' => $item['floor'] ?? 7,
                    'status' => $item['status'] ?? 'available',
                    'bookings' => $item['bookings'] ?? [],
                ]);
            }
        }

        // Events
        if (File::exists("$dataPath/events.json")) {
            $events = json_decode(File::get("$dataPath/events.json"), true);
            foreach ($events as $item) {
                Event::updateOrCreate(['id' => $item['id']], [
                    'id' => $item['id'],
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'date' => $item['date'],
                    'start_time' => $item['start_time'],
                    'end_time' => $item['end_time'],
                    'end_date' => $item['end_date'] ?? $item['date'],
                    'venue' => $item['venue'],
                    'organizer' => $item['organizer'],
                    'capacity' => $item['capacity'],
                    'registered' => $item['registered'] ?? count($item['registrations'] ?? []),
                    'registrations' => $item['registrations'] ?? [],
                    'status' => $item['status'] ?? 'upcoming',
                ]);
            }
        }

        // Announcements
        if (File::exists("$dataPath/announcements.json")) {
            $announcements = json_decode(File::get("$dataPath/announcements.json"), true);
            foreach ($announcements as $item) {
                Announcement::updateOrCreate(['id' => $item['id']], $item);
            }
        }

        // Assignments
        if (File::exists("$dataPath/assignments.json")) {
            $assignments = json_decode(File::get("$dataPath/assignments.json"), true);
            foreach ($assignments as $item) {
                Assignment::updateOrCreate(['id' => $item['id']], $item);
            }
        }
    }
}
