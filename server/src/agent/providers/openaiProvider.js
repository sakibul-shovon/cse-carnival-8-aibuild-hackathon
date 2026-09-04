import OpenAI from 'openai';
import { getOpenAITools } from '../tools/definitions.js';

export class OpenAIProvider {
  constructor({ apiKey, baseURL, model }) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseURL || (process.env.OPENAI_BASE_URL || undefined)
    });
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  async run({ message, history = [], executeTool, systemPrompt }) {
    const formattedTools = getOpenAITools();

    // Construct message history
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of history.slice(-8)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content || ''
        });
      }
    }
    messages.push({ role: 'user', content: message });

    const actions_taken = [];
    let action_card = null;
    let iterations = 0;
    const maxIterations = 6;

    while (iterations < maxIterations) {
      iterations++;
      const res = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: formattedTools,
        tool_choice: 'auto'
      });

      const choice = res.choices[0];
      const assistantMsg = choice.message;
      messages.push(assistantMsg);

      // If no tool calls, return final response
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
        return {
          reply: assistantMsg.content || 'I have completed your request.',
          actions_taken,
          action_card
        };
      }

      // Execute all tool calls
      for (const call of assistantMsg.tool_calls) {
        const toolName = call.function.name;
        let args = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch (e) {
          args = {};
        }

        console.log(`[OpenAI/Groq Agent] Calling tool: ${toolName} with args:`, args);
        const toolResult = await executeTool(toolName, args);

        actions_taken.push({
          tool: toolName,
          args,
          result: toolResult
        });

        // Capture action cards if action tool succeeded
        if (toolName === 'book_room' && toolResult && !toolResult.error) {
          action_card = {
            type: 'room_booking',
            title: 'Room Booking Confirmed',
            room_number: toolResult.room_number || args.room_number,
            date: args.date,
            time: `${args.start_time} - ${args.end_time}`,
            booked_by: args.booked_by,
            purpose: args.purpose
          };
        } else if (toolName === 'register_for_event' && toolResult && !toolResult.error) {
          action_card = {
            type: 'event_registration',
            title: 'Event Registration Confirmed',
            event_name: toolResult.event_name || args.event_name_or_id,
            venue: toolResult.venue || 'Auditorium',
            date: toolResult.date || 'Scheduled Date',
            student_name: args.name,
            student_id: args.student_id
          };
        }

        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult)
        });
      }
    }

    return {
      reply: 'Processed maximum tool iterations.',
      actions_taken,
      action_card
    };
  }
}
