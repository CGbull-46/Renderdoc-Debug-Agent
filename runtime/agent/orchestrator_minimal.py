"""Minimal NL-to-RenderDoc-tool orchestrator.

This script demonstrates an end-to-end loop:

- Read a natural language question from the user
- Use either OpenRouter (if configured) or simple heuristics to pick a
  single MCP tool and its arguments
- Call the local MCP server over WebSocket
- Print the tool result in a readable form

It is intentionally small and synchronous for easier experimentation.
"""


import argparse
import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import asyncio

try:
    import websockets  # type: ignore
except ImportError:
    websockets = None  # type: ignore

try:
    import requests  # type: ignore
except ImportError:
    requests = None  # type: ignore

from .config import AgentConfig
from .runtime import RenderdocDebugAgent, ToolCall


OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"


@dataclass
class PlannedAction:
    name: str
    arguments: Dict[str, Any]


def _call_openrouter(
    config: AgentConfig,
    system_prompt: str,
    user_content: str,
) -> Optional[Dict[str, Any]]:
    if requests is None:
        return None
    if not config.openrouter_api_key:
        return None

    headers = {
        "Authorization": f"Bearer {config.openrouter_api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": config.model_planner,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "response_format": {"type": "json_object"},
    }
    response = requests.post(OPENROUTER_API_URL, headers=headers, json=body, timeout=60)
    response.raise_for_status()
    data = response.json()
    try:
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:
        return None


def _heuristic_plan(question: str, config: AgentConfig) -> PlannedAction:
    capture_path = config.default_capture
    if not capture_path:
        raise RuntimeError("RENDERDOC_CAPTURE is not set and no capture path was provided.")

    text = question.lower()
    if "action" in text or "drawcall" in text or "事件" in text:
        return PlannedAction(
            name="iterate_actions",
            arguments={"capture_path": capture_path},
        )
    if "counter" in text or "性能" in text or "gpu" in text:
        return PlannedAction(
            name="enumerate_counters",
            arguments={"capture_path": capture_path},
        )
    raise RuntimeError(
        "Could not infer a tool from the question. "
        "Try mentioning 'actions' or 'counters', or configure OpenRouter for planning."
    )


def plan_single_tool(question: str, agent: RenderdocDebugAgent) -> PlannedAction:
    config = agent.config

    schema = agent.tools.export_schema()
    schema_text = json.dumps(schema, ensure_ascii=False, indent=2)

    system_prompt = (
        "You are a RenderDoc planning model. "
        "Given a natural language question from a user and the available MCP tools, "
        "choose exactly one tool to call and provide concrete arguments. "
        "Always return a JSON object with fields 'name' (string) and 'arguments' (object). "
        "Available tools and their JSON schemas:\n"
        f"{schema_text}"
    )

    nl_payload = f"User question: {question}"
    result = _call_openrouter(config, system_prompt, nl_payload)

    if result and isinstance(result, dict) and "name" in result and "arguments" in result:
        return PlannedAction(name=result["name"], arguments=result["arguments"])

    return _heuristic_plan(question, config)


async def _call_mcp_tool(
    host: str,
    port: int,
    tool: str,
    arguments: Dict[str, Any],
) -> Dict[str, Any]:
    if websockets is None:
        raise RuntimeError("websockets package is required to talk to the MCP server.")

    uri = f"ws://{host}:{port}"
    async with websockets.connect(uri) as ws:
        req = {"id": "1", "tool": tool, "arguments": arguments}
        await ws.send(json.dumps(req, ensure_ascii=False))
        raw = await ws.recv()
        data = json.loads(raw)
        return data


def _run_async(coro):
    if hasattr(asyncio, "run"):
        return asyncio.run(coro)
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        loop.close()
        asyncio.set_event_loop(None)


def run_once(
    question: str,
    capture_path: Optional[str],
    host: str,
    port: int,
) -> None:
    config = AgentConfig.from_env()
    if capture_path:
        config = config.with_renderdoc_path(config.renderdoc_python_path)  # type: ignore[assignment]
        config.default_capture = capture_path  # type: ignore[assignment]

    agent = RenderdocDebugAgent(config)
    action = plan_single_tool(question, agent)

    print("Planned tool call:")
    print(json.dumps({"tool": action.name, "arguments": action.arguments}, ensure_ascii=False, indent=2))

    response = _run_async(_call_mcp_tool(host, port, action.name, action.arguments))

    print("\nMCP response:")
    print(json.dumps(response, ensure_ascii=False, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser(description="Minimal NL-to-RenderDoc-tool orchestrator.")
    parser.add_argument("question", nargs="*", help="Natural language question for the agent.")
    parser.add_argument("--capture", help="Path to a .rdc capture. Falls back to RENDERDOC_CAPTURE.")
    parser.add_argument("--host", default="127.0.0.1", help="MCP server host (default: 127.0.0.1).")
    parser.add_argument("--port", type=int, default=8765, help="MCP server port (default: 8765).")
    args = parser.parse_args()

    if args.question:
        question = " ".join(args.question)
    else:
        question = input("Describe what you want to inspect (e.g. 'list actions of the capture'): ")

    run_once(question, args.capture, args.host, args.port)


if __name__ == "__main__":
    main()

