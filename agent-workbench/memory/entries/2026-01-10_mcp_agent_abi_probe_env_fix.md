# 2026-01-10 - Fix ABI probe by exporting RD_PYD

## Context
- ABI 日志仍显示 `unknown`，探测逻辑未读取到 `renderdoc.pyd`。
- 需要稳定在 cmd 环境下解析 `pythonXX.dll` 依赖。

## Changes
- 在脚本中显式设置 `RD_PYD` 环境变量并由 Python 解析 `renderdoc.pyd`。
- 避免 PowerShell 命令在 cmd 中的转义/解析问题。

## Files
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- `RD_PYDLL` 能解析为 `python36.dll`，ABI `[CHECK]` 行不再为 `unknown`。
