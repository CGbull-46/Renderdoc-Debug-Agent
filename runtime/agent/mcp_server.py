"""Lightweight Model Context Protocol (MCP) server for RenderDoc tools."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, Optional

try:
    import websockets
except ImportError:  # pragma: no cover - optional dependency
    websockets = None  # type: ignore

from .tools.renderdoc_tools import RenderdocTools, serialize_result


@dataclass
class MCPRequest:
    id: str
    tool: str
    arguments: Dict[str, Any]


@dataclass
class MCPResponse:
    id: str
    ok: bool
    result: Any = None
    error: Optional[str] = None


class MCPServer:
    """Minimal WebSocket server so an LLM orchestrator can call local tools."""

    def __init__(self, tools: RenderdocTools, host: str = "127.0.0.1", port: int = 8765):
        if websockets is None:
            raise RuntimeError("websockets package is required to run MCPServer")
        self.tools = tools
        self.host = host
        self.port = port

    async def _handle(self, websocket, path=None):
        async for raw in websocket:
            try:
                msg = json.loads(raw)
                req = MCPRequest(**msg)
                result = self.tools.dispatch(req.tool, req.arguments)
                response = MCPResponse(id=req.id, ok=True, result=result)
            except Exception as exc:  # noqa: BLE001 - surface errors to orchestrator
                response = MCPResponse(id=req.id if "req" in locals() else "unknown", ok=False, error=str(exc))
            await websocket.send(json.dumps(response.__dict__, ensure_ascii=False))

    async def run(self):
        async with websockets.serve(self._handle, self.host, self.port):
            await asyncio.Future()


async def serve(tools: RenderdocTools, host: str = "127.0.0.1", port: int = 8765) -> None:
    """Convenience entrypoint to run an MCP server."""

    server = MCPServer(tools, host, port)
    await server.run()


def serve_sync(tools: RenderdocTools, host: str = "127.0.0.1", port: int = 8765) -> None:
    """Blocking wrapper for environments without async runner."""

    asyncio.run(serve(tools, host, port))
