# 2026-01-10 - Bundled Python runtime bootstrap for MCP Agent

## Context
- RenderDoc bindings (`thirdparty/renderdoc/renderdoc.pyd`) 依赖 `python36.dll`，而系统 Python 为 3.14，导致 `import renderdoc` 失败。
- 用户已在 `thirdparty/` 下准备 Python 目录，希望 MCP Agent 默认使用内置 Python，避免依赖系统安装。

## Changes
- `start_mcp_agent.cmd`
  - 优先探测并使用 `thirdparty/python` 下的 `python.exe`（递归查找），否则回退系统 `python/py`。
  - 修复 cmd 里 `for /f` 调用 Python 的引号解析问题：改为重定向到临时文件读取输出，避免 ABI 探测出现 `unknown`。
  - 对 embeddable Python：自动补齐 `pythonXX._pth` 的 `import site` 与 `Lib\\site-packages`，并创建 `Lib\\site-packages` 目录。
  - 自动确保 `pip` 可用：优先 `ensurepip`，对 Python 3.6 兜底 `get-pip.py`。
  - `websockets` 安装按运行时范围区分：内置 Python 不使用 `--user`。
- `runtime/agent/mcp_server.py`
  - handler 签名兼容旧版 `websockets` 的 `(websocket, path)` 调用形式。
- `README.md`
  - 说明内置 Python 的目录要求与 `include/` 的用途边界。

## Files
- `runtime/agent/start_mcp_agent.cmd`
- `runtime/agent/mcp_server.py`
- `README.md`

## Verification
- 若内置 Python 完整：MCP Agent 日志应显示 `[OK] Using bundled Python: ...`，且 ABI 显示 `binding=python36.dll, runtime=python36.dll (match)`。
- 若 pip 缺失：脚本应尝试 `ensurepip`/`get-pip`，并最终能 `import websockets`。
