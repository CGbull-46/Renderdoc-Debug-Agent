# 2026-01-10 - MCP Agent ABI log + path warning cleanup

## Context
- MCP Agent 需要明确提示 RenderDoc bindings 与 Python 版本的匹配度。
- 日志中出现 `rdc\\qrenderdoc\\3rdparty\\python\\x64` 路径提示，用户希望仅聚焦 `thirdparty/renderdoc`。

## Changes
- 增加 RenderDoc Python ABI 匹配度的 `[CHECK]` 日志。
- 当 ABI 不匹配时用黄色警告提示。
- 清理 import 失败时的 rdc 路径提示，仅保留 `thirdparty/renderdoc` 相关信息。

## Files
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- 运行 `start_mcp_agent.cmd`：可见 ABI `[CHECK]` 日志，且不再出现 `rdc\\qrenderdoc\\3rdparty\\python\\x64` 提示。
