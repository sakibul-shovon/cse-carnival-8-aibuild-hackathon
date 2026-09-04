import { Type } from '@google/genai'
import * as campus from './campusService.js'

const model = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

const text = (description) => ({ type: Type.STRING, description })
const functionDeclarations = [
  { name: 'get_schedules', description: 'Read current class schedules from CampusOS.', parameters: { type: Type.OBJECT, properties: { course: text('Optional course code or partial course code'), day: text('Optional day of week'), instructor: text('Optional instructor name'), room: text('Optional room number') } } },
  { name: 'get_assignments', description: 'Read current assignments from CampusOS.', parameters: { type: Type.OBJECT, properties: { course: text('Optional course code'), status: text('Optional status: pending, submitted, graded, or late'), upcoming: { type: Type.BOOLEAN, description: 'Only assignments due today or later' } } } },
  { name: 'get_events', description: 'Read current campus events from CampusOS.', parameters: { type: Type.OBJECT, properties: { date: text('Optional ISO date YYYY-MM-DD'), status: text('Optional event status') } } },
  { name: 'get_announcements', description: 'Read current announcements from CampusOS.', parameters: { type: Type.OBJECT, properties: { priority: text('Optional priority: high, medium, or low'), active: { type: Type.BOOLEAN, description: 'Only announcements that have not expired' } } } },
  { name: 'get_rooms', description: 'Read current rooms from CampusOS.', parameters: { type: Type.OBJECT, properties: { room_number: text('Optional room number'), type: text('Optional room type'), floor: { type: Type.INTEGER }, capacity: { type: Type.INTEGER, description: 'Minimum capacity' }, status: text('Optional room status') } } },
  { name: 'find_available_rooms', description: 'Find rooms available for a complete requested date and time, with capacity and equipment filters. Never invent missing date, time, or capacity.', parameters: { type: Type.OBJECT, required: ['date', 'start_time', 'end_time', 'capacity'], properties: { date: text('ISO date YYYY-MM-DD'), start_time: text('24-hour HH:MM'), end_time: text('24-hour HH:MM'), capacity: { type: Type.INTEGER, minimum: 1 }, equipment: { type: Type.ARRAY, items: text('Required equipment name') } } } },
  { name: 'book_room', description: 'Create a real room booking only after the user explicitly provides a room, date, start time, end time, booker, and purpose.', parameters: { type: Type.OBJECT, required: ['date', 'start_time', 'end_time', 'booked_by', 'purpose'], properties: { room_id: text('Room ID, if known'), room_number: text('Room number, if known'), date: text('ISO date YYYY-MM-DD'), start_time: text('24-hour HH:MM'), end_time: text('24-hour HH:MM'), booked_by: text('Person or organization explicitly named by user'), purpose: text('Booking purpose explicitly provided by user') } } },
  { name: 'cancel_room_booking', description: 'Delete one actual room booking by its exact booking ID.', parameters: { type: Type.OBJECT, required: ['booking_id'], properties: { booking_id: text('Exact booking ID') } } },
  { name: 'register_for_event', description: 'Register a named student for a real event only after event and student identity are explicit.', parameters: { type: Type.OBJECT, required: ['event_id', 'student_id', 'name'], properties: { event_id: text('Exact event ID'), student_id: text('Student ID'), name: text('Student name') } } },
  { name: 'cancel_event_registration', description: 'Cancel one actual event registration by exact event and student IDs.', parameters: { type: Type.OBJECT, required: ['event_id', 'student_id'], properties: { event_id: text('Exact event ID'), student_id: text('Student ID') } } },
]
const interactionTools = functionDeclarations.map((tool) => ({ type: 'function', ...tool }))

const executors = {
  get_schedules: campus.listSchedules,
  get_assignments: campus.listAssignments,
  get_events: campus.listEvents,
  get_announcements: campus.listAnnouncements,
  get_rooms: campus.listRooms,
  find_available_rooms: campus.findAvailableRooms,
  book_room: campus.bookRoom,
  cancel_room_booking: ({ booking_id }) => campus.cancelBooking(booking_id),
  register_for_event: ({ event_id, student_id, name }) => campus.registerEvent(event_id, { student_id, name }),
  cancel_event_registration: ({ event_id, student_id }) => campus.cancelEventRegistration(event_id, student_id),
}

const systemInstruction = `You are CampusOS Assistant for a university. Use the database tools for every campus data question; never rely on memory, seed data, or invented answers. You may call multiple tools. Never claim a write succeeded unless its tool returns success. Before any write, require every detail in the function description and ask a concise clarification question if information is missing. Never invent dates, times, capacity, identity, purpose, room, event, or IDs. For booking requests, use the availability tool when requirements are complete, then book only the exact room the user chose or explicitly accepts. Explain conflicts and database errors honestly. Return concise, useful answers.`

function getApiKey() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured')
  return process.env.GEMINI_API_KEY
}

function toolResult(value) { return { success: true, data: value ?? null } }
function toolError(error) { return { success: false, error: error instanceof Error ? error.message : 'Tool execution failed' } }

export async function runCampusAgent(message, _history = []) {
  const apiKey = getApiKey()
  let input = message
  let previousInteractionId
  console.log('[AI] User message received')
  console.log(`[AI] Model: ${model}`)
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const request = { model, input, tools: interactionTools, system_instruction: systemInstruction, generation_config: { temperature: 0 } }
    if (previousInteractionId) request.previous_interaction_id = previousInteractionId
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) })
    const response = await apiResponse.json()
    if (!apiResponse.ok) throw new Error(`Gemini API ${apiResponse.status}: ${response.error?.message ?? 'request failed'}`)
    console.log(`[AI] Interaction model: ${response.model ?? model}`)
    const calls = (response.steps ?? []).filter((step) => step.type === 'function_call')
    if (!calls.length) { console.log('[AI] Final response generated'); return response.output_text ?? response.steps?.flatMap((step) => step.content ?? []).find((part) => part.type === 'text')?.text ?? 'I could not generate a response.' }
    previousInteractionId = response.id
    console.log(`[AI] Function-call turn preserved: ${previousInteractionId}`)
    const functionResponses = []
    for (const call of calls) {
      const args = call.arguments ?? {}
      console.log(`[AI] Tool selected: ${call.name}`)
      console.log('[AI] Tool arguments:', JSON.stringify(args))
      const executor = executors[call.name]
      if (!executor) throw new Error(`Unsupported tool: ${call.name}`)
      try {
        const result = await executor(args)
        console.log('[AI] Tool result:', JSON.stringify(result).slice(0, 2000))
        functionResponses.push({ type: 'function_result', name: call.name, call_id: call.id, result: [{ type: 'text', text: JSON.stringify(toolResult(result)) }] })
      } catch (error) {
        console.error('[AI] Tool error:', error instanceof Error ? error.message : error)
        functionResponses.push({ type: 'function_result', name: call.name, call_id: call.id, result: [{ type: 'text', text: JSON.stringify(toolError(error)) }] })
      }
    }
    console.log('[AI] Function-response turn sent immediately after function-call turn')
    input = functionResponses
  }
  throw new Error('The agent reached its tool-call limit')
}
