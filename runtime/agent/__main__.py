"""Module entrypoint for running the RenderDoc MCP agent.

Usage:
    python -m runtime.agent

Environment variables:
    RENDERDOC_PYTHON_PATH  Path to RenderDoc's python bindings (if not on PYTHONPATH).
    RENDERDOC_CAPTURE      Optional default .rdc path for smoke testing.
    MCP_HOST               Host interface for the MCP WebSocket server (default: 127.0.0.1).
    MCP_PORT               Port for the MCP WebSocket server (default: 8765).
"""


import os

from .config import AgentConfig
from .runtime import RenderdocDebugAgent


def main() -> None:
    config = AgentConfig.from_env()
    agent = RenderdocDebugAgent(config)

    host = os.environ.get("MCP_HOST", "127.0.0.1")
    port_str = os.environ.get("MCP_PORT", "8765")
    try:
        port = int(port_str)
    except ValueError:
        port = 8765

    agent.run_mcp_server_sync(host=host, port=port)


if __name__ == "__main__":
    main()

