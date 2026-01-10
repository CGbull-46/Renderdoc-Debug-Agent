"""Capture-level MCP tool handlers.

These handlers are the bridge between MCP tool calls and RenderDoc
capture / action-tree functionality. They are intentionally thin and
delegate most logic to RenderdocTools or session manager instances.
"""


from typing import Any, Dict

from ..tools.renderdoc_tools import RenderdocTools


def iterate_actions_tool(args: Dict[str, Any]) -> Any:
    """MCP handler for renderdoc.iterate_actions."""

    tools = RenderdocTools()
    return tools.iterate_actions(**args)

