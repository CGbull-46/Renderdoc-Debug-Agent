# 2026-01-10 - RenderDoc bindings Python ABI check

## Context
- MCP Agent 已能定位 `thirdparty/renderdoc`，但 `import renderdoc` 仍提示 bindings not found。
- 根因：`renderdoc.pyd` 依赖 `python36.dll`，与当前 Python 3.14 不匹配。

## Changes
- 启动脚本解析 `renderdoc.pyd` 依赖的 `python3x.dll`。
- 若版本不匹配，尝试切换到 `py -3.6`（可用时）。
- 找不到匹配运行时则提前报错并提示重建 bindings。

## Files
- `runtime/agent/start_mcp_agent.cmd`

## Verification
- 运行 `start_mcp_agent.cmd`：若系统有 Python 3.6，则自动切换并继续启动；否则报错提示需安装匹配版本或重建。
