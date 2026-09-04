const express = require('express');
const router = express.Router();
const db = require('../db');
const Groq = require('groq-sdk');
require('dotenv').config();

if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY is not set in your .env file');
  process.exit(1);
}
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ----- TOOL DEFINITIONS -----
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_schedule',
      description: 'Get the current class schedule (all courses)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_assignments',
      description: 'Get all assignments (for students, includes submission status)',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_announcements',
      description: 'Get all announcements, optionally filter expired',
      parameters: {
        type: 'object',
        properties: {
          include_expired: { type: 'boolean', description: 'Whether to include expired announcements' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_rooms',
      description: 'Get all rooms with their availability and equipment',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_events',
      description: 'Get all events with registration details',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'book_room',
      description: 'Book a room for a specific date and time',
      parameters: {
        type: 'object',
        properties: {
          room_id: { type: 'string', description: 'Room ID (e.g., room-001)' },
          date: { type: 'string', description: 'Date YYYY-MM-DD' },
          start_time: { type: 'string', description: '24h HH:MM' },
          end_time: { type: 'string', description: '24h HH:MM' },
          purpose: { type: 'string', description: 'Purpose of booking' }
        },
        required: ['room_id', 'date', 'start_time', 'end_time']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'register_event',
      description: 'Register a student for an event',
      parameters: {
        type: 'object',
        properties: {
          event_id: { type: 'string', description: 'Event ID' },
          student_id: { type: 'string', description: 'Student ID' },
          student_name: { type: 'string', description: 'Student full name' }
        },
        required: ['event_id', 'student_id', 'student_name']
      }
    }
  }
];

// ----- TOOL HANDLERS -----
async function handleToolCall(toolCall, userId) {
  const { name, arguments: args } = toolCall.function;
  const parsed = JSON.parse(args);
  const user = getUser(userId);
  const role = user ? user.role : 'student';

  switch (name) {
    case 'get_schedule':
      return db.prepare('SELECT * FROM schedule').all();

    case 'get_assignments': {
      const assignments = db.prepare('SELECT * FROM assignments').all();
      if (role === 'student') {
        return assignments.map(a => {
          const sub = db.prepare(
            'SELECT status FROM submissions WHERE assignment_id=? AND student_id=?'
          ).get(a.id, userId);
          return { ...a, my_submission_status: sub ? sub.status : 'not_submitted' };
        });
      }
      return assignments;
    }

    case 'get_announcements': {
      const includeExpired = parsed.include_expired || false;
      const rows = db.prepare('SELECT * FROM announcements').all();
      const today = new Date().toISOString().slice(0,10);
      return rows.filter(a => includeExpired || !a.expires || a.expires >= today);
    }

    case 'get_rooms': {
      const rooms = db.prepare('SELECT * FROM rooms').all();
      return rooms.map(r => ({
        ...r,
        equipment: JSON.parse(r.equipment || '[]'),
        bookings: JSON.parse(r.bookings || '[]')
      }));
    }

    case 'get_events': {
      const events = db.prepare('SELECT * FROM events').all();
      return events.map(e => ({
        ...e,
        registrations: JSON.parse(e.registrations || '[]')
      }));
    }

    case 'book_room': {
      const { room_id, date, start_time, end_time, purpose } = parsed;
      if (!user) throw new Error('User not found');
      const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(room_id);
      if (!room) throw new Error('Room not found');
      const bookings = room.bookings ? JSON.parse(room.bookings) : [];
      const conflict = bookings.some(b =>
        b.date === date &&
        ((start_time >= b.start_time && start_time < b.end_time) ||
         (end_time > b.start_time && end_time <= b.end_time) ||
         (start_time <= b.start_time && end_time >= b.end_time))
      );
      if (conflict) throw new Error('Room already booked at that time');
      const newBooking = {
        booking_id: 'bk-' + Date.now(),
        booked_by: user.name,
        date,
        start_time,
        end_time,
        purpose: purpose || ''
      };
      bookings.push(newBooking);
      db.prepare('UPDATE rooms SET bookings=? WHERE id=?').run(JSON.stringify(bookings), room_id);
      return { message: 'Room booked successfully', booking: newBooking };
    }

    case 'register_event': {
      const { event_id, student_id, student_name } = parsed;
      const event = db.prepare('SELECT * FROM events WHERE id=?').get(event_id);
      if (!event) throw new Error('Event not found');
      const registrations = event.registrations ? JSON.parse(event.registrations) : [];
      if (registrations.some(r => r.student_id === student_id)) {
        throw new Error('Already registered');
      }
      if (registrations.length >= event.capacity) {
        throw new Error('Event is full');
      }
      registrations.push({ student_id, name: student_name });
      const newCount = registrations.length;
      db.prepare('UPDATE events SET registrations=?, registered=? WHERE id=?')
        .run(JSON.stringify(registrations), newCount, event_id);
      return { message: 'Registration successful' };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ----- AGENT CHAT ENDPOINT -----
router.post('/chat', async (req, res) => {
  const { message, history = [], userId } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const user = getUser(userId);
  if (!user) return res.status(401).json({ error: 'Invalid user' });

  const now = new Date();
  const dateStr = now.toISOString().slice(0,10);
  const timeStr = now.toTimeString().slice(0,5);

  const systemPrompt = `You are CampusOS AI assistant for the user ${user.name} (role: ${user.role}, ID: ${userId}). 
You have access to campus data via tools. 
When the user asks about schedule, assignments, announcements, rooms, or events, you MUST use the appropriate tool to fetch the current data. 
After you receive tool results, provide a direct answer based on that data. Do NOT ask for information that the tools can provide. 
If the request is vague (e.g., booking without time/room), ask clarifying questions. 
If a user asks to do something they are not authorized to do, politely refuse. 
Today's date is ${dateStr} and current time is ${timeStr}.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []),
    { role: 'user', content: message }
  ];

  try {
    // Step 1: Get initial response with tool calls
    let response = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const assistantMessage = response.choices[0].message;

    // Step 2: If no tool calls, just return the reply
    if (!assistantMessage.tool_calls) {
      return res.json({ reply: assistantMessage.content, messages: messages.concat([assistantMessage]) });
    }

    // Step 3: Process tool calls and collect results
    const toolResults = [];
    for (const toolCall of assistantMessage.tool_calls) {
      try {
        const result = await handleToolCall(toolCall, userId);
        toolResults.push({
          tool_call_id: toolCall.id,
          result
        });
      } catch (error) {
        toolResults.push({
          tool_call_id: toolCall.id,
          error: error.message
        });
      }
    }

    // Step 4: Prepare final messages – we do NOT include the assistant's tool-call message
    // Instead, we add a new user message with the tool results and ask for the final answer.
    const finalMessages = [
      { role: 'system', content: systemPrompt },
      ...(history || []),
      { role: 'user', content: message },
      { 
        role: 'user', 
        content: `The tool calls returned the following data:\n${JSON.stringify(toolResults, null, 2)}\n\nNow provide the final answer to the user's question.` 
      }
    ];

    // Step 5: Call the model again without tools
    const secondResponse = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      messages: finalMessages,
      // no tools or tool_choice – forces a text response
    });

    const finalReply = secondResponse.choices[0].message.content;

    // Return the reply and the full conversation (for debugging)
    const fullMessages = messages.concat([
      assistantMessage,
      ...toolResults.map(t => ({
        role: 'tool',
        tool_call_id: t.tool_call_id,
        content: JSON.stringify(t.result || { error: t.error })
      })),
      { role: 'assistant', content: finalReply }
    ]);

    res.json({ reply: finalReply, messages: fullMessages });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;