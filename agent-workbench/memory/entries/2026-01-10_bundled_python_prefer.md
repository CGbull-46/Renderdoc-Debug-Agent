# 2026-01-10 - Prefer bundled Python from thirdparty

## Context
- 用户已放置 `thirdparty/python`，希望 MCP Agent 默认使用内置 Python 而非系统 Python。
- 当前脚本只会使用系统 Python/py。

## Changes
- `start_mcp_agent.cmd` 优先检测 `thirdparty/python/python.exe` 或 `python3.exe`。
- 未发现内置 Python 时给出黄色警告并回退系统 Python。
- README 增加内置 Python 的目录要求与版本匹配说明。

## Files
- `runtime/agent/start_mcp_agent.cmd`
- `README.md`

## Verification
- 若 `thirdparty/python/python.exe` 存在，日志显示 `[OK] Using bundled Python: ...`。
