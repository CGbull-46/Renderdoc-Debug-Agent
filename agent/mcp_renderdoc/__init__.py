"""MCP-facing RenderDoc tool declarations.

This package describes RenderDoc tools in an MCP-friendly format and
connects them to the existing RenderdocTools implementation under
agent.tools.renderdoc_tools.
"""

from __future__ import annotations

from typing import Any, Dict, List

from ..tools.renderdoc_tools import RenderdocTools


def _base_schema() -> Dict[str, Any]:
    """Return the JSON schema-style description of available tools.

    This is initially derived from RenderdocTools.export_schema(), and can
    be extended as new capabilities (geometry analysis, NaN/Inf analysis,
    pipeline inspection, etc.) are added.
    """

    tools = RenderdocTools()
    return tools.export_schema()


def tool_descriptors() -> List[Dict[str, Any]]:
    """Return a list of MCP tool descriptors for registration."""

    schema = _base_schema()

    descriptors: List[Dict[str, Any]] = []
    for name, spec in schema.items():
        descriptors.append(
            {
                "name": f"renderdoc.{name}",
                "description": spec.get("description", ""),
                "parameters": spec.get("parameters", {"type": "object", "properties": {}}),
            }
        )
    return descriptors


# Convenience constant for simple integration in orchestrators.
TOOLS: List[Dict[str, Any]] = tool_descriptors()

