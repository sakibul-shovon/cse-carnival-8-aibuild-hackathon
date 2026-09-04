<?php

namespace App\Http\Controllers;

use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoomController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Room::query();

        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('min_capacity')) {
            $query->where('capacity', '>=', (int)$request->query('min_capacity'));
        }

        if ($request->filled('floor')) {
            $query->where('floor', (int)$request->query('floor'));
        }

        if ($request->filled('equipment')) {
            $equipmentNeeded = explode(',', $request->query('equipment'));
            foreach ($equipmentNeeded as $eq) {
                $eq = trim($eq);
                if ($eq !== '') {
                    $query->whereJsonContains('equipment', $eq);
                }
            }
        }

        if ($request->filled('search')) {
            $search = $request->query('search');
            $query->where('room_number', 'like', "%$search%");
        }

        return response()->json($query->orderBy('room_number')->get());
    }

    public function show(string $id): JsonResponse
    {
        $room = Room::where('id', $id)->orWhere('room_number', $id)->first();
        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }
        return response()->json($room);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'nullable|string',
            'room_number' => 'required|string|unique:rooms,room_number',
            'type' => 'required|string|in:classroom,lab,seminar',
            'capacity' => 'required|integer|min:1',
            'equipment' => 'nullable|array',
            'floor' => 'nullable|integer',
            'status' => 'nullable|string|in:available,unavailable',
            'bookings' => 'nullable|array',
        ]);

        if (empty($validated['id'])) {
            $validated['id'] = 'room-' . Str::padLeft(Room::count() + 1, 3, '0');
        }
        if (!isset($validated['floor'])) {
            $validated['floor'] = 7;
        }
        if (!isset($validated['status'])) {
            $validated['status'] = 'available';
        }
        if (!isset($validated['equipment'])) {
            $validated['equipment'] = [];
        }
        if (!isset($validated['bookings'])) {
            $validated['bookings'] = [];
        }

        $room = Room::create($validated);
        return response()->json($room, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $room = Room::where('id', $id)->orWhere('room_number', $id)->first();
        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        $validated = $request->validate([
            'room_number' => 'sometimes|required|string|unique:rooms,room_number,' . $room->id,
            'type' => 'sometimes|required|string|in:classroom,lab,seminar',
            'capacity' => 'sometimes|required|integer|min:1',
            'equipment' => 'nullable|array',
            'floor' => 'nullable|integer',
            'status' => 'nullable|string|in:available,unavailable',
            'bookings' => 'nullable|array',
        ]);

        $room->update($validated);
        return response()->json($room);
    }

    public function destroy(string $id): JsonResponse
    {
        $room = Room::where('id', $id)->orWhere('room_number', $id)->first();
        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }
        $room->delete();
        return response()->json(['message' => 'Room deleted successfully']);
    }

    public function book(Request $request, string $id): JsonResponse
    {
        $room = Room::where('id', $id)->orWhere('room_number', $id)->first();
        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        $validated = $request->validate([
            'booked_by' => 'required|string',
            'date' => 'required|string',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'purpose' => 'required|string',
        ]);

        $bookings = $room->bookings ?? [];

        // Check time clash on same date
        foreach ($bookings as $b) {
            if ($b['date'] === $validated['date']) {
                $existingStart = $b['start_time'];
                $existingEnd = $b['end_time'];
                if ($validated['start_time'] < $existingEnd && $validated['end_time'] > $existingStart) {
                    return response()->json([
                        'message' => "Room {$room->room_number} is already booked on {$validated['date']} from {$existingStart} to {$existingEnd} for '{$b['purpose']}'."
                    ], 422);
                }
            }
        }

        $newBooking = [
            'booking_id' => 'bk-' . Str::random(6),
            'booked_by' => $validated['booked_by'],
            'date' => $validated['date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
            'purpose' => $validated['purpose'],
        ];

        $bookings[] = $newBooking;
        $room->bookings = $bookings;
        $room->save();

        return response()->json([
            'message' => "Successfully booked room {$room->room_number}",
            'booking' => $newBooking,
            'room' => $room,
        ], 201);
    }

    public function cancelBooking(string $id, string $bookingId): JsonResponse
    {
        $room = Room::where('id', $id)->orWhere('room_number', $id)->first();
        if (!$room) {
            return response()->json(['message' => 'Room not found'], 404);
        }

        $bookings = $room->bookings ?? [];
        $found = false;
        $updated = [];
        foreach ($bookings as $b) {
            if (($b['booking_id'] ?? '') === $bookingId) {
                $found = true;
            } else {
                $updated[] = $b;
            }
        }

        if (!$found) {
            return response()->json(['message' => 'Booking ID not found in this room'], 404);
        }

        $room->bookings = $updated;
        $room->save();

        return response()->json([
            'message' => "Booking cancelled successfully",
            'room' => $room,
        ]);
    }
}
