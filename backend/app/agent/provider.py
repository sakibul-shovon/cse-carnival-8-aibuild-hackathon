from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class ToolRequest:
    call_id: str
    name: str
    arguments: dict[str, Any]


@dataclass(frozen=True)
class ProviderTurn:
    response_id: str
    text: str = ""
    tool_calls: list[ToolRequest] = field(default_factory=list)


class ToolCallingProvider(Protocol):
    def respond(self, *, instructions: str, input_items: Any, tools: list[dict],
                previous_response_id: str | None = None) -> ProviderTurn: ...


class OpenAIResponsesProvider:
    """Small adapter around OpenAI Responses native function calling."""

    def __init__(self, api_key: str, model: str, timeout: float = 20.0) -> None:
        from openai import OpenAI
        self._client = OpenAI(api_key=api_key, timeout=timeout, max_retries=1)
        self._model = model

    def respond(self, *, instructions: str, input_items: Any, tools: list[dict],
                previous_response_id: str | None = None) -> ProviderTurn:
        kwargs = dict(model=self._model, instructions=instructions, input=input_items,
                      tools=tools, tool_choice="auto", parallel_tool_calls=False,
                      max_output_tokens=800, store=True)
        if previous_response_id:
            kwargs["previous_response_id"] = previous_response_id
        response = self._client.responses.create(**kwargs)
        calls = []
        for item in response.output:
            if item.type == "function_call":
                import json
                calls.append(ToolRequest(call_id=item.call_id, name=item.name,
                                         arguments=json.loads(item.arguments)))
        return ProviderTurn(response_id=response.id, text=response.output_text or "", tool_calls=calls)
