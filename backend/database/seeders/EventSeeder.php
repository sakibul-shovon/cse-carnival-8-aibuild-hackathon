<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Event;

class EventSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seed_data/events.json');
        $json = file_get_contents($path);
        $items = json_decode($json, true);

        foreach ($items as $item) {
            $event = Event::create([
                'name' => $item['name'],
                'description' => $item['description'] ?? null,
                'date' => $item['date'],
                'start_time' => $item['start_time'],
                'end_time' => $item['end_time'],
                'end_date' => $item['end_date'] ?? $item['date'],
                'venue' => $item['venue'],
                'organizer' => $item['organizer'] ?? null,
                'capacity' => $item['capacity'],
                'registered' => $item['registered'] ?? 0,
                'status' => $item['status'] ?? 'upcoming',
            ]);

            if (!empty($item['registrations'])) {
                foreach ($item['registrations'] as $reg) {
                    $event->registrations()->create([
                        'student_id' => $reg['student_id'],
                        'name' => $reg['name'],
                    ]);
                }
            }
        }

        $this->command->info('Events seeded: ' . count($items));
    }
}