import { AgentError } from "../errors";
import { OpenAICompatibleProvider } from "./openai";
import type { LLMProvider } from "./types";

export type { LLMProvider, LLMMessage, LLMToolCall, LLMToolSpec, LLMChatInput, LLMChatOutput } from "./types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

/**
 * Builds the configured provider from environment variables (server-only).
 *   LLM_PROVIDER = openai | groq   (default: openai)
 */
export function getProvider(env: NodeJS.ProcessEnv = process.env): LLMProvider {
  const provider = (env.LLM_PROVIDER || "openai").toLowerCase();

  switch (provider) {
    case "openai": {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) throw new AgentError("PROVIDER_CONFIG", "OPENAI_API_KEY is not set");
      return new OpenAICompatibleProvider({
        name: "openai",
        apiKey,
        model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      });
    }
    case "groq": {
      const apiKey = env.GROQ_API_KEY;
      if (!apiKey) throw new AgentError("PROVIDER_CONFIG", "GROQ_API_KEY is not set");
      return new OpenAICompatibleProvider({
        name: "groq",
        apiKey,
        model: env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
        baseURL: GROQ_BASE_URL,
      });
    }
    default:
      throw new AgentError("PROVIDER_CONFIG", `Unsupported LLM_PROVIDER "${provider}"`);
  }
}
