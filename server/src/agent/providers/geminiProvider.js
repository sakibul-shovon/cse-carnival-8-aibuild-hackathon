import { GoogleGenerativeAI } from '@google/generative-ai';
import { tools } from '../tools/definitions.js';

export class GeminiProvider {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  async run({ message, history = [], executeTool, systemPrompt }) {
    // Map tool definitions to Gemini function declarations
    const functionDeclarations = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemPrompt,
      tools: [{ functionDeclarations }]
    });

    // Format chat history for Gemini
    const geminiHistory = [];
    for (const msg of history.slice(-8)) {
      const role = msg.role === 'assistant' ? 'model' : 'user';
      if (typeof msg.content === 'string' && msg.content.trim()) {
        geminiHistory.push({
          role,
          parts: [{ text: msg.content }]
        });
      }
    }

    const chat = model.startChat({ history: geminiHistory });
    let result = await chat.sendMessage(message);
    let response = await result.response;

    const actions_taken = [];
    let action_card = null;
    let iterations = 0;
    const maxIterations = 6;

    // Tool calling loop
    while (response.functionCalls() && response.functionCalls().length > 0 && iterations < maxIterations) {
      iterations++;
      const calls = response.functionCalls();
      const functionResponses = [];

      for (const call of calls) {
        console.log(`[Gemini Agent] Calling tool: ${call.name} with args:`, call.args);
        const toolResult = await executeTool(call.name, call.args);

        actions_taken.push({
          tool: call.name,
          args: call.args,
          result: toolResult
        });

        // Capture action cards if action tool succeeded
        if (call.name === 'book_room' && toolResult && !toolResult.error) {
          action_card = {
            type: 'room_booking',
            title: 'Room Booking Confirmed',
            room_number: toolResult.room_number || call.args.room_number,
            date: call.args.date,
            time: `${call.args.start_time} - ${call.args.end_time}`,
            booked_by: call.args.booked_by,
            purpose: call.args.purpose
          };
        } else if (call.name === 'register_for_event' && toolResult && !toolResult.error) {
          action_card = {
            type: 'event_registration',
            title: 'Event Registration Confirmed',
            event_name: toolResult.event_name || call.args.event_name_or_id,
            venue: toolResult.venue || 'Campus Auditorium',
            date: toolResult.date || 'Scheduled Date',
            student_name: call.args.name,
            student_id: call.args.student_id
          };
        }

        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { output: toolResult }
          }
        });
      }

      result = await chat.sendMessage(functionResponses);
      response = await result.response;
    }

    const reply = response.text() || 'I have completed processing your request.';
    return { reply, actions_taken, action_card };
  }
}
