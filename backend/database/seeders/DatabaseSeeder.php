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
        // 0. Seed Demo Users (Student & Admin)
        User::updateOrCreate(
            ['email' => 'student@campusos.com'],
            [
                'name' => 'Sakibul Hassan',
                'password' => Hash::make('password'),
                'role' => 'student',
            ]
        );

        User::updateOrCreate(
            ['email' => 'admin@campusos.com'],
            [
                'name' => 'CampusOS Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
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
