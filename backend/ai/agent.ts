import OpenAI from "openai";
import { environment } from "../config/environment.js";
import { AppError } from "../utils/AppError.js";
import { chatMemoryService } from "./chatMemory.service.js";
import { CAMPUS_ASSISTANT_PROMPT } from "./prompts.js";
import { campusTools, executeCampusTool } from "./tools.js";

const MAX_TOOL_ROUNDS = 5;

export interface AgentReply {
  message: string;
  toolsUsed: string[];
  sessionId: string;
}

export async function runCampusAgent(message: string, sessionId: string, currentUserId: string): Promise<AgentReply> {
  if (!environment.OPENAI_API_KEY) {
    throw new AppError("The AI assistant is not configured. Add OPENAI_API_KEY to .env.", 503, "AI_NOT_CONFIGURED");
  }

  const client = new OpenAI({ apiKey: environment.OPENAI_API_KEY });

  // 1. session_id is already received as a parameter.
  // 2. Load previous messages for this session from MySQL.
  const history = await chatMemoryService.getConversationHistory(sessionId, currentUserId);
  // 3. Add the new user message — persisted immediately and included in this call's input.
  await chatMemoryService.saveMessage(sessionId, currentUserId, "user", message);

  const input: Array<Record<string, unknown>> = [
    ...history.map((entry) => ({ role: entry.role, content: entry.content })),
    { role: "user", content: message }
  ];
  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await client.responses.create({
      model: environment.OPENAI_MODEL,
      instructions: CAMPUS_ASSISTANT_PROMPT,
      tools: campusTools as never,
      input: input as never,
      store: false,
      parallel_tool_calls: true
    });

    input.push(...(response.output as unknown as Array<Record<string, unknown>>));
    const toolCalls = response.output.filter((item) => item.type === "function_call");

    if (toolCalls.length === 0) {
      const assistantMessage = response.output_text.trim() || "I could not produce a response. Please try again.";
      // 5. Save the assistant's final response once tool execution is complete.
      await chatMemoryService.saveMessage(sessionId, currentUserId, "assistant", assistantMessage);
      return { message: assistantMessage, toolsUsed: [...new Set(toolsUsed)], sessionId };
    }

    // 4. Execute tools — unchanged from the existing AI -> Tools -> Services -> Database chain.
    for (const toolCall of toolCalls) {
      toolsUsed.push(toolCall.name);
      let output: unknown;
      try {
        output = await executeCampusTool(toolCall.name, JSON.parse(toolCall.arguments), currentUserId);
      } catch (error) {
        output = {
          error: error instanceof Error ? error.message : "Tool execution failed",
          code: error instanceof AppError ? error.code : "TOOL_EXECUTION_ERROR"
        };
      }
      input.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(output)
      });
    }
  }

  throw new AppError("The AI assistant exceeded its tool-call limit", 502, "AI_TOOL_LIMIT");
}
