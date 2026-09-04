<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\ScheduleController;
use Illuminate\Support\Facades\Route;

// Health check
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'app' => 'CampusOS API', 'timestamp' => now()]);
});

// Dashboard stats
Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

// Schedules CRUD
Route::apiResource('schedules', ScheduleController::class);

// Rooms CRUD + Book / Cancel
Route::apiResource('rooms', RoomController::class);
Route::post('rooms/{id}/book', [RoomController::class, 'book']);
Route::delete('rooms/{id}/bookings/{bookingId}', [RoomController::class, 'cancelBooking']);

// Events CRUD + Register / Cancel
Route::apiResource('events', EventController::class);
Route::post('events/{id}/register', [EventController::class, 'register']);
Route::post('events/{id}/cancel-registration', [EventController::class, 'cancelRegistration']);

// Announcements CRUD
Route::apiResource('announcements', AnnouncementController::class);

// Assignments CRUD
Route::apiResource('assignments', AssignmentController::class);

// AI Assistant Chat & Action Tool Execution
Route::post('/agent/chat', [AgentController::class, 'chat']);
