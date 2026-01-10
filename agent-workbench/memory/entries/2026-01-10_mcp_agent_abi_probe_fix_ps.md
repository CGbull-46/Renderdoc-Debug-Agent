# 2026-01-10 - Fix ABI probe with PowerShell + yellow warnings

## Context
- ABI 日志仍为 `unknown`，导致无法判断 bindings 版本。
- 部分 `[WARN]` 仍以白色输出。

## Changes
- ABI 解析改为 PowerShell 直接读取 `renderdoc.pyd` 并匹配 `pythonXX.dll`。
- ABI 解析失败时追加黄色告警提示。
- MCP Agent 运行时警告输出改为无条件 ANSI 黄色（可用 `NO_COLOR` 关闭）。

## Files
- `runtime/agent/start_mcp_agent.cmd`
- `runtime/agent/runtime.py`

## Verification
- 运行 `start_mcp_agent.cmd`，ABI `[CHECK]` 行应显示明确的 binding/runtime。
- `[WARN]` 行应呈现黄色。
