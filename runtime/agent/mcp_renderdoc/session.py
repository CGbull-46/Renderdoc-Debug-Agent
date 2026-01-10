"""Session management for RenderDoc MCP tools.

RenderDocSessionManager is responsible for mapping logical capture IDs
to underlying ReplayController instances when long-lived sessions are
needed. For now this is a lightweight skeleton; tools that operate on
file paths directly can continue to use RenderdocTools.
"""


from dataclasses import dataclass, field
from typing import Dict, Optional

import renderdoc  # type: ignore[import-not-found]


@dataclass
class RenderDocSession:
    capture_path: str
    controller: renderdoc.ReplayController


@dataclass
class RenderDocSessionManager:
    sessions: Dict[str, RenderDocSession] = field(default_factory=dict)

    def open_capture(self, capture_id: str, file_path: str) -> None:
        """Open a capture and associate it with a logical capture_id."""

        if capture_id in self.sessions:
            raise ValueError(f"Capture id already exists: {capture_id}")

        cap = renderdoc.OpenCaptureFile()
        result = cap.OpenFile(file_path, "", None)
        if result != renderdoc.ResultCode.Succeeded:
            cap.Shutdown()
            raise RuntimeError(f"Couldn't open file '{file_path}': {result}")

        if not cap.LocalReplaySupport():
            cap.Shutdown()
            raise RuntimeError("Capture cannot be replayed on this machine")

        result, controller = cap.OpenCapture(renderdoc.ReplayOptions(), None)
        cap.Shutdown()

        if result != renderdoc.ResultCode.Succeeded:
            raise RuntimeError(f"Couldn't initialise replay: {result}")

        self.sessions[capture_id] = RenderDocSession(capture_path=file_path, controller=controller)

    def close_capture(self, capture_id: str) -> None:
        """Shutdown and remove a previously opened capture session."""

        session = self.sessions.pop(capture_id, None)
        if session is None:
            return
        session.controller.Shutdown()

    def get_controller(self, capture_id: str) -> Optional[renderdoc.ReplayController]:
        """Return the ReplayController for a capture id, if it exists."""

        session = self.sessions.get(capture_id)
        return session.controller if session is not None else None

