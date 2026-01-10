# 2026-01-09 RenderDoc bindings 自动探测

## 背景
- MCP Agent 报错显示 `renderdoc` 模块缺失，需要设置 `RENDERDOC_PYTHON_PATH`。
- 仓库 `rdc` 目录内未直接包含 `renderdoc.pyd`，需要从编译输出中定位。

## 变更
- `runtime/agent/start_mcp_agent.cmd`
  - 若未设置 `RENDERDOC_PYTHON_PATH`，自动在 `rdc/build/*` 与 `rdc/**/renderdoc.pyd` 中搜索并设置。
  - 若未找到，输出明确警告。

## 验证建议
- 运行 `runtime/agent/start_mcp_agent.cmd`，查看是否打印 `[OK] RENDERDOC_PYTHON_PATH=...`。

## 回滚
- 回退 `runtime/agent/start_mcp_agent.cmd` 本次改动即可。
