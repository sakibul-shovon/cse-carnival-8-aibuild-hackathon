-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create ENUMs for strict validation as per schema (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type') THEN
        CREATE TYPE room_type AS ENUM ('classroom', 'lab', 'seminar');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE room_status AS ENUM ('available', 'unavailable');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
        CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled', 'full');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_priority') THEN
        CREATE TYPE announcement_priority AS ENUM ('high', 'medium', 'low');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
        CREATE TYPE assignment_status AS ENUM ('pending', 'submitted', 'graded', 'late');
    END IF;
END $$;

-- 1. Schedules Table
CREATE TABLE IF NOT EXISTS public.schedules (
    id TEXT PRIMARY KEY,
    course TEXT NOT NULL,
    title TEXT NOT NULL,
    day TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    room TEXT NOT NULL,
    instructor TEXT NOT NULL,
    section TEXT NOT NULL
);

-- 2. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id TEXT PRIMARY KEY,
    room_number TEXT NOT NULL UNIQUE,
    type room_type NOT NULL,
    capacity INTEGER NOT NULL,
    equipment TEXT[] NOT NULL DEFAULT '{}',
    floor INTEGER NOT NULL,
    status room_status NOT NULL DEFAULT 'available'
);

-- 3. Room Bookings Table
CREATE TABLE IF NOT EXISTS public.room_bookings (
    booking_id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    booked_by TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose TEXT NOT NULL,
    -- Prevent overlapping bookings for the same room on the same day
    CONSTRAINT no_overlap EXCLUDE USING gist (
        room_id WITH =,
        date WITH =,
        timerange(start_time::time, end_time::time) WITH &&
    )
);

-- 4. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    end_date DATE NOT NULL,
    venue TEXT NOT NULL,
    organizer TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    registered INTEGER NOT NULL DEFAULT 0,
    status event_status NOT NULL DEFAULT 'upcoming'
);

-- 5. Event Registrations Table
CREATE TABLE IF NOT EXISTS public.event_registrations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(event_id, student_id)
);

-- 6. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    date DATE NOT NULL,
    priority announcement_priority NOT NULL DEFAULT 'low',
    posted_by TEXT NOT NULL,
    expires DATE NOT NULL
);

-- 7. Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
    id TEXT PRIMARY KEY,
    course TEXT NOT NULL,
    course_title TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    assigned_date DATE NOT NULL,
    deadline DATE NOT NULL,
    submission_platform TEXT NOT NULL,
    status assignment_status NOT NULL DEFAULT 'pending',
    marks INTEGER NOT NULL
);

-- Ensure the overlap-prevention constraint exists (idempotent; also covers a
-- room_bookings table that may have been created without it).
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap') THEN
        ALTER TABLE public.room_bookings
            ADD CONSTRAINT no_overlap EXCLUDE USING gist (
                room_id WITH =,
                date WITH =,
                timerange(start_time::time, end_time::time) WITH &&
            );
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_schedules_day ON public.schedules(day);
CREATE INDEX IF NOT EXISTS idx_room_bookings_date ON public.room_bookings(date);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_announcements_expires ON public.announcements(expires);
