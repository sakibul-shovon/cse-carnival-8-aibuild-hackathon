# AI agent design

## Boundary

The AI agent cannot import Prisma or the database client. It receives a fixed function allowlist from `backend/ai/tools.ts`, and every executor calls a domain service.

```text
User → POST /ai/chat → agent → function call → domain service → model/repository → MySQL
                                  ↑                                      |
                                  └──────── function result ─────────────┘
```

## Tools

| Tool | Service | Capability |
| --- | --- | --- |
| `getSchedule` | `scheduleService` | Student/day timetable lookup |
| `findAvailableRooms` | `roomsService` | Capacity, feature, class, event, and booking conflict search |
| `getUpcomingAssignments` | `assignmentsService` | Student deadline/status lookup |
| `getCampusEvents` | `eventsService` | Time-window and status event lookup |
| `getAnnouncements` | `announcementsService` | Priority and active notice lookup |

Tools are read-only by design. Adding actions such as booking a room requires a separate confirmation policy, authorization check, idempotency key, audit trail, and narrowly scoped mutation tool.

## Function-calling lifecycle

1. The API validates the user message and resolves the authenticated campus user.
2. The agent sends the prompt, bounded session messages, and strict JSON tool schemas to the OpenAI Responses API.
3. Each returned `function_call` is parsed and independently validated with Zod.
4. The executor invokes a domain service and serializes its result as `function_call_output` with the original `call_id`.
5. The loop continues until the model returns text or reaches the five-round guardrail.
6. Only user/assistant text is retained through the bounded AI-memory service.

This follows the official OpenAI function-calling pattern of appending model output, executing function calls, and returning tool results using their `call_id`: <https://developers.openai.com/api/docs/guides/function-calling>.

## Guardrails

- Strict JSON schemas reject undeclared properties.
- Zod validates tool arguments again inside the trust boundary.
- The system prompt forbids invented campus facts.
- Tool errors return stable codes to the model without stack traces.
- Tool rounds are capped to prevent runaway loops.
- `OPENAI_API_KEY` is server-only and the endpoint returns `503` when it is absent.
- Conversation memory is user/session scoped, bounded to 12 messages, and can be explicitly cleared.

For production, add a retention job and application-level encryption for chat content, then document the retention policy.
