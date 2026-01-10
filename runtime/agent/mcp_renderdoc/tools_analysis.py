"""Analysis-focused MCP tool handlers (pixel history, counters, etc.)."""


from typing import Any, Dict

from ..tools.renderdoc_tools import RenderdocTools


def pixel_history_tool(args: Dict[str, Any]) -> Any:
    """MCP handler for renderdoc.pixel_history."""

    tools = RenderdocTools()
    return tools.pixel_history(**args)


def enumerate_counters_tool(args: Dict[str, Any]) -> Any:
    """MCP handler for renderdoc.enumerate_counters."""

    tools = RenderdocTools()
    return tools.enumerate_counters(**args)

