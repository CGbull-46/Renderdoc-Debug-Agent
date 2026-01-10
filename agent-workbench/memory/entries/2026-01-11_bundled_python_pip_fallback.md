# 2026-01-11 - Bundled Python pip fallback and ABI probe hardening

## Context
- MCP Agent 仍提示 ABI unknown 与 pip 缺失，导致 websockets 无法安装。
- 内置 Python 虽能运行，但 stdlib/ensurepip 与 ABI 探测在脚本里不够稳定。

## Changes
- ABI 探测优先用 PowerShell 读取 `renderdoc.pyd`，避免依赖 Python stdlib。
- `PY_MAJMIN` 优先从 runtime DLL 名称推导，避免空值导致 `python.zip` 误判。
- `pip` 仍缺失时，允许使用系统 Python 将 `websockets==10.4` 安装到内置 Python 的 `Lib\\site-packages`。
- 安装后二次验证 `import websockets`，失败则明确报错。

## Files
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- 启动时 ABI 应显示 `binding=python36.dll`。
- `websockets` 安装后可被内置 Python 正常 import。
