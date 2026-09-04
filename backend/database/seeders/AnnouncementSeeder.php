<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Announcement;

class AnnouncementSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seed_data/announcements.json');
        $json = file_get_contents($path);
        $items = json_decode($json, true);

        foreach ($items as $item) {
            Announcement::create([
                'title' => $item['title'],
                'body' => $item['body'],
                'date' => $item['date'],
                'priority' => $item['priority'] ?? 'medium',
                'posted_by' => $item['posted_by'] ?? null,
                'expires' => $item['expires'] ?? null,
            ]);
        }

        $this->command->info('Announcements seeded: ' . count($items));
    }
}