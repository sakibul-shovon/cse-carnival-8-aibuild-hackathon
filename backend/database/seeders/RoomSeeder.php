<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Room;

class RoomSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seed_data/rooms.json');
        $json = file_get_contents($path);
        $items = json_decode($json, true);

        foreach ($items as $item) {
            $room = Room::create([
                'room_number' => $item['room_number'],
                'type' => $item['type'],
                'capacity' => $item['capacity'],
                'equipment' => $item['equipment'] ?? [],
                'floor' => $item['floor'],
                'status' => $item['status'] ?? 'available',
            ]);

            if (!empty($item['bookings'])) {
                foreach ($item['bookings'] as $booking) {
                    $room->bookings()->create([
                        'booked_by' => $booking['booked_by'],
                        'date' => $booking['date'],
                        'start_time' => $booking['start_time'],
                        'end_time' => $booking['end_time'],
                        'purpose' => $booking['purpose'] ?? null,
                    ]);
                }
            }
        }

        $this->command->info('Rooms seeded: ' . count($items));
    }
}