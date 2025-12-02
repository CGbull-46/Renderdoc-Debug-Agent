# Renderdoc-Debug-Agent

An AI-assisted RenderDoc workflow that lets developers drive GPU debugging through natural language. The project focuses on Windows and macOS but keeps Linux-friendly defaults.

## What you get
- **RenderDoc MCP tooling**: Python wrappers around the RenderDoc API (`agent/tools/renderdoc_tools.py`) with JSON schemas ready for Model Context Protocol tool-calling.
- **Local agent runtime**: `RenderdocDebugAgent` wires RenderDoc loaders, tool dispatch, and a minimal MCP WebSocket server for orchestrators/LLMs.
- **Docs & prompts**: Architecture notes, SOPs, and Planner/Explainer prompts under `docs/` for easy context injection.

## Quickstart
1. Install RenderDoc and ensure its Python bindings are available. Override the search path with `RENDERDOC_PYTHON_PATH` if needed.
2. Install the optional WebSocket dependency to run the MCP server:
   ```bash
   pip install websockets
   ```
3. Launch the local MCP server (uses port 8765 by default):
   ```bash
   python -c "from agent import AgentConfig, RenderdocDebugAgent; agent = RenderdocDebugAgent(AgentConfig.from_env()); agent.run_mcp_server_sync()"
   ```
4. Connect your planner/explainer orchestrator to `ws://127.0.0.1:8765` and call tools defined by `agent.runtime.RenderdocDebugAgent.list_mcp_tools()`.

## Cross-platform notes
- The loader searches typical RenderDoc Python paths on Windows (`Program Files/RenderDoc/python`) and macOS (`/Applications/RenderDoc.app/Contents/SharedSupport/python`). Set `RENDERDOC_PYTHON_PATH` to override.
- If a capture does not support local replay, the agent raises a `CaptureError` with the RenderDoc status code so the orchestrator can fall back or request another capture.

## Repository layout
- `agent/` – Python package for MCP tools and the agent runtime.
- `docs/` – Architecture, API schema, SOPs, prompts, and task examples.

Licensed under the MIT License.
