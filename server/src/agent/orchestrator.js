import { executeTool } from './tools/executor.js';
import { SYSTEM_PROMPT } from './prompts/systemPrompt.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';
import { FallbackProvider } from './providers/fallbackProvider.js';

export class AgentOrchestrator {
  constructor() {
    this.fallback = new FallbackProvider();
  }

  getProvider() {
    if (process.env.GEMINI_API_KEY) {
      console.log('🤖 Agent using Google Gemini Provider');
      return new GeminiProvider(process.env.GEMINI_API_KEY);
    }
    if (process.env.GROQ_API_KEY) {
      console.log('🤖 Agent using Groq Provider (Llama-3.3-70B)');
      return new OpenAIProvider({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: 'https://api.groq.com/openai/v1',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
      });
    }
    if (process.env.OPENAI_API_KEY) {
      console.log('🤖 Agent using OpenAI Provider');
      return new OpenAIProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
      });
    }

    console.log('🤖 Agent using Zero-Config Deterministic Tool Provider');
    return this.fallback;
  }

  async runAgent({ message, history = [] }) {
    const provider = this.getProvider();

    try {
      const response = await provider.run({
        message,
        history,
        executeTool,
        systemPrompt: SYSTEM_PROMPT
      });

      return {
        reply: response.reply,
        actions_taken: response.actions_taken || [],
        action_card: response.action_card || null,
        history: [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: response.reply }
        ]
      };
    } catch (err) {
      console.warn('⚠️ Primary LLM provider failed, falling back to deterministic tool engine:', err.message);
      // Fallback seamlessly to deterministic engine
      const response = await this.fallback.run({
        message,
        history,
        executeTool
      });

      return {
        reply: response.reply,
        actions_taken: response.actions_taken || [],
        action_card: response.action_card || null,
        history: [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: response.reply }
        ]
      };
    }
  }
}

export const orchestrator = new AgentOrchestrator();
