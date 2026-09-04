<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Schedule;
use Illuminate\Support\Facades\DB;

class ScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seed_data/schedules.json');
        $json = file_get_contents($path);
        $items = json_decode($json, true);

        foreach ($items as $item) {
            Schedule::create([
                'course' => $item['course'],
                'title' => $item['title'],
                'day' => $item['day'],
                'start_time' => $item['start_time'],
                'end_time' => $item['end_time'],
                'room' => $item['room'],
                'instructor' => $item['instructor'] ?? null,
                'section' => $item['section'] ?? null,
            ]);
        }

        $this->command->info('Schedules seeded: ' . count($items));
    }
}