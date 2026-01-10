# 2026-01-10 - Prefer repo-local RenderDoc bindings

## Context
- User built RenderDoc and placed `renderdoc.pyd`/`renderdoc.dll` under `thirdparty/renderdoc`.
- Goal: avoid system RenderDoc and always prefer repo-local bindings.

## Changes
- Added repo-local `thirdparty/renderdoc` to RenderDoc binding search order.
- Ensured Windows DLL search path includes the binding directory.
- Updated `start_mcp_agent.cmd` to detect `thirdparty/renderdoc`, set `RENDERDOC_PYTHON_PATH`, and add to `PATH`.

## Files
- `runtime/agent/renderdoc_adapter.py`
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- Run `start_debug_agent.bat` and confirm MCP Agent logs show `[OK] RENDERDOC_PYTHON_PATH=...thirdparty\renderdoc`.
