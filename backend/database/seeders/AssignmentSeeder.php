<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Assignment;

class AssignmentSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seed_data/assignments.json');
        $json = file_get_contents($path);
        $items = json_decode($json, true);

        foreach ($items as $item) {
            Assignment::create([
                'course' => $item['course'],
                'course_title' => $item['course_title'] ?? null,
                'title' => $item['title'],
                'description' => $item['description'] ?? null,
                'assigned_date' => $item['assigned_date'] ?? null,
                'deadline' => $item['deadline'],
                'submission_platform' => $item['submission_platform'] ?? null,
                'status' => $item['status'] ?? 'pending',
                'marks' => $item['marks'] ?? null,
            ]);
        }

        $this->command->info('Assignments seeded: ' . count($items));
    }
}