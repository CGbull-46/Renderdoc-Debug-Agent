# 2026-01-10 - Fix MCP Agent label lookup warning

## Context
- MCP Agent 启动脚本提示 “cannot find the batch label specified - find_renderdoc_binding”。
- 该错误导致 `RENDERDOC_PYTHON_PATH` 未被设置，进而出现 bindings 未找到的误报。

## Changes
- 将 RenderDoc bindings 探测逻辑内联到 `start_mcp_agent.cmd`，避免 `call :label` 引发的解析失败。
- 保留 `thirdparty/renderdoc` 优先级与 rdc build 路径回退。

## Files
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- 运行 `start_mcp_agent.cmd`，不再出现 “batch label” 报错，且能输出正确的 `RENDERDOC_PYTHON_PATH`。
