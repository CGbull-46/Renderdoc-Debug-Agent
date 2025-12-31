"""Minimal smoke tests for the RenderDoc MCP agent.

Run with:
    python -m runtime.agent.smoke_test

This verifies that:
  - RenderDoc's Python module can be imported (using RENDERDOC_PYTHON_PATH if set).
  - The MCP tool schemas can be generated.
  - Optionally, if RENDERDOC_CAPTURE is set, a capture can be opened and its
    action list enumerated.
"""

from __future__ import annotations

import os

from .config import AgentConfig
from .runtime import RenderdocDebugAgent, ToolCall


def main() -> None:
    config = AgentConfig.from_env()
    agent = RenderdocDebugAgent(config)

    tools = agent.list_mcp_tools()
    print("Available MCP tools:")
    for desc in tools["descriptors"]:
        print(f" - {desc['name']}")

    capture = config.default_capture
    if capture:
        print(f"\nOpening capture from RENDERDOC_CAPTURE={capture!r}")
        chain = [ToolCall(name="iterate_actions", arguments={"capture_path": capture})]
        results = agent.execute_chain(chain)
        print("\nFirst few actions:")
        first_actions = results[0]["result"][:5]
        for act in first_actions:
            print(f"  @{act['eventId']}: {act['name']}")
    else:
        print("\nNo RENDERDOC_CAPTURE set; skipping capture smoke test.")


if __name__ == "__main__":
    main()

