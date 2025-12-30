"""Thin MCP-friendly wrappers around common RenderDoc Python API calls."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from ..renderdoc_adapter import RenderdocModule, load_renderdoc


class CaptureError(RuntimeError):
    """Raised when a capture cannot be opened or replayed."""


@dataclass
class RenderdocCapture:
    """Context manager for a RenderDoc capture and replay controller."""

    rd: RenderdocModule
    capture_path: Path

    def __enter__(self):
        self._file = self.rd.open_capture_file()
        try:
            status = self._file.OpenFile(str(self.capture_path), "", None)
        except TypeError:
            status = self._file.OpenFile(str(self.capture_path), "")
        if not _status_ok(self.rd, status):
            raise CaptureError(f"Failed to open capture: {self.capture_path} (status={status})")

        if not self.rd.local_replay_supported():
            raise CaptureError("Local replay unsupported on this platform or installation.")

        if not self._file.LocalReplaySupport():
            raise CaptureError("Capture file not suitable for local replay.")

        try:
            result, controller = self._file.OpenCapture(self.rd.module.ReplayOptions(), None)
            if not _status_ok(self.rd, result) or controller is None:
                raise CaptureError(f"Failed to acquire replay controller (status={result}).")
            self._controller = controller
        except TypeError:
            controller = self._file.OpenCapture(allowExecution=True)
            if controller is None:
                raise CaptureError("Failed to acquire replay controller.")
            self._controller = controller
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

    def __init__(self, rd: Optional[RenderdocModule] = None):
        self.rd: RenderdocModule = rd or load_renderdoc()

    def iterate_actions(self, capture_path: str) -> List[Dict[str, Any]]:
        """Return the flattened action tree for a capture."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            structured = None
            if hasattr(cap.controller, "GetStructuredFile"):
                structured = cap.controller.GetStructuredFile()
            actions = []
            for action in cap.controller.GetRootActions():
                actions.extend(self._flatten_action(action, structured))
            return actions

    def _flatten_action(self, action, structured) -> Iterable[Dict[str, Any]]:
        yield {
            "eventId": action.eventId,
            "drawcallId": action.drawcallId,
            "flags": str(action.flags),
            "name": _action_name(action, structured),
        }
        for child in action.children:
            yield from self._flatten_action(child, structured)

    def pixel_history(self, capture_path: str, texture_id: int, x: int, y: int, sample: int = 0) -> List[Dict[str, Any]]:
        """Return sanitized pixel history for a location."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            history = cap.controller.PixelHistory(_resource_id(self.rd, texture_id), x, y, sample)
            cleaned = [
                {
                    "eventId": _event_id(mod),
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
            save_data.resourceId = _resource_id(self.rd, resource_id)
            save_data.destType = self.rd.module.FileType.PNG
            save_data.mip = mip
            save_data.slice.sliceIndex = slice
            cap.controller.SaveTexture(save_data, output_path)
            return output_path

    def analyze_nan_inf(self, capture_path: str, texture_id: int, x: int, y: int, sample: int = 0) -> List[Dict[str, Any]]:
        """Analyze NaN/Inf anomalies in pixel history for a given location."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            history = cap.controller.PixelHistory(_resource_id(self.rd, texture_id), x, y, sample)
            anomalies: List[Dict[str, Any]] = []
            for mod in history:
                colour = mod.postMod.colour
                if any(math.isnan(c) or math.isinf(c) for c in colour):
                    anomalies.append(
                        {
                            "eventId": _event_id(mod),
                            "color": [float(v) for v in colour],
                        }
                    )
            return anomalies

    def geometry_anomalies(self, capture_path: str, event_id: int, mesh_slot: int = 0) -> List[Dict[str, Any]]:
        """Detect basic geometric anomalies (invalid positions / UV out of range)."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            cap.controller.SetFrameEvent(event_id, True)
            vsout = cap.controller.GetPostVSData(self.rd.module.MeshDataStage.VSOut, mesh_slot)
            issues: List[Dict[str, Any]] = []
            for i in range(vsout.numIndices):
                pos = vsout.positions[i]
                x, y, z, w = pos.x, pos.y, pos.z, pos.w
                if any(math.isnan(v) or math.isinf(v) for v in (x, y, z)) or any(
                    abs(v) > 1e4 for v in (x, y, z)
                ):
                    issues.append(
                        {
                            "index": i,
                            "position": [float(x), float(y), float(z), float(w)],
                            "reason": "invalid_position",
                        }
                    )
                if vsout.numTexCoords > 0:
                    uv = vsout.texcoords[0][i]
                    u, v = uv.x, uv.y
                    if u < 0 or u > 1 or v < 0 or v > 1:
                        issues.append(
                            {
                                "index": i,
                                "uv": [float(u), float(v)],
                                "reason": "uv_out_of_range",
                            }
                        )
            return issues

    def get_pipeline_state(self, capture_path: str, event_id: int) -> Dict[str, Any]:
        """Summarize pipeline framebuffer attachments for a given drawcall."""

        with RenderdocCapture(self.rd, Path(capture_path)) as cap:
            cap.controller.SetFrameEvent(event_id, True)

            color_targets: List[Dict[str, Any]] = []
            depth_target: Optional[Dict[str, Any]] = None
            try:
                pipe = cap.controller.GetPipelineState()
                framebuffer = getattr(pipe, "GetFramebuffer", None)
                if callable(framebuffer):
                    fb = framebuffer()
                    if hasattr(fb, "colorAttachments"):
                        for idx, att in enumerate(fb.colorAttachments):
                            res_id = getattr(att, "resourceId", None)
                            if res_id:
                                color_targets.append(
                                    {
                                        "index": idx,
                                        "resourceId": _resource_id_to_str(res_id),
                                        "name": getattr(att, "name", f"RT{idx}"),
                                    }
                                )
                    depth_att = getattr(fb, "depthAttachment", None)
                    if depth_att and getattr(depth_att, "resourceId", None):
                        depth_target = {
                            "resourceId": _resource_id_to_str(depth_att.resourceId),
                            "name": getattr(depth_att, "name", "Depth"),
                        }
            except Exception:
                pass

            highlight = None
            if depth_target is None:
                highlight = "RS"

            return {
                "highlightStage": highlight,
                "warningMessage": None if highlight is None else "Depth attachment missing; RS highlighted",
                "colorTargets": color_targets,
                "depthTarget": depth_target,
            }

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
            "analyze_nan_inf": {
                "description": "Analyze NaN/Inf anomalies for a single pixel via PixelHistory",
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
            "geometry_anomalies": {
                "description": "Detect basic geometric anomalies for a given drawcall",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "capture_path": {"type": "string"},
                        "event_id": {"type": "integer"},
                        "mesh_slot": {"type": "integer", "default": 0},
                    },
                    "required": ["capture_path", "event_id"],
                },
            },
            "get_pipeline_state": {
                "description": "Summarize framebuffer attachments for a specific drawcall",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "capture_path": {"type": "string"},
                        "event_id": {"type": "integer"},
                    },
                    "required": ["capture_path", "event_id"],
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
        if tool_name == "analyze_nan_inf":
            return self.analyze_nan_inf(**payload)
        if tool_name == "geometry_anomalies":
            return self.geometry_anomalies(**payload)
        if tool_name == "get_pipeline_state":
            return self.get_pipeline_state(**payload)
        raise KeyError(f"Unknown tool: {tool_name}")


def serialize_result(result: Any) -> str:
    """Serialize tool output into a compact JSON string for MCP responses."""

    return json.dumps(result, ensure_ascii=False, indent=2)


def _status_ok(rd: RenderdocModule, status: Any) -> bool:
    if hasattr(rd.module, "ResultCode"):
        return status == rd.module.ResultCode.Succeeded
    return status == 0


def _resource_id(rd: RenderdocModule, resource_id: Any):
    resource_type = getattr(rd.module, "ResourceId", None)
    if resource_type is None:
        return resource_id
    if isinstance(resource_id, resource_type):
        return resource_id
    try:
        return resource_type(resource_id)
    except Exception:
        return resource_id


def _resource_id_to_str(resource_id: Any) -> str:
    value = getattr(resource_id, "value", None)
    if value is not None:
        try:
            return str(int(value))
        except Exception:
            return str(value)
    return str(resource_id)


def _event_id(mod: Any) -> int:
    if hasattr(mod, "eventId"):
        return int(mod.eventId)
    return int(getattr(mod, "eventID"))


def _action_name(action: Any, structured: Any) -> str:
    if structured is not None:
        try:
            return action.GetName(structured)
        except TypeError:
            pass
    try:
        return action.GetName()
    except Exception:
        return getattr(action, "name", "<unknown>")
