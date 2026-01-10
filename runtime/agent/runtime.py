"""High-level runtime that connects LLM planning to RenderDoc tool execution."""


import asyncio
import json
import os
import sys
from dataclasses import dataclass
from typing import Any, Callable, Dict, List

from .config import AgentConfig
from .mcp_server import serve
from .renderdoc_adapter import load_renderdoc
from .tools.renderdoc_tools import RenderdocTools
from .mcp_renderdoc import tool_descriptors


@dataclass
class ToolCall:
    name: str
    arguments: Dict[str, Any]


class RenderdocDebugAgent:
    """Connects natural language plans from LLMs to deterministic RenderDoc tools."""

    def __init__(self, config: AgentConfig):
        self.config = config
        self.rd = None
        self.renderdoc_error = None
        try:
            self.rd = load_renderdoc(config.renderdoc_python_path)
            self.tools = RenderdocTools(self.rd)
        except ImportError as exc:
            # Allow MCP server to start even if RenderDoc bindings are missing.
            self.renderdoc_error = str(exc)
            self.tools = RenderdocTools()
            self._warn(f"RenderDoc bindings not found: {self.renderdoc_error}")

    @staticmethod
    def _warn(message: str) -> None:
        if os.environ.get("NO_COLOR"):
            print(f"[WARN] {message}")
            return
        print(f"\x1b[33m[WARN] {message}\x1b[0m")

    def list_mcp_tools(self) -> Dict[str, Any]:
        """Return JSON schemas for wiring into the Model Context Protocol.

        The result contains both the low-level schema exported by
        RenderdocTools and the higher-level MCP tool descriptors (including
        fully-qualified tool names) from runtime.agent.mcp_renderdoc.
        """

        return {
            "schema": self.tools.export_schema(),
            "descriptors": tool_descriptors(),
        }

    def execute_chain(self, actions: List[ToolCall]) -> List[Dict[str, Any]]:
        """Execute a chain of tool calls produced by a planner model."""

        results: List[Dict[str, Any]] = []
        for action in actions:
            result = self.tools.dispatch(action.name, action.arguments)
            results.append({"tool": action.name, "result": result})
        return results

    async def run_mcp_server(self, host: str = "127.0.0.1", port: int = 8765) -> None:
        """Expose the RenderDoc tools over MCP-compatible WebSocket calls."""

        await serve(self.tools, host=host, port=port)

    def run_mcp_server_sync(self, host: str = "127.0.0.1", port: int = 8765) -> None:
        coro = self.run_mcp_server(host, port)
        if hasattr(asyncio, "run"):
            asyncio.run(coro)
            return
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(coro)
        finally:
            loop.close()
            asyncio.set_event_loop(None)

    def plan_prompt(self) -> str:
        """Return a condensed planner prompt snippet for quick experiments."""

        return (
            "You are a RenderDoc planning model. Use the provided MCP tool schemas to build an action chain. "
            "Prefer evidence-first debugging (inspect actions, fetch pixel history) before providing judgments."
        )

    def summarize_results(self, chain_results: List[Dict[str, Any]]) -> str:
        """Render a human-readable summary of executed tool results."""

        return json.dumps(chain_results, ensure_ascii=False, indent=2)
