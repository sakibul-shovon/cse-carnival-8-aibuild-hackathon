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


class GeminiProvider:
    """Adapter for Gemini manual/native function calling via google-genai."""

    def __init__(self, api_key: str, model: str, timeout: float = 20.0) -> None:
        from google import genai
        from google.genai import types
        self._types = types
        self._client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=int(timeout * 1000)))
        self._model = model
        self._histories: dict[str, list[Any]] = {}
        self._call_names: dict[str, dict[str, str]] = {}

    def respond(self, *, instructions: str, input_items: Any, tools: list[dict],
                previous_response_id: str | None = None) -> ProviderTurn:
        import json
        from uuid import uuid4

        types = self._types
        history = list(self._histories.get(previous_response_id, []))
        if isinstance(input_items, str):
            history.append(types.Content(role="user", parts=[types.Part.from_text(text=input_items)]))
        else:
            names = self._call_names.get(previous_response_id or "", {})
            parts = []
            for item in input_items:
                call_id = item["call_id"]
                payload = json.loads(item["output"])
                parts.append(types.Part.from_function_response(name=names[call_id], response={"result": payload}))
            history.append(types.Content(role="tool", parts=parts))

        declarations = [types.FunctionDeclaration(name=item["name"], description=item["description"],
                                                    parameters_json_schema=item["parameters"]) for item in tools]
        config = types.GenerateContentConfig(
            system_instruction=instructions,
            tools=[types.Tool(function_declarations=declarations)],
            automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
            max_output_tokens=800,
            temperature=0.2,
        )
        for attempt in range(2):
            try:
                response = self._client.models.generate_content(model=self._model, contents=list(history), config=config)
                break
            except Exception:
                if attempt == 1: raise
        content = response.candidates[0].content
        history.append(content)
        response_id = f"gem-{uuid4().hex}"
        calls, call_names = [], {}
        for function_call in response.function_calls or []:
            call_id = function_call.id or f"call-{uuid4().hex}"
            call_names[call_id] = function_call.name
            calls.append(ToolRequest(call_id=call_id, name=function_call.name, arguments=dict(function_call.args or {})))
        self._histories[response_id] = history
        self._call_names[response_id] = call_names
        text = ""
        if not calls:
            text = response.text or ""
        return ProviderTurn(response_id=response_id, text=text, tool_calls=calls)
