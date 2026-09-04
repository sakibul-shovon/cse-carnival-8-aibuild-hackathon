import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { campusToolDefinitions, executeCampusTool } from '@/lib/agent-tools';

type Trace = { tool: string; label: string };

function dhakaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
}

function addDays(date: string, days: number) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
function prettyDate(date: string) { return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`)); }
function prettyTime(time: string) { const [hour, minute] = time.split(':').map(Number); return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`; }
function requestedDate(message: string, today: string) { const iso = message.match(/\b20\d{2}-\d{2}-\d{2}\b/)?.[0]; return iso || (message.toLowerCase().includes('tomorrow') ? addDays(today, 1) : today); }
function toTime(hourText: string, minuteText?: string, meridiem?: string) { let hour = Number(hourText); if (meridiem?.toLowerCase() === 'pm' && hour < 12) hour += 12; if (meridiem?.toLowerCase() === 'am' && hour === 12) hour = 0; return `${String(hour).padStart(2, '0')}:${minuteText || '00'}`; }
function parseRange(message: string) {
  const match = message.match(/(?:from|between)?\s*\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|and|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (!match) return null;
  let meridiemA = match[3]?.toLowerCase(); let meridiemB = match[6]?.toLowerCase();
  if (!meridiemA && meridiemB) meridiemA = meridiemB;
  if (!meridiemB && meridiemA) meridiemB = meridiemA;
  if (!meridiemA && !meridiemB && Number(match[1]) <= 6 && Number(match[4]) <= 6) meridiemA = meridiemB = 'pm';
  return { start_time: toTime(match[1], match[2], meridiemA), end_time: toTime(match[4], match[5], meridiemB) };
}

function textFromResponse(response: Record<string, unknown>) {
  if (typeof response.output_text === 'string') return response.output_text;
  const output = Array.isArray(response.output) ? response.output as Record<string, unknown>[] : [];
  return output.flatMap((item) => Array.isArray(item.content) ? item.content as Record<string, unknown>[] : []).map((part) => typeof part.text === 'string' ? part.text : '').filter(Boolean).join('\n');
}

async function runOpenAIAgent(message: string) {
  const now = dhakaNow(); const trace: Trace[] = [];
  const base = { model: env.OPENAI_MODEL || 'gpt-5.4-mini', instructions: `You are CampusOS, a precise university assistant for Sakibul Hassan (student ID 20-40532). Today in Asia/Dhaka is ${now.date}, current time ${now.time}. ALWAYS call one or more provided functions before answering; never rely on memory. Use current records only. For questions about a class location or time, read both schedules and announcements because recent notices override the schedule. Check room availability before booking. Do not invent missing booking details: ask for exact date, start time, end time, and room unless the user gave constraints specific enough to choose the smallest suitable available room. Only cancel this student's own bookings/registrations. Refuse bulk deletion, changing other students' registrations, or administrative/destructive requests. Keep answers concise and state completed actions clearly.`, tools: campusToolDefinitions, store: false };
  let response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, input: message }) }).then(async (res) => { if (!res.ok) throw new Error(`OpenAI request failed (${res.status})`); return res.json() as Promise<Record<string, unknown>>; });
  for (let step = 0; step < 5; step += 1) {
    const output = Array.isArray(response.output) ? response.output as Record<string, unknown>[] : [];
    const calls = output.filter((item) => item.type === 'function_call');
    if (!calls.length) return { message: textFromResponse(response) || 'I could not complete that request.', trace, mode: 'openai' };
    const toolOutputs = [];
    for (const call of calls) {
      const name = String(call.name); const args = JSON.parse(String(call.arguments || '{}')) as Record<string, unknown>;
      const result = await executeCampusTool(name, args); trace.push({ tool: name, label: name.replaceAll('_', ' ') });
      toolOutputs.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
    }
    response = await fetch('https://api.openai.com/v1/responses', { method: 'POST', headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ...base, previous_response_id: response.id, input: toolOutputs }) }).then(async (res) => { if (!res.ok) throw new Error(`OpenAI tool continuation failed (${res.status})`); return res.json() as Promise<Record<string, unknown>>; });
  }
  return { message: 'I stopped before taking any additional actions because the request required too many steps.', trace, mode: 'openai' };
}

async function runLocalAgent(message: string) {
  const lower = message.toLowerCase(); const now = dhakaNow(); const trace: Trace[] = [];
  const use = async (tool: string, args: Record<string, unknown>, label: string) => { trace.push({ tool, label }); return executeCampusTool(tool, args) as Promise<Record<string, unknown>>; };

  if (/(delete|remove)\s+(all|every)|change.*someone|book.*for another/i.test(lower)) return { message: 'I can’t make bulk destructive changes or act on another student’s behalf. You can manage individual campus records from the dashboard.', trace, mode: 'local' };

  if (lower.includes('register') && lower.includes('event') || lower.includes('register me')) {
    const eventName = message.replace(/register me (for|to)?/i, '').replace(/the\s+/i, '').trim();
    const result = await use('register_event', { event_name: eventName, student_id: '20-40532', student_name: 'Sakibul Hassan' }, 'Register for event');
    return { message: result.already_registered ? `You’re already registered for ${result.event}.` : result.ok ? `Done — you’re registered for ${result.event}.` : String(result.error), trace, mode: 'local', mutated: Boolean(result.ok && !result.already_registered) };
  }
  if (lower.includes('cancel') && lower.includes('registration')) {
    const eventName = message.replace(/cancel/i, '').replace(/my\s+registration\s+(for|to)?/i, '').trim();
    const result = await use('cancel_event_registration', { event_name: eventName, student_id: '20-40532' }, 'Cancel event registration');
    return { message: result.ok ? `Your registration for ${result.event} has been cancelled.` : String(result.error), trace, mode: 'local', mutated: Boolean(result.ok) };
  }

  if (lower.includes('book') || lower.includes('need a room')) {
    const range = parseRange(message); const date = requestedDate(message, now.date); const roomNumber = message.match(/\b\d[A-C]\d{2}\b/i)?.[0]?.toUpperCase();
    if (!range || (!roomNumber && !(/\b\d+\s*(people|person)/i.test(message) || /projector|lab|seminar|classroom/i.test(lower)))) return { message: 'Before I book anything, tell me the exact start and end time plus a room number — or give me capacity and equipment requirements so I can choose safely.', trace, mode: 'local' };
    if (roomNumber) {
      const result = await use('book_room', { room_number: roomNumber, date, ...range, booked_by: 'Sakibul Hassan', purpose: 'Student study session' }, 'Check availability & book room');
      return { message: result.ok ? `Booked Room ${roomNumber} for ${prettyDate(date)}, ${prettyTime(range.start_time)}–${prettyTime(range.end_time)}. Booking ID: ${(result.booking as Record<string, unknown>).booking_id}.` : String(result.error), trace, mode: 'local', mutated: Boolean(result.ok) };
    }
    const capacity = Number(message.match(/\b(\d+)\s*(?:people|person)/i)?.[1] || 1); const equipment = lower.includes('projector') ? ['projector'] : []; const type = lower.includes('lab') ? 'lab' : lower.includes('seminar') ? 'seminar' : lower.includes('classroom') ? 'classroom' : null;
    const found = await use('find_available_rooms', { date, ...range, min_capacity: capacity, equipment, type }, 'Find available rooms'); const rooms = found.rooms as Record<string, unknown>[];
    if (!rooms?.length) return { message: `I couldn’t find a suitable free room for ${prettyDate(date)}, ${prettyTime(range.start_time)}–${prettyTime(range.end_time)}.`, trace, mode: 'local' };
    const chosen = rooms[0]; const booked = await use('book_room', { room_number: chosen.room_number, date, ...range, booked_by: 'Sakibul Hassan', purpose: `Study session for ${capacity}` }, 'Book best matching room');
    return { message: booked.ok ? `I found and booked Room ${chosen.room_number} — capacity ${chosen.capacity}, with ${(chosen.equipment as string[]).join(', ')} — for ${prettyDate(date)}, ${prettyTime(range.start_time)}–${prettyTime(range.end_time)}.` : String(booked.error), trace, mode: 'local', mutated: Boolean(booked.ok) };
  }

  if (lower.includes('cancel') && lower.includes('room')) {
    const roomNumber = message.match(/\b\d[A-C]\d{2}\b/i)?.[0]?.toUpperCase(); if (!roomNumber) return { message: 'Which room booking should I cancel? Give me the room number or booking ID.', trace, mode: 'local' };
    const result = await use('cancel_room_booking', { room_number: roomNumber, booking_id: null, booked_by: 'Sakibul Hassan' }, 'Cancel room booking');
    return { message: result.ok ? `Cancelled your latest booking for Room ${roomNumber}.` : String(result.error), trace, mode: 'local', mutated: Boolean(result.ok) };
  }

  if (/where.*\b[A-Z]{3}\s?\d{4}|where.*class/i.test(message)) {
    const course = message.match(/\b[A-Z]{3}\s?\d{4}\b/i)?.[0]?.toUpperCase().replace(/([A-Z]{3})(\d)/, '$1 $2');
    const notices = await use('get_campus_data', { system: 'announcements' }, 'Check latest announcements'); const records = notices.records as Record<string, unknown>[];
    const relevant = records.filter((item) => !course || `${item.title} ${item.body}`.toUpperCase().includes(course)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    if (relevant.length) return { message: `Latest notice: ${relevant[0].title}. ${relevant[0].body}`, trace, mode: 'local' };
  }

  if (lower.includes('next class')) {
    const result = await use('get_campus_data', { system: 'schedules' }, 'Read live schedule'); const schedules = result.records as Record<string, unknown>[];
    const todayIndex = new Date(`${now.date}T12:00:00Z`).getUTCDay(); const dayMap: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4 };
    const next = schedules.map((item) => { let delta = (dayMap[String(item.day)] - todayIndex + 7) % 7; if (delta === 0 && String(item.start_time) <= now.time) delta = 7; return { item, delta }; }).sort((a, b) => a.delta - b.delta || String(a.item.start_time).localeCompare(String(b.item.start_time)))[0];
    return { message: next ? `Your next class is ${next.item.course} — ${next.item.title} — on ${next.item.day} at ${prettyTime(String(next.item.start_time))} in Room ${next.item.room}.` : 'I couldn’t find an upcoming class.', trace, mode: 'local' };
  }

  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].find((name) => lower.includes(name.toLowerCase()));
  if (day && lower.includes('class')) {
    const result = await use('get_campus_data', { system: 'schedules' }, `Read ${day} schedule`); const classes = (result.records as Record<string, unknown>[]).filter((item) => item.day === day).sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
    return { message: classes.length ? `On ${day}:\n${classes.map((item) => `• ${prettyTime(String(item.start_time))} — ${item.course}, ${item.title}, Room ${item.room}`).join('\n')}` : `You have no classes on ${day}.`, trace, mode: 'local' };
  }

  if (lower.includes('assignment') || lower.includes('due')) {
    const result = await use('get_campus_data', { system: 'assignments' }, 'Check assignment deadlines'); const end = addDays(now.date, 7);
    const due = (result.records as Record<string, unknown>[]).filter((item) => String(item.deadline) >= now.date && String(item.deadline) <= end && item.status !== 'graded').sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)));
    return { message: due.length ? `Due in the next 7 days:\n${due.map((item) => `• ${item.course}: ${item.title} — ${prettyDate(String(item.deadline))} (${item.status})`).join('\n')}` : 'Nothing is due in the next 7 days.', trace, mode: 'local' };
  }

  if (lower.includes('announcement') || lower.includes('notice')) {
    const result = await use('get_campus_data', { system: 'announcements' }, 'Read live announcements'); let records = result.records as Record<string, unknown>[];
    if (lower.includes('high')) records = records.filter((item) => item.priority === 'high');
    return { message: records.length ? records.map((item) => `• ${item.title} — ${item.body}`).join('\n') : 'No matching announcements.', trace, mode: 'local' };
  }

  if (lower.includes('lab') || lower.includes('projector') || lower.includes('fit at least')) {
    const result = await use('get_campus_data', { system: 'rooms' }, 'Filter campus rooms'); const capacity = Number(message.match(/(?:at least|fit)\s*(\d+)/i)?.[1] || 1);
    const rooms = (result.records as Record<string, unknown>[]).filter((room) => (!lower.includes('lab') || room.type === 'lab') && Number(room.capacity) >= capacity && (!lower.includes('projector') || (room.equipment as string[]).includes('projector')));
    return { message: rooms.length ? `Matching rooms: ${rooms.map((room) => `${room.room_number} (${room.capacity} seats)`).join(', ')}.` : 'No rooms match those requirements.', trace, mode: 'local' };
  }

  if (lower.includes('free until') || lower.includes('drop into')) {
    const result = await use('get_campus_data', { system: 'events' }, 'Check today’s events'); const cutoff = message.match(/until\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i); const end = cutoff ? toTime(cutoff[1], cutoff[2], cutoff[3] || (Number(cutoff[1]) < 7 ? 'pm' : 'am')) : '14:00';
    const events = (result.records as Record<string, unknown>[]).filter((event) => event.date === now.date && String(event.start_time) >= now.time && String(event.end_time) <= end && event.status !== 'cancelled');
    return { message: events.length ? `You can make: ${events.map((event) => `${event.name} at ${prettyTime(String(event.start_time))} in ${event.venue}`).join('; ')}.` : `There aren’t any drop-in events today before ${prettyTime(end)}.`, trace, mode: 'local' };
  }

  const summary = await use('get_campus_data', { system: 'announcements' }, 'Search current campus data'); const matches = (summary.records as Record<string, unknown>[]).filter((item) => `${item.title} ${item.body}`.toLowerCase().includes(lower));
  return { message: matches.length ? matches.map((item) => `${item.title}: ${item.body}`).join('\n') : 'I can help with schedules, deadlines, announcements, room availability and bookings, or event registration. Try “When is my next class?”', trace, mode: 'local' };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { message?: string }; const message = body.message?.trim();
    if (!message) return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    if (env.OPENAI_API_KEY) {
      try { return NextResponse.json(await runOpenAIAgent(message)); } catch { /* fall through to the safe local agent */ }
    }
    return NextResponse.json(await runLocalAgent(message));
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Agent request failed.' }, { status: 500 }); }
}
