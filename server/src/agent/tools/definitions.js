/**
 * CampusOS Agent Tool Definitions
 * JSON Schemas defining the exact parameters and types for all tools.
 * Compatible with OpenAI function calling and Gemini function declarations.
 */

export const tools = [
  {
    name: 'get_current_datetime',
    description: 'Get the current real-world campus date, time, and day of week from the university server. MUST be called whenever resolving relative time references like "today", "tomorrow", "this week", "next class", "now", or "upcoming".',
    parameters: {
      type: 'object',
      properties: {
        override: {
          type: 'string',
          description: 'Optional ISO timestamp override for testing'
        }
      }
    }
  },
  {
    name: 'get_schedule',
    description: 'Get class schedules from the live database. Supports filtering by day of week, course code, room number, or instructor name.',
    parameters: {
      type: 'object',
      properties: {
        day: {
          type: 'string',
          enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          description: 'Day of week (AUST university days are Sunday through Thursday)'
        },
        course: {
          type: 'string',
          description: 'Course code, e.g. "CSE 4113"'
        },
        room: {
          type: 'string',
          description: 'Room number, e.g. "7A03"'
        },
        instructor: {
          type: 'string',
          description: 'Instructor name'
        }
      }
    }
  },
  {
    name: 'get_assignments',
    description: 'Get university coursework assignments. Supports filtering by status, deadline, or course code.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['pending', 'submitted', 'graded', 'late'],
          description: 'Assignment status'
        },
        due_before: {
          type: 'string',
          description: 'ISO date "YYYY-MM-DD" to filter assignments due before or on this date'
        },
        course: {
          type: 'string',
          description: 'Course code, e.g. "CSE 4113"'
        }
      }
    }
  },
  {
    name: 'get_announcements',
    description: 'Get university campus announcements. Supports filtering by priority level and active status.',
    parameters: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
          description: 'Priority level of announcement'
        },
        active_only: {
          type: 'boolean',
          description: 'Set to true to exclude expired notices based on their expires date'
        }
      }
    }
  },
  {
    name: 'get_events',
    description: 'Get university events, workshops, and seminars from the live database. Supports filtering by status and date.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['upcoming', 'ongoing', 'completed', 'cancelled', 'full'],
          description: 'Event status'
        },
        after: {
          type: 'string',
          description: 'ISO date "YYYY-MM-DD" to filter events scheduled on or after this date'
        }
      }
    }
  },
  {
    name: 'search_rooms',
    description: 'Search university rooms with multiple filters including room type, minimum capacity, equipment, date, and time slot to verify availability.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['classroom', 'lab', 'seminar'],
          description: 'Room type'
        },
        min_capacity: {
          type: 'number',
          description: 'Minimum required capacity (number of people)'
        },
        equipment: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required equipment list, e.g. ["projector", "AC", "whiteboard"]'
        },
        date: {
          type: 'string',
          description: 'Date in "YYYY-MM-DD" format'
        },
        start_time: {
          type: 'string',
          description: 'Start time in "HH:MM" 24-hour format'
        },
        end_time: {
          type: 'string',
          description: 'End time in "HH:MM" 24-hour format'
        },
        status: {
          type: 'string',
          enum: ['available', 'unavailable'],
          description: 'Room availability status'
        }
      }
    }
  },
  {
    name: 'book_room',
    description: 'Book a specific room for a given date, time slot, and student/organizer. ONLY call this when all details (room number, date, start time, end time, booked_by) are explicitly known. NEVER call this if the user request is vague or underspecified.',
    parameters: {
      type: 'object',
      properties: {
        room_number: {
          type: 'string',
          description: 'The room number to book, e.g. "7A02"'
        },
        date: {
          type: 'string',
          description: 'Booking date in "YYYY-MM-DD" format'
        },
        start_time: {
          type: 'string',
          description: 'Start time in "HH:MM" 24-hour format'
        },
        end_time: {
          type: 'string',
          description: 'End time in "HH:MM" 24-hour format'
        },
        booked_by: {
          type: 'string',
          description: 'Name of person or student organization booking the room'
        },
        purpose: {
          type: 'string',
          description: 'Purpose or reason for booking the room'
        }
      },
      required: ['room_number', 'date', 'start_time', 'end_time', 'booked_by']
    }
  },
  {
    name: 'cancel_booking',
    description: 'Cancel an existing room booking.',
    parameters: {
      type: 'object',
      properties: {
        room_number: {
          type: 'string',
          description: 'Room number where the booking exists'
        },
        booking_id: {
          type: 'string',
          description: 'The booking ID to cancel, e.g. "bk-001"'
        }
      },
      required: ['room_number', 'booking_id']
    }
  },
  {
    name: 'register_for_event',
    description: 'Register a student for a campus event. ONLY call this when event name or ID is known and student identity is provided.',
    parameters: {
      type: 'object',
      properties: {
        event_name_or_id: {
          type: 'string',
          description: 'Event name or ID, e.g. "Guest Lecture on Deep Learning" or "evt-002"'
        },
        student_id: {
          type: 'string',
          description: 'Student ID, e.g. "20-40532"'
        },
        name: {
          type: 'string',
          description: 'Student full name'
        }
      },
      required: ['event_name_or_id', 'student_id', 'name']
    }
  },
  {
    name: 'cancel_registration',
    description: 'Cancel a student registration for a campus event.',
    parameters: {
      type: 'object',
      properties: {
        event_name_or_id: {
          type: 'string',
          description: 'Event name or ID'
        },
        student_id: {
          type: 'string',
          description: 'Student ID to cancel registration for'
        }
      },
      required: ['event_name_or_id', 'student_id']
    }
  }
];

/**
 * Format tools for OpenAI / Groq tool calling API
 */
export function getOpenAITools() {
  return tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));
}

/**
 * Format tools for Google Gemini function declarations
 */
export function getGeminiTools() {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }))
    }
  ];
}
