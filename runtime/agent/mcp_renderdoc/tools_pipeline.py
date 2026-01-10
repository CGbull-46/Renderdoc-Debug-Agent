"""Pipeline / resource-oriented MCP tool handlers."""


from typing import Any, Dict

from ..tools.renderdoc_tools import RenderdocTools


def save_texture_tool(args: Dict[str, Any]) -> Any:
    """MCP handler for renderdoc.save_texture."""

    tools = RenderdocTools()
    return tools.save_texture(**args)


def get_pipeline_state_tool(args: Dict[str, Any]) -> Any:
    """MCP handler for renderdoc.get_pipeline_state."""

    tools = RenderdocTools()
    return tools.get_pipeline_state(**args)

