import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedData() {
  console.log('Starting seed process...');

  try {
    // 1. Seed Schedules
    const schedulesPath = path.resolve(__dirname, '../data/schedules.json');
    if (fs.existsSync(schedulesPath)) {
      const schedules = JSON.parse(fs.readFileSync(schedulesPath, 'utf8'));
      const { error } = await supabase.from('schedules').upsert(schedules);
      if (error) throw error;
      console.log(`Seeded ${schedules.length} schedules.`);
    }

    // 2. Seed Rooms & Room Bookings
    const roomsPath = path.resolve(__dirname, '../data/rooms.json');
    if (fs.existsSync(roomsPath)) {
      const roomsRaw = JSON.parse(fs.readFileSync(roomsPath, 'utf8'));
      
      const rooms = [];
      const roomBookings = [];

      for (const r of roomsRaw) {
        // Extract room data without bookings
        const { bookings, ...roomData } = r;
        rooms.push(roomData);
        
        // Extract bookings and attach room_id
        if (bookings && bookings.length > 0) {
          for (const b of bookings) {
            roomBookings.push({
              ...b,
              room_id: r.id
            });
          }
        }
      }

      // Upsert rooms
      const { error: roomError } = await supabase.from('rooms').upsert(rooms);
      if (roomError) throw roomError;
      console.log(`Seeded ${rooms.length} rooms.`);

      // Upsert bookings
      if (roomBookings.length > 0) {
        const { error: bookingError } = await supabase.from('room_bookings').upsert(roomBookings);
        if (bookingError) throw bookingError;
        console.log(`Seeded ${roomBookings.length} room bookings.`);
      }
    }

    // 3. Seed Events & Registrations
    const eventsPath = path.resolve(__dirname, '../data/events.json');
    if (fs.existsSync(eventsPath)) {
      const eventsRaw = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
      
      const events = [];
      const eventRegistrations = [];

      for (const e of eventsRaw) {
        // Extract event data without registrations
        const { registrations, ...eventData } = e;
        events.push(eventData);

        // Extract registrations and attach event_id
        if (registrations && registrations.length > 0) {
          for (const reg of registrations) {
            eventRegistrations.push({
              ...reg,
              event_id: e.id
            });
          }
        }
      }

      // Upsert events
      const { error: eventError } = await supabase.from('events').upsert(events);
      if (eventError) throw eventError;
      console.log(`Seeded ${events.length} events.`);

      // Upsert registrations
      if (eventRegistrations.length > 0) {
        // Since we don't have explicit IDs for registrations in JSON, we rely on the DB to generate UUIDs
        // We shouldn't upsert by ID. We can just insert them. But to avoid duplicates on re-seed,
        // we might want to clear them or handle ON CONFLICT on (event_id, student_id)
        const { error: regError } = await supabase
          .from('event_registrations')
          .upsert(eventRegistrations, { onConflict: 'event_id, student_id' });
        
        if (regError) throw regError;
        console.log(`Seeded ${eventRegistrations.length} event registrations.`);
      }
    }

    // 4. Seed Announcements
    const announcementsPath = path.resolve(__dirname, '../data/announcements.json');
    if (fs.existsSync(announcementsPath)) {
      const announcements = JSON.parse(fs.readFileSync(announcementsPath, 'utf8'));
      const { error } = await supabase.from('announcements').upsert(announcements);
      if (error) throw error;
      console.log(`Seeded ${announcements.length} announcements.`);
    }

    // 5. Seed Assignments
    const assignmentsPath = path.resolve(__dirname, '../data/assignments.json');
    if (fs.existsSync(assignmentsPath)) {
      const assignments = JSON.parse(fs.readFileSync(assignmentsPath, 'utf8'));
      const { error } = await supabase.from('assignments').upsert(assignments);
      if (error) throw error;
      console.log(`Seeded ${assignments.length} assignments.`);
    }

    console.log('Seed process completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seedData();
