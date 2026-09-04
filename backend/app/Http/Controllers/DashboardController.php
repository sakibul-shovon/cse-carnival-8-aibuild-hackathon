<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\Assignment;
use App\Models\Event;
use App\Models\Room;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $totalSchedules = Schedule::count();
        $totalRooms = Room::count();
        $availableRooms = Room::where('status', 'available')->count();
        $totalEvents = Event::count();
        $upcomingEvents = Event::where('status', 'upcoming')->count();
        $totalAnnouncements = Announcement::count();
        $highPriorityAnnouncements = Announcement::where('priority', 'high')->count();
        $totalAssignments = Assignment::count();
        $pendingAssignments = Assignment::where('status', 'pending')->count();

        // Recent / upcoming items
        $recentAnnouncements = Announcement::orderByDesc('date')->take(5)->get();
        $upcomingEventsList = Event::whereIn('status', ['upcoming', 'ongoing'])->orderBy('date')->take(5)->get();
        $upcomingAssignmentsList = Assignment::where('status', 'pending')->orderBy('deadline')->take(5)->get();
        $todaySchedules = Schedule::orderBy('start_time')->take(6)->get();

        return response()->json([
            'counts' => [
                'schedules' => $totalSchedules,
                'rooms' => $totalRooms,
                'available_rooms' => $availableRooms,
                'events' => $totalEvents,
                'upcoming_events' => $upcomingEvents,
                'announcements' => $totalAnnouncements,
                'high_priority_announcements' => $highPriorityAnnouncements,
                'assignments' => $totalAssignments,
                'pending_assignments' => $pendingAssignments,
            ],
            'recent_announcements' => $recentAnnouncements,
            'upcoming_events' => $upcomingEventsList,
            'upcoming_assignments' => $upcomingAssignmentsList,
            'today_schedules' => $todaySchedules,
        ]);
    }
}
