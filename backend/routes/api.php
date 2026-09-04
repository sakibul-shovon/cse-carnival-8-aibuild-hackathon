<?php

use App\Http\Controllers\AgentController;
use App\Http\Controllers\AnnouncementController;
use App\Http\Controllers\AssignmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EventController;
use App\Http\Controllers\RoomController;
use App\Http\Controllers\ScheduleController;
use Illuminate\Support\Facades\Route;

// Public endpoints
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'app' => 'CampusOS API', 'timestamp' => now()]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Authenticated Routes (Students, Teachers & Admins)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Read queries & dashboard stats
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Courses (Browse for all, Enroll/Drop for students)
    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/my-courses', [CourseController::class, 'myCourses']);
    Route::get('/courses/{id}', [CourseController::class, 'show']);
    Route::post('/courses/{id}/enroll', [CourseController::class, 'enroll']);
    Route::delete('/courses/{id}/enroll', [CourseController::class, 'drop']);

    // Schedules (Read for all)
    Route::get('/schedules', [ScheduleController::class, 'index']);
    Route::get('/schedules/{id}', [ScheduleController::class, 'show']);

    // Rooms (Read-only for students/teachers, bookings for Admin)
    Route::get('/rooms', [RoomController::class, 'index']);
    Route::get('/rooms/{id}', [RoomController::class, 'show']);

    // Events (Read & Registration for all)
    Route::get('/events', [EventController::class, 'index']);
    Route::get('/events/{id}', [EventController::class, 'show']);
    Route::post('/events/{id}/register', [EventController::class, 'register']);
    Route::post('/events/{id}/cancel-registration', [EventController::class, 'cancelRegistration']);

    // Announcements (Read for all)
    Route::get('/announcements', [AnnouncementController::class, 'index']);
    Route::get('/announcements/{id}', [AnnouncementController::class, 'show']);

    // Assignments (Read for all)
    Route::get('/assignments', [AssignmentController::class, 'index']);
    Route::get('/assignments/{id}', [AssignmentController::class, 'show']);

    // AI Assistant Chat & Action Tool Execution (role-aware)
    Route::post('/agent/chat', [AgentController::class, 'chat']);

    // Teacher & Admin Management (role:admin,teacher)
    Route::middleware('role:admin,teacher')->group(function () {
        // Courses CRUD (Teachers can manage own courses, Admins all)
        Route::post('/courses', [CourseController::class, 'store']);
        Route::put('/courses/{id}', [CourseController::class, 'update']);
        Route::delete('/courses/{id}', [CourseController::class, 'destroy']);
        Route::get('/courses/{id}/students', [CourseController::class, 'students']);
        Route::get('/teachers', [CourseController::class, 'teachers']);

        // Assignments CRUD (Teachers own courses, Admins all)
        Route::post('/assignments', [AssignmentController::class, 'store']);
        Route::put('/assignments/{id}', [AssignmentController::class, 'update']);
        Route::delete('/assignments/{id}', [AssignmentController::class, 'destroy']);

        // Announcements CRUD (Teachers own notices, Admins all)
        Route::post('/announcements', [AnnouncementController::class, 'store']);
        Route::put('/announcements/{id}', [AnnouncementController::class, 'update']);
        Route::delete('/announcements/{id}', [AnnouncementController::class, 'destroy']);

        // Events CRUD (Teachers own events, Admins all)
        Route::post('/events', [EventController::class, 'store']);
        Route::put('/events/{id}', [EventController::class, 'update']);
        Route::delete('/events/{id}', [EventController::class, 'destroy']);

        // Schedules CRUD (Teachers own courses, Admins all)
        Route::post('/schedules', [ScheduleController::class, 'store']);
        Route::put('/schedules/{id}', [ScheduleController::class, 'update']);
        Route::delete('/schedules/{id}', [ScheduleController::class, 'destroy']);
    });

    // Admin Only Management (role:admin)
    Route::middleware('role:admin')->group(function () {
        // Physical Rooms CRUD & Bookings (Admin Only)
        Route::post('/rooms', [RoomController::class, 'store']);
        Route::put('/rooms/{id}', [RoomController::class, 'update']);
        Route::delete('/rooms/{id}', [RoomController::class, 'destroy']);
        Route::post('/rooms/{id}/book', [RoomController::class, 'book']);
        Route::delete('/rooms/{id}/bookings/{bookingId}', [RoomController::class, 'cancelBooking']);
    });
});
