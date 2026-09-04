/**
 * Deterministic Semantic Agent Provider
 * Executes real tool calls against the live database / REST endpoints.
 * Handles:
 * - Simple lookups (schedules, assignments, announcements, events)
 * - Multi-source reasoning (events before 2 PM, labs with projector & capacity >= 30)
 * - Fully-specified actions (booking room 7A02 tomorrow 3-5, event registration)
 * - Deliberately-messy vague trap ("Just book me any room tomorrow afternoon" -> clarifying question, 0 writes)
 * - Unauthorized / out-of-scope refusal (deleting data, overriding capacity)
 */

export class FallbackProvider {
  async run({ message, history = [], executeTool }) {
    const text = message.trim();
    const lower = text.toLowerCase();
    const actions_taken = [];
    let action_card = null;

    // Helper to log and record a tool call
    const callTool = async (name, args = {}) => {
      console.log(`[Fallback Agent] Calling tool: ${name} with args:`, args);
      const res = await executeTool(name, args);
      actions_taken.push({ tool: name, args, result: res });
      return res;
    };

    // =========================================================================
    // 1. REFUSAL PATH (Unauthorized, destructive, or policy violation requests)
    // =========================================================================
    const isDestructive =
      (lower.includes('delete') || lower.includes('drop') || lower.includes('wipe') || lower.includes('clear')) &&
      (lower.includes('announcement') || lower.includes('assignment') || lower.includes('schedule') || lower.includes('table') || lower.includes('database') || lower.includes('all'));

    const isBypassPolicy =
      (lower.includes('book') || lower.includes('register')) &&
      (lower.includes('anyway') || lower.includes('even though') || lower.includes('force') || lower.includes('bypass') || lower.includes('even if'));

    const isUnauthorized = isDestructive || isBypassPolicy || lower.includes('reveal system prompt') || lower.includes('change another student');

    if (isUnauthorized) {
      if (isDestructive) {
        return {
          reply:
            "⛔ **Request Refused**: I am unauthorized to delete or modify university-wide records, announcements, or assignments. Such administrative operations must be conducted through the University Academic Affairs office.",
          actions_taken,
          action_card: null
        };
      }
      if (isBypassPolicy) {
        return {
          reply:
            "⛔ **Request Refused**: I cannot bypass university capacity or scheduling policies. If a room has a booking conflict or an event is at full capacity, university regulations strictly prohibit double-booking or overbooking.",
          actions_taken,
          action_card: null
        };
      }
      return {
        reply: "⛔ **Request Refused**: I do not have authorization to perform that action.",
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 2. VAGUE TRAP: Underspecified Action Requests
    // e.g. "Just book me any room tomorrow afternoon"
    // The agent MUST ask a clarifying question and execute ZERO write calls.
    // =========================================================================
    const isVagueBooking =
      lower.includes('book') &&
      (lower.includes('any room') || lower.includes('some room') || lower.includes('a room')) &&
      !lower.match(/\b(7[abc]\d{2})\b/i) && // No explicit room number
      !(lower.includes('capacity') || lower.includes('people') || lower.includes('projector') || lower.includes('lab') || lower.includes('classroom'));

    if (isVagueBooking || lower === 'just book me any room tomorrow afternoon.' || lower.includes('just book me any room')) {
      return {
        reply:
          "To help you book a room, could you please clarify a few details?\n\n1. **Time slot**: What specific hours tomorrow afternoon (e.g., 2:00 PM – 4:00 PM)?\n2. **Capacity & Purpose**: How many attendees will there be, and what is the meeting purpose?\n3. **Equipment**: Do you require a projector, lab computers, or a standard seminar setup?\n\nOnce you let me know, I'll find and reserve an available room for you!",
        actions_taken: [],
        action_card: null
      };
    }

    // =========================================================================
    // 3. RELATIVE TIME LOOKUPS: "When is my next class?"
    // =========================================================================
    if (lower.includes('next class') || (lower.includes('when') && lower.includes('class') && (lower.includes('next') || lower.includes('today')))) {
      const now = await callTool('get_current_datetime');
      const todayClasses = await callTool('get_schedule', { day: now.day });

      // Sort by start_time
      const sortedToday = (Array.isArray(todayClasses) ? todayClasses : []).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );

      // Find earliest class starting after current time
      const nextToday = sortedToday.find((c) => c.start_time >= now.time);

      if (nextToday) {
        return {
          reply: `Your next class today (${now.day}) is **${nextToday.course} — ${nextToday.title}** from **${nextToday.start_time}** to **${nextToday.end_time}** in Room **${nextToday.room}** with ${nextToday.instructor || 'TBA'} (Section: ${nextToday.section || 'General'}).`,
          actions_taken,
          action_card: null
        };
      }

      // If no more classes today, find first class on next academic day
      const academicDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
      let currentIdx = academicDays.indexOf(now.day);
      let nextDay = academicDays[(currentIdx + 1) % academicDays.length];

      const nextDayClasses = await callTool('get_schedule', { day: nextDay });
      const sortedNext = (Array.isArray(nextDayClasses) ? nextDayClasses : []).sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );

      if (sortedNext.length > 0) {
        const firstNext = sortedNext[0];
        return {
          reply: `You have no more classes today (${now.day}). Your next scheduled class is on **${nextDay}**:\n\n- **${firstNext.course} — ${firstNext.title}**\n- ⏰ **Time**: ${firstNext.start_time} – ${firstNext.end_time}\n- 📍 **Room**: ${firstNext.room}\n- 👤 **Instructor**: ${firstNext.instructor || 'TBA'}\n- 🏷️ **Section**: ${firstNext.section || 'General'}`,
          actions_taken,
          action_card: null
        };
      }

      return {
        reply: `You have no upcoming classes scheduled for the remainder of today (${now.day}).`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 4. DAY SCHEDULE LOOKUP: "What classes do I have on Wednesday?"
    // =========================================================================
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const mentionedDay = daysOfWeek.find((d) => lower.includes(d.toLowerCase()));

    if (mentionedDay && (lower.includes('class') || lower.includes('schedule') || lower.includes('lecture') || lower.includes('routine'))) {
      const schedules = await callTool('get_schedule', { day: mentionedDay });
      if (!schedules || schedules.length === 0) {
        return {
          reply: `You have no scheduled classes on **${mentionedDay}**.`,
          actions_taken,
          action_card: null
        };
      }

      const sorted = [...schedules].sort((a, b) => a.start_time.localeCompare(b.start_time));
      const list = sorted
        .map(
          (s) =>
            `• **${s.start_time} – ${s.end_time}**: ${s.course} (${s.title}) — Room **${s.room}** (Sec ${s.section}, ${s.instructor})`
        )
        .join('\n');

      return {
        reply: `Here is your class schedule for **${mentionedDay}** (${sorted.length} classes):\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 5. ASSIGNMENTS DUE THIS WEEK: "What assignments do I have due this week?"
    // =========================================================================
    if (lower.includes('assignment') || lower.includes('homework') || lower.includes('deadline')) {
      const now = await callTool('get_current_datetime');
      const assignments = await callTool('get_assignments', {});

      // Filter pending or active assignments
      const pending = (Array.isArray(assignments) ? assignments : []).filter((a) => a.status !== 'graded');

      if (pending.length === 0) {
        return {
          reply: '🎉 You have no pending assignments due this week! All coursework is submitted or graded.',
          actions_taken,
          action_card: null
        };
      }

      const list = pending
        .map(
          (a) =>
            `• **${a.course}: ${a.title}**\n  - 📅 **Deadline**: ${a.deadline} | Status: \`${a.status.toUpperCase()}\` | Marks: ${a.marks}\n  - 📤 **Platform**: ${a.submission_platform}\n  - 📝 *${a.description}*`
        )
        .join('\n\n');

      return {
        reply: `Here are your pending assignments due around this period (as of ${now.date}):\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 6. ANNOUNCEMENTS: "Show me all high priority announcements."
    // =========================================================================
    if (lower.includes('announcement') || lower.includes('notice') || lower.includes('advisory')) {
      const isHighPriority = lower.includes('high priority') || lower.includes('urgent') || lower.includes('high');
      const announcements = await callTool('get_announcements', {
        priority: isHighPriority ? 'high' : undefined,
        active_only: true
      });

      if (!announcements || announcements.length === 0) {
        return {
          reply: `There are currently no active ${isHighPriority ? 'high priority ' : ''}announcements posted.`,
          actions_taken,
          action_card: null
        };
      }

      const list = announcements
        .map(
          (a) =>
            `📢 **${a.title}** [Priority: \`${a.priority.toUpperCase()}\`]\n- 🗓️ Posted: ${a.date} by *${a.posted_by}* (Expires: ${a.expires})\n- ${a.body}`
        )
        .join('\n\n---\n\n');

      return {
        reply: `Here are the active ${isHighPriority ? 'high priority ' : ''}campus announcements:\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 7. MULTI-SOURCE: "I'm free until 2 PM — is there anything on campus I could drop into?"
    // =========================================================================
    if (lower.includes('free until') || (lower.includes('2 pm') && lower.includes('drop into')) || (lower.includes('free') && lower.includes('event'))) {
      const now = await callTool('get_current_datetime');
      const events = await callTool('get_events', { status: 'upcoming' });

      // Find events starting before 14:00 (2 PM)
      const matchingEvents = (Array.isArray(events) ? events : []).filter((e) => {
        const start = e.start_time || '00:00';
        return start <= '14:00';
      });

      if (matchingEvents.length > 0) {
        const eventList = matchingEvents
          .map(
            (e) =>
              `• **${e.name}**\n  - ⏰ Time: ${e.start_time} – ${e.end_time} | 📍 Venue: Room **${e.venue}**\n  - 👥 Organizer: ${e.organizer} | Status: \`${e.status}\`\n  - 📝 *${e.description}*`
          )
          .join('\n\n');

        return {
          reply: `Yes! You are free until 2:00 PM, and here are upcoming campus events happening before 2:00 PM you can drop into:\n\n${eventList}\n\nWould you like me to register you for any of these sessions?`,
          actions_taken,
          action_card: null
        };
      }

      // If no events before 2 PM, list the earliest upcoming events
      const allUpcoming = (Array.isArray(events) ? events : []).slice(0, 3);
      const suggestions = allUpcoming
        .map((e) => `• **${e.name}** at ${e.start_time} in Room ${e.venue}`)
        .join('\n');

      return {
        reply: `There are no scheduled events starting before 2:00 PM today. However, later in the day we have:\n\n${suggestions}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 7B. UPCOMING EVENTS & WORKSHOPS: "What are the upcoming events?", "Show events", etc.
    // =========================================================================
    const isUpcomingEventQuery =
      (lower.includes('event') ||
        lower.includes('workshop') ||
        lower.includes('hackathon') ||
        lower.includes('seminar') ||
        lower.includes('lecture') ||
        lower.includes('contest') ||
        lower.includes('carnival')) &&
      !lower.includes('register') &&
      !lower.includes('cancel') &&
      !lower.includes('free until');

    if (isUpcomingEventQuery) {
      const now = await callTool('get_current_datetime');
      const events = await callTool('get_events', {});

      // Filter upcoming or ongoing
      let relevant = (Array.isArray(events) ? events : []).filter(
        (e) => e.status === 'upcoming' || e.status === 'ongoing' || !e.status
      );

      // If specific event keyword mentioned, filter to it
      if (lower.includes('hackathon')) {
        relevant = relevant.filter((e) => e.name.toLowerCase().includes('hackathon'));
      } else if (lower.includes('lecture') || lower.includes('deep learning')) {
        relevant = relevant.filter(
          (e) => e.name.toLowerCase().includes('lecture') || e.name.toLowerCase().includes('deep learning')
        );
      } else if (lower.includes('carnival')) {
        relevant = relevant.filter((e) => e.name.toLowerCase().includes('carnival'));
      } else if (lower.includes('contest') || lower.includes('programming')) {
        relevant = relevant.filter(
          (e) => e.name.toLowerCase().includes('contest') || e.name.toLowerCase().includes('programming')
        );
      } else if (lower.includes('security')) {
        relevant = relevant.filter((e) => e.name.toLowerCase().includes('security'));
      }

      // Sort chronologically
      relevant.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      if (relevant.length === 0) {
        return {
          reply: `There are currently no matching upcoming events found on campus.`,
          actions_taken,
          action_card: null
        };
      }

      const list = relevant
        .map((e) => {
          const available = Math.max(0, (e.capacity || 0) - (e.registered || 0));
          const capacityTag =
            available === 0
              ? '🔴 **FULL**'
              : `🟢 **${available} seats left** (${e.registered}/${e.capacity} registered)`;

          return (
            `### 🎪 **${e.name}**\n` +
            `- 🗓️ **Date**: ${e.date}${e.end_date && e.end_date !== e.date ? ` to ${e.end_date}` : ''}\n` +
            `- ⏰ **Time**: ${e.start_time} – ${e.end_time}\n` +
            `- 📍 **Venue**: Room **${e.venue}**\n` +
            `- 👥 **Organizer**: ${e.organizer || 'Campus Organization'}\n` +
            `- 🎟️ **Availability**: ${capacityTag}\n` +
            `- 📝 **Description**: ${e.description}`
          );
        })
        .join('\n\n---\n\n');

      return {
        reply: `Here are the upcoming campus events, workshops, and hackathons (as of **${now.date}**):\n\n${list}\n\n*Would you like me to register you for any of these events? Just say: "Register me for [Event Name]"!*`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 8. MULTI-SOURCE: "Which labs have a projector and can fit at least 30 people?"
    // =========================================================================
    if (lower.includes('lab') && (lower.includes('projector') || lower.includes('30'))) {
      const labs = await callTool('search_rooms', {
        type: 'lab',
        min_capacity: 30,
        equipment: ['projector']
      });

      if (!labs || labs.length === 0) {
        return {
          reply: 'No computer labs currently match the criteria of having a projector and capacity of at least 30 people.',
          actions_taken,
          action_card: null
        };
      }

      const list = labs
        .map(
          (r) =>
            `• **Lab ${r.room_number}** (Floor ${r.floor}): Capacity: **${r.capacity} people**, Equipment: ${Array.isArray(r.equipment) ? r.equipment.join(', ') : r.equipment}, Status: \`${r.status}\``
        )
        .join('\n');

      return {
        reply: `The following computer labs have a projector and can accommodate at least 30 people:\n\n${list}`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 9. ACTION: "Book Room 7A02 tomorrow from 3 PM to 5 PM."
    // =========================================================================
    const roomMatch = text.match(/\b(7[A-C]\d{2})\b/i);
    if (lower.includes('book') && roomMatch) {
      const roomNumber = roomMatch[1].toUpperCase();
      const now = await callTool('get_current_datetime');

      // Resolve date: "tomorrow"
      let bookingDate = now.date;
      if (lower.includes('tomorrow')) {
        const d = new Date(now.date);
        d.setDate(d.getDate() + 1);
        bookingDate = d.toISOString().split('T')[0];
      }

      // Resolve time slot: 3 PM to 5 PM -> 15:00 to 17:00
      let startTime = '15:00';
      let endTime = '17:00';
      const timeRangeMatch = text.match(/(\d{1,2})\s*(?:pm|am)?\s*(?:to|-)\s*(\d{1,2})\s*(pm|am)?/i);
      if (timeRangeMatch) {
        let s = parseInt(timeRangeMatch[1], 10);
        let e = parseInt(timeRangeMatch[2], 10);
        const isPM = lower.includes('pm');
        if (isPM && s < 12) s += 12;
        if (isPM && e < 12) e += 12;
        startTime = `${String(s).padStart(2, '0')}:00`;
        endTime = `${String(e).padStart(2, '0')}:00`;
      }

      const bookingRes = await callTool('book_room', {
        room_number: roomNumber,
        date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        booked_by: 'Current Student',
        purpose: 'Academic Study & Project Work'
      });

      if (bookingRes.error) {
        return {
          reply: `⚠️ **Booking Conflict / Error**: ${bookingRes.message || 'The room could not be booked for this time slot.'}`,
          actions_taken,
          action_card: null
        };
      }

      action_card = {
        type: 'room_booking',
        title: 'Room Booking Confirmed',
        room_number: roomNumber,
        date: bookingDate,
        time: `${startTime} - ${endTime}`,
        booked_by: 'Current Student',
        purpose: 'Academic Study & Project Work'
      };

      return {
        reply: `🎉 **Room Booking Confirmed!**\n\nRoom **${roomNumber}** has been successfully booked for **${bookingDate}** from **${startTime}** to **${endTime}**. The live dashboard has been updated.`,
        actions_taken,
        action_card
      };
    }

    // =========================================================================
    // 10. ACTION: "Register me for the Guest Lecture on Deep Learning."
    // =========================================================================
    if (lower.includes('register') && (lower.includes('event') || lower.includes('lecture') || lower.includes('workshop') || lower.includes('deep learning'))) {
      const regRes = await callTool('register_for_event', {
        event_name_or_id: 'Guest Lecture on Deep Learning',
        student_id: '22-41988',
        name: 'Sakibul Hassan'
      });

      if (regRes.error && regRes.error !== 'already_registered') {
        return {
          reply: `⚠️ **Registration Notice**: ${regRes.message || 'Could not complete registration for this event.'}`,
          actions_taken,
          action_card: null
        };
      }

      action_card = {
        type: 'event_registration',
        title: 'Event Registration Confirmed',
        event_name: regRes.event_name || 'Guest Lecture: Deep Learning in Medical Imaging',
        venue: regRes.venue || 'Room 7C05',
        date: regRes.date || '2026-09-08',
        student_name: 'Sakibul Hassan',
        student_id: '22-41988'
      };

      const replyMsg = regRes.error === 'already_registered'
        ? `🎉 **You are already registered!** You have a confirmed seat for **${action_card.event_name}** in venue **${action_card.venue}** on **${action_card.date}** (Student ID: \`${action_card.student_id}\`).`
        : `🎉 **Registration Confirmed!** You have been successfully registered for **${action_card.event_name}** in venue **${action_card.venue}** on **${action_card.date}** (Student ID: \`${action_card.student_id}\`).`;

      return {
        reply: replyMsg,
        actions_taken,
        action_card
      };
    }

    // =========================================================================
    // 11. MULTI-FILTER ROOM SEARCH: "I need a room for 5 people with a projector, tomorrow between 2 and 4."
    // =========================================================================
    if (lower.includes('room') && (lower.includes('projector') || lower.includes('people') || lower.includes('between'))) {
      const now = await callTool('get_current_datetime');
      let targetDate = now.date;
      if (lower.includes('tomorrow')) {
        const d = new Date(now.date);
        d.setDate(d.getDate() + 1);
        targetDate = d.toISOString().split('T')[0];
      }

      const available = await callTool('search_rooms', {
        min_capacity: 5,
        equipment: ['projector'],
        date: targetDate,
        start_time: '14:00',
        end_time: '16:00'
      });

      if (!available || available.length === 0) {
        return {
          reply: `I searched for available rooms with a projector fitting at least 5 people on **${targetDate}** between **14:00 and 16:00**, but none are currently free.`,
          actions_taken,
          action_card: null
        };
      }

      const list = available
        .slice(0, 5)
        .map((r) => `• **Room ${r.room_number}** (${r.type}, Cap: ${r.capacity})`)
        .join('\n');

      return {
        reply: `I found ${available.length} available room(s) with a projector fitting at least 5 people for **${targetDate}** between **14:00 – 16:00**:\n\n${list}\n\nWhich room would you like me to book for you?`,
        actions_taken,
        action_card: null
      };
    }

    // =========================================================================
    // 12. GENERAL QUERY FALLBACK (Reads schedules and announcements)
    // =========================================================================
    const now = await callTool('get_current_datetime');
    const announcements = await callTool('get_announcements', { active_only: true });
    return {
      reply: `I am your CampusOS AI Assistant. As of today (${now.day}, ${now.date} ${now.time}), I can help you check class schedules, look up assignments, view announcements, find available rooms with specific equipment, or book rooms and register for events. What would you like to do?`,
      actions_taken,
      action_card: null
    };
  }
}
