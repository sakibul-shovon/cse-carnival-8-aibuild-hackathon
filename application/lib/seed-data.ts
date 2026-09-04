import schedules from '../../data/schedules.json';
import rooms from '../../data/rooms.json';
import events from '../../data/events.json';
import announcements from '../../data/announcements.json';
import assignments from '../../data/assignments.json';
import type { CampusData } from './campus-types';

export const seedData = { schedules, rooms, events, announcements, assignments } as CampusData;
