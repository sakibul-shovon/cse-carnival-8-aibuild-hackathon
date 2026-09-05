export type AgentErrorCode =
  | "PROVIDER_CONFIG"
  | "PROVIDER_REQUEST"
  | "TOOL_VALIDATION"
  | "TOOL_EXECUTION"
  | "MAX_ITERATIONS"
  | "BAD_REQUEST";

export class AgentError extends Error {
  readonly code: AgentErrorCode;
  readonly cause?: unknown;

  constructor(code: AgentErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AgentError";
    this.code = code;
    this.cause = cause;
  }
}

/** Message safe to return to clients — never leaks keys, stack traces, or internals. */
export function toSafeMessage(err: unknown): { code: AgentErrorCode | "INTERNAL"; message: string } {
  if (err instanceof AgentError) {
    switch (err.code) {
      case "PROVIDER_CONFIG":
        return { code: err.code, message: "The AI service is not configured. Please contact an administrator." };
      case "PROVIDER_REQUEST":
        return { code: err.code, message: "The AI service is temporarily unavailable. Please try again." };
      case "MAX_ITERATIONS":
        return { code: err.code, message: "That request needed too many steps. Please try a simpler question." };
      case "BAD_REQUEST":
        return { code: err.code, message: err.message };
      default:
        return { code: err.code, message: "Something went wrong while processing your request." };
    }
  }
  return { code: "INTERNAL", message: "Something went wrong while processing your request." };
}
