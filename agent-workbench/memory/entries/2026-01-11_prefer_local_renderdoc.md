# 2026-01-11 - Prefer repo-local RenderDoc bindings

## Context
- 用户已在 `thirdparty/renderdoc` 放置 RenderDoc 的 DLL/PYD/EXE，并要求 MCP Agent 优先使用仓库内资源。
- 之前仅在 `RENDERDOC_PYTHON_PATH` 未设置时才回落到 `thirdparty/renderdoc`。

## Changes
- 启动脚本固定优先使用 `thirdparty/renderdoc/renderdoc.pyd`，覆盖外部路径。
- README 补充说明：存在本地 bindings 时优先使用。

## Files
- `runtime/agent/start_mcp_agent.cmd`
- `README.md`

## Verification
- 启动 MCP Agent 日志应显示 `[OK] RENDERDOC_PYTHON_PATH=...\thirdparty\renderdoc`。
