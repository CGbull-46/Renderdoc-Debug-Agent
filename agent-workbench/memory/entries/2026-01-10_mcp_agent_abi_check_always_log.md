# 2026-01-10 - Always log RenderDoc ABI check and import error detail

## Context
- 用户未看到 Python ABI 匹配度日志与黄色告警，难以确认是否真正匹配。
- bindings import 失败时缺少具体错误原因。

## Changes
- ABI 检查日志改为始终输出（match/mismatch/unknown）。
- mismatch 时维持黄色警告输出。
- import 失败时追加具体错误行，便于定位缺失 DLL 或版本不匹配。

## Files
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- 运行 `start_mcp_agent.cmd`，应出现 `[CHECK] RenderDoc Python ABI: ...` 行与 import error 明细。
