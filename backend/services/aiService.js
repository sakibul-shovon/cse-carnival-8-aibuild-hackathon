import Groq from 'groq-sdk'
import * as campus from './campusService.js'

const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile'
let client

const stringProperty = (description) => ({ type: 'string', description })
const tools = [
  { type: 'function', function: { name: 'get_schedules', description: 'Read current class schedules from CampusOS.', parameters: { type: 'object', properties: { course: stringProperty('Optional course code or partial course code'), day: stringProperty('Optional day of week'), instructor: stringProperty('Optional instructor name'), room: stringProperty('Optional room number') }, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_assignments', description: 'Read current assignments from CampusOS.', parameters: { type: 'object', properties: { course: stringProperty('Optional course code'), status: stringProperty('Optional status'), upcoming: { type: 'boolean', description: 'Only assignments due today or later' } }, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_events', description: 'Read current campus events from CampusOS.', parameters: { type: 'object', properties: { date: stringProperty('Optional ISO date'), status: stringProperty('Optional status') }, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_announcements', description: 'Read current announcements from CampusOS.', parameters: { type: 'object', properties: { priority: stringProperty('Optional priority'), active: { type: 'boolean', description: 'Only active announcements' } }, additionalProperties: false } } },
  { type: 'function', function: { name: 'get_rooms', description: 'Read current rooms from CampusOS.', parameters: { type: 'object', properties: { room_number: stringProperty('Optional room number'), type: stringProperty('Optional room type'), floor: { type: 'integer' }, capacity: { type: 'integer' }, status: stringProperty('Optional status') }, additionalProperties: false } } },
  { type: 'function', function: { name: 'find_available_rooms', description: 'Find rooms available for a complete requested date/time/capacity/equipment request. Never invent missing date, time, or capacity.', parameters: { type: 'object', required: ['date', 'start_time', 'end_time', 'capacity'], properties: { date: stringProperty('ISO date YYYY-MM-DD'), start_time: stringProperty('24-hour HH:MM'), end_time: stringProperty('24-hour HH:MM'), capacity: { type: 'integer', minimum: 1 }, equipment: { type: 'array', items: { type: 'string' } } }, additionalProperties: false } } },
  { type: 'function', function: { name: 'book_room', description: 'Create a real booking only after room, date, times, booker, and purpose are explicit.', parameters: { type: 'object', required: ['date', 'start_time', 'end_time', 'booked_by', 'purpose'], properties: { room_id: stringProperty('Room ID if known'), room_number: stringProperty('Room number if known'), date: stringProperty('ISO date'), start_time: stringProperty('24-hour HH:MM'), end_time: stringProperty('24-hour HH:MM'), booked_by: stringProperty('Explicit booker'), purpose: stringProperty('Explicit purpose') }, additionalProperties: false } } },
  { type: 'function', function: { name: 'cancel_room_booking', description: 'Delete a real room booking by exact booking ID.', parameters: { type: 'object', required: ['booking_id'], properties: { booking_id: stringProperty('Exact booking ID') }, additionalProperties: false } } },
  { type: 'function', function: { name: 'register_for_event', description: 'Register a named student for a real event.', parameters: { type: 'object', required: ['event_id', 'student_id', 'name'], properties: { event_id: stringProperty('Event ID'), student_id: stringProperty('Student ID'), name: stringProperty('Student name') }, additionalProperties: false } } },
  { type: 'function', function: { name: 'cancel_event_registration', description: 'Cancel a real event registration by exact IDs.', parameters: { type: 'object', required: ['event_id', 'student_id'], properties: { event_id: stringProperty('Event ID'), student_id: stringProperty('Student ID') }, additionalProperties: false } } },
]

const executors = {
  get_schedules: campus.listSchedules, get_assignments: campus.listAssignments, get_events: campus.listEvents, get_announcements: campus.listAnnouncements, get_rooms: campus.listRooms,
  find_available_rooms: campus.findAvailableRooms, book_room: campus.bookRoom,
  cancel_room_booking: ({ booking_id }) => campus.cancelBooking(booking_id),
  register_for_event: ({ event_id, student_id, name }) => campus.registerEvent(event_id, { student_id, name }),
  cancel_event_registration: ({ event_id, student_id }) => campus.cancelEventRegistration(event_id, student_id),
}

const systemPrompt = `You are CampusOS Assistant. Use database tools for every campus-data answer; never invent or rely on memory. For writes, require all details in the tool schema and ask clarification instead of guessing. Never claim success unless the tool succeeds. Keep answers concise.`

function getClient() { if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured'); client ??= new Groq({ apiKey: process.env.GROQ_API_KEY }); return client }

export async function runCampusAgent(message, history = []) {
  const ai = getClient()
  const messages = [{ role: 'system', content: systemPrompt }, ...history.slice(-10), { role: 'user', content: message }]
  console.log('[AI] User message received')
  console.log(`[AI] Provider: Groq | Model: ${model}`)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const completion = await ai.chat.completions.create({ model, messages, tools, tool_choice: 'auto', temperature: 0 })
    const response = completion.choices[0].message
    messages.push(response)
    if (!response.tool_calls?.length) { console.log('[AI] Final response generated'); return response.content ?? 'I could not generate a response.' }
    for (const call of response.tool_calls) {
      const args = JSON.parse(call.function.arguments || '{}')
      console.log(`[AI] Tool selected: ${call.function.name}`)
      console.log('[AI] Tool arguments:', JSON.stringify(args))
      const executor = executors[call.function.name]
      if (!executor) throw new Error(`Unsupported tool: ${call.function.name}`)
      try {
        const result = await executor(args)
        console.log('[AI] Tool result:', JSON.stringify(result).slice(0, 2000))
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ success: true, data: result ?? null }) })
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Tool execution failed'
        console.error('[AI] Tool error:', reason)
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ success: false, error: reason }) })
      }
    }
  }
  throw new Error('The agent reached its tool-call limit')
}
