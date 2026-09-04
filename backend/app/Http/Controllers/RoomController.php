<?php

namespace App\Http\Controllers;

use App\Models\Room;
use App\Models\RoomBooking;
use Illuminate\Http\Request;

class RoomController extends Controller
{
    // GET all rooms
    public function index()
    {
        $rooms = Room::with('bookings')->get();
        return response()->json($rooms, 200);
    }

    // POST create room
    public function store(Request $request)
    {
        $validated = $request->validate([
            'room_number' => 'required|string|unique:rooms',
            'type' => 'required|string',
            'capacity' => 'required|integer',
            'equipment' => 'sometimes|array',
            'floor' => 'required|string',
            'status' => 'sometimes|string',
        ]);

        $room = Room::create($validated);
        return response()->json($room, 201);
    }

    // GET single room
    public function show($id)
    {
        $room = Room::with('bookings')->find($id);
        if (!$room) {
            return response()->json(['error' => 'Not found'], 404);
        }
        return response()->json($room, 200);
    }

    // PUT update room
    public function update(Request $request, $id)
    {
        $room = Room::find($id);
        if (!$room) {
            return response()->json(['error' => 'Not found'], 404);
        }

        $validated = $request->validate([
            'type' => 'sometimes|string',
            'capacity' => 'sometimes|integer',
            'equipment' => 'sometimes|array',
            'floor' => 'sometimes|string',
            'status' => 'sometimes|string',
        ]);

        $room->update($validated);
        return response()->json($room->load('bookings'), 200);
    }

    // DELETE room
    public function destroy($id)
    {
        $room = Room::find($id);
        if (!$room) {
            return response()->json(['error' => 'Not found'], 404);
        }
        $room->delete();
        return response()->json(['message' => 'Deleted'], 200);
    }

    // POST book a room
    public function bookRoom(Request $request, $id)
    {
        $room = Room::find($id);
        if (!$room) {
            return response()->json(['error' => 'Room not found'], 404);
        }

        $validated = $request->validate([
            'booked_by' => 'required|string',
            'date' => 'required|date',
            'start_time' => 'required|string',
            'end_time' => 'required|string',
            'purpose' => 'required|string',
        ]);

        // Check if room is available at this time
        $conflict = RoomBooking::where('room_id', $id)
            ->where('date', $validated['date'])
            ->where(function ($q) use ($validated) {
                $q->whereBetween('start_time', [$validated['start_time'], $validated['end_time']])
                  ->orWhereBetween('end_time', [$validated['start_time'], $validated['end_time']]);
            })
            ->exists();

        if ($conflict) {
            return response()->json(['error' => 'Room not available at this time'], 409);
        }

        $booking = RoomBooking::create([
            'room_id' => $id,
            ...$validated,
        ]);

        return response()->json($booking, 201);
    }

    // DELETE cancel booking
    public function cancelBooking($roomId, $bookingId)
    {
        $booking = RoomBooking::find($bookingId);
        if (!$booking || $booking->room_id != $roomId) {
            return response()->json(['error' => 'Booking not found'], 404);
        }
        $booking->delete();
        return response()->json(['message' => 'Booking cancelled'], 200);
    }
}