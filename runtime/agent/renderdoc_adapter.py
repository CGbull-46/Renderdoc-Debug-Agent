"""Cross-platform loader and helpers for RenderDoc's Python API."""


import importlib
import os
import platform
import sys
from pathlib import Path
from dataclasses import dataclass
from types import ModuleType
from typing import List, Optional


@dataclass
class RenderdocModule:
    """Wrapper around the RenderDoc Python module and useful entry points."""

    module: ModuleType

    def open_capture_file(self):
        return self.module.OpenCaptureFile()

    def local_replay_supported(self) -> bool:
        return bool(self.module.LocalReplaySupport())


def _repo_thirdparty_renderdoc() -> Optional[str]:
    repo_root = Path(__file__).resolve().parents[2]
    candidate = repo_root / "thirdparty" / "renderdoc"
    if candidate.is_dir():
        return str(candidate)
    return None


def _candidate_paths() -> List[str]:
    """Return OS-specific default search paths for the RenderDoc Python module."""

    system = platform.system()
    paths: List[str] = []
    repo_local = _repo_thirdparty_renderdoc()
    if repo_local:
        paths.append(repo_local)
    if system == "Windows":
        # Typical installation path when RenderDoc is installed via the official installer.
        paths.extend(
            [
                os.path.join(os.environ.get("PROGRAMFILES", r"C:\\Program Files"), "RenderDoc/python"),
                os.path.join(os.environ.get("PROGRAMFILES(X86)", r"C:\\Program Files (x86)"), "RenderDoc/python"),
            ]
        )
    elif system == "Darwin":
        # RenderDoc app bundle ships the Python bindings inside the Resources directory.
        paths.append("/Applications/RenderDoc.app/Contents/SharedSupport/python")
    else:
        # Linux paths vary by distribution; `/opt` is common for manual installs.
        paths.extend(["/opt/renderdoc/python", "/usr/share/renderdoc/python"])
    return paths


def _add_dll_search_path(path: str) -> None:
    if platform.system() != "Windows":
        return
    add_dll_directory = getattr(os, "add_dll_directory", None)
    if add_dll_directory is None:
        return
    try:
        add_dll_directory(path)
    except OSError:
        return


def load_renderdoc(override_path: Optional[str] = None) -> RenderdocModule:
    """Attempt to import the RenderDoc Python bindings.

    The loader tries the following order:
    1. User-provided `override_path` or `RENDERDOC_PYTHON_PATH` environment variable.
    2. OS-specific default locations derived from the official installer layout.
    3. Regular `import renderdoc` if the module is already on `PYTHONPATH`.

    Raises:
        ImportError: if the RenderDoc module cannot be located.
    """

    env_override = override_path or os.environ.get("RENDERDOC_PYTHON_PATH")
    search_paths = []
    if env_override:
        search_paths.append(env_override)
    search_paths.extend(_candidate_paths())

    for path in search_paths:
        if path and os.path.isdir(path):
            _add_dll_search_path(path)
            sys.path.append(path)
            try:
                module = importlib.import_module("renderdoc")
                return RenderdocModule(module)
            except ImportError:
                continue

    try:
        module = importlib.import_module("renderdoc")
        return RenderdocModule(module)
    except ImportError as exc:
        raise ImportError(
            "RenderDoc Python module not found. Set RENDERDOC_PYTHON_PATH or install RenderDoc bindings."
        ) from exc
