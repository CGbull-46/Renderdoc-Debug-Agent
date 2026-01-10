# 2026-01-10 - Fix ABI detection + yellow warnings

## Context
- ABI 检测日志显示 `unknown`，导致无法判断 bindings 版本。
- 警告未显示为黄色。
- 需要更清晰的 import 失败原因。

## Changes
- 修复 `renderdoc.pyd` 的 ABI 探测：直接读取 `RENDERDOC_PYTHON_PATH` 下的 pyd。
- 所有启动脚本警告改为黄色输出（PowerShell Write-Host）。
- MCP Agent 的 Python 警告输出支持黄色（ANSI）。

## Files
- `runtime/agent/start_mcp_agent.cmd`
- `runtime/agent/runtime.py`

## Verification
- 运行 `start_mcp_agent.cmd`，应看到 ABI `[CHECK]` 行明确显示 binding/runtime。
- 警告行显示为黄色。
