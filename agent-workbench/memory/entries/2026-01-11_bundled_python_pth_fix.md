# 2026-01-11 - Bundled Python layout hardening

## Context
- 用户放入 `thirdparty/python/python.exe` 后仍报 ABI unknown 与 pip 缺失。
- 根因多为 embeddable layout 不完整（缺少 `pythonXX._pth` 或 `pythonXX.zip`），导致标准库/ensurepip 不可用。

## Changes
- 对本地 Python 自动设置 `PYTHONHOME` 并补齐 `PATH`（包含 `x64` 目录）。
- 若缺少 `pythonXX._pth`，自动生成并写入 `pythonXX.zip`、`.`、`Lib\\site-packages`、`import site`。
- 发现缺失 `pythonXX.zip` 时给出黄色警告。
- 修复读取 temp 输出时 `set /p` 为空的情况，避免 ABI 误报 unknown。
- README 补充说明 `_pth` 自动生成行为与推荐目录结构。

## Files
- `runtime/agent/start_mcp_agent.cmd`
- `README.md`

## Verification
- 启动 MCP Agent 时，ABI 能解析到 `python36.dll`，且不再提示 `_pth` 缺失。
