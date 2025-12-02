"""Thin MCP-friendly wrappers around common RenderDoc Python API calls."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from ..renderdoc_adapter import RenderdocModule


class CaptureError(RuntimeError):
    """Raised when a capture cannot be opened or replayed."""


@dataclass
class RenderdocCapture:
    """Context manager for a RenderDoc capture and replay controller."""

    rd: RenderdocModule
    capture_path: Path

    def __enter__(self):
        self._file = self.rd.open_capture_file()
        status = self._file.OpenFile(str(self.capture_path), "")
        if status != 0:
            raise CaptureError(f"Failed to open capture: {self.capture_path} (status={status})")

        if not self.rd.local_replay_supported():
            raise CaptureError("Local replay unsupported on this platform or installation.")

        if not self._file.LocalReplaySupport():
            raise CaptureError("Capture file not suitable for local replay.")

        self._controller = self._file.OpenCapture(allowExecution=True)
        if self._controller is None:
            raise CaptureError("Failed to acquire replay controller.")
        return self

    def __exit__(self, exc_type, exc, tb):
        try:
            if getattr(self, "_controller", None):
                self._controller.Shutdown()
            if getattr(self, "_file", None):
                self._file.Shutdown()
        finally:
            self._controller = None
            self._file = None

    @property
    def controller(self):
        return self._controller


class RenderdocTools:
    """Expose deterministic RenderDoc operations suitable for MCP tool wiring."""

    def __init__(self, rd: RenderdocModule):
        self.rd = rd

    def iterate_actions(self, capture_path: str) -> List[Dict[str, Any]]:
        """Return the flattened action tree for a capture."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            actions = []
            for action in cap.controller.GetRootActions():
                actions.extend(self._flatten_action(action))
            return actions

    def _flatten_action(self, action) -> Iterable[Dict[str, Any]]:
        yield {
            "eventId": action.eventId,
            "drawcallId": action.drawcallId,
            "flags": str(action.flags),
            "name": action.GetName(),
        }
        for child in action.children:
            yield from self._flatten_action(child)

    def pixel_history(self, capture_path: str, texture_id: int, x: int, y: int, sample: int = 0) -> List[Dict[str, Any]]:
        """Return sanitized pixel history for a location."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            history = cap.controller.PixelHistory(self.rd.module.ResourceId(texture_id), x, y, sample)
            cleaned = [
                {
                    "eventId": mod.eventId,
                    "preColour": list(mod.preMod.colour),
                    "postColour": list(mod.postMod.colour),
                }
                for mod in history
                if mod.preMod.colour != mod.postMod.colour
            ]
            return cleaned

    def enumerate_counters(self, capture_path: str) -> List[Dict[str, Any]]:
        """List available GPU counters and fetch their values."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            counters = cap.controller.EnumerateCounters()
            values = cap.controller.FetchCounters(counters)
            return [
                {
                    "name": cap.controller.GetCounterDescription(c).name,
                    "value": v.value,
                }
                for c, v in zip(counters, values)
            ]

    def save_texture(self, capture_path: str, resource_id: int, output_path: str, mip: int = 0, slice: int = 0) -> str:
        """Save a texture to disk using RenderDoc's TextureSave helper."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            save_data = self.rd.module.TextureSave()
            save_data.resourceId = self.rd.module.ResourceId(resource_id)
            save_data.destType = self.rd.module.FileType.PNG
            save_data.mip = mip
            save_data.slice.sliceIndex = slice
            cap.controller.SaveTexture(save_data, output_path)
            return output_path

    def export_schema(self) -> Dict[str, Any]:
        """Return JSON-serializable MCP tool schema metadata."""

        return {
            "iterate_actions": {
                "description": "Flatten the RenderDoc action tree for a capture",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "capture_path": {"type": "string", "description": "Path to the .rdc capture"}
                    },
                    "required": ["capture_path"],
                },
            },
            "pixel_history": {
                "description": "Retrieve pixel history for a given pixel (filters unchanged entries)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "capture_path": {"type": "string"},
                        "texture_id": {"type": "integer"},
                        "x": {"type": "integer"},
                        "y": {"type": "integer"},
                        "sample": {"type": "integer", "default": 0},
                    },
                    "required": ["capture_path", "texture_id", "x", "y"],
                },
            },
            "enumerate_counters": {
                "description": "Enumerate GPU counters and fetch their current values",
                "parameters": {
                    "type": "object",
                    "properties": {"capture_path": {"type": "string"}},
                    "required": ["capture_path"],
                },
            },
            "save_texture": {
                "description": "Save a texture to an image file",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "capture_path": {"type": "string"},
                        "resource_id": {"type": "integer"},
                        "output_path": {"type": "string"},
                        "mip": {"type": "integer", "default": 0},
                        "slice": {"type": "integer", "default": 0},
                    },
                    "required": ["capture_path", "resource_id", "output_path"],
                },
            },
        }

    def dispatch(self, tool_name: str, payload: Dict[str, Any]) -> Any:
        """Execute a tool call described by its name and JSON payload."""

        if tool_name == "iterate_actions":
            return self.iterate_actions(**payload)
        if tool_name == "pixel_history":
            return self.pixel_history(**payload)
        if tool_name == "enumerate_counters":
            return self.enumerate_counters(**payload)
        if tool_name == "save_texture":
            return self.save_texture(**payload)
        raise KeyError(f"Unknown tool: {tool_name}")


def serialize_result(result: Any) -> str:
    """Serialize tool output into a compact JSON string for MCP responses."""

    return json.dumps(result, ensure_ascii=False, indent=2)
