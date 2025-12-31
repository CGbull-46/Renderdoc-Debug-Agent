"""Configuration helpers for the Renderdoc Debug Agent."""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class AgentConfig:
    """Runtime configuration.

    Attributes:
        openrouter_api_key: API key for OpenRouter (or other LLM gateways).
        model_planner: Model identifier for planning tasks.
        model_explainer: Model identifier for explanations.
        renderdoc_python_path: Optional override for locating the RenderDoc Python module.
        default_capture: Optional path to a default capture file for smoke testing.
    """

    openrouter_api_key: Optional[str] = os.environ.get("OPENROUTER_API_KEY")
    model_planner: str = os.environ.get("PLANNER_MODEL", "gpt-4o-mini")
    model_explainer: str = os.environ.get("EXPLAINER_MODEL", "gpt-4o")
    renderdoc_python_path: Optional[str] = os.environ.get("RENDERDOC_PYTHON_PATH")
    default_capture: Optional[str] = os.environ.get("RENDERDOC_CAPTURE")

    @classmethod
    def from_env(cls) -> "AgentConfig":
        """Load configuration from environment variables."""

        return cls()

    def with_renderdoc_path(self, path: str) -> "AgentConfig":
        """Return a copy of the config overriding the RenderDoc Python path."""

        return AgentConfig(
            openrouter_api_key=self.openrouter_api_key,
            model_planner=self.model_planner,
            model_explainer=self.model_explainer,
            renderdoc_python_path=path,
            default_capture=self.default_capture,
        )
