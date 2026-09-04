from enum import StrEnum
from typing import Annotated, Any

from pydantic import Field, StringConstraints

from .common import NonEmptyStr, StrictModel


ConversationId = Annotated[
    str, StringConstraints(pattern=r"^conv-[A-Za-z0-9_-]+$")
]


class AgentMessageRequest(StrictModel):
    conversation_id: ConversationId | None = None
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]
    timezone: str = "Asia/Dhaka"


class AgentStatus(StrEnum):
    COMPLETED = "completed"
    NEEDS_CLARIFICATION = "needs_clarification"
    REFUSED = "refused"
    FAILED = "failed"


class ToolCallStatus(StrEnum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    SKIPPED = "skipped"


class ToolCallTrace(StrictModel):
    name: NonEmptyStr
    status: ToolCallStatus
    arguments: dict[str, Any] | None = None
    result_summary: str | None = None


class AgentMessageResponse(StrictModel):
    conversation_id: ConversationId
    reply: NonEmptyStr
    status: AgentStatus
    tool_calls: list[ToolCallTrace] = Field(default_factory=list)
