# 2026-01-09 MCP Agent 端口与 RenderDoc 绑定自检

## 背景
- MCP Agent 报错包含端口占用（WinError 10048）与 RenderDoc bindings 缺失，且窗口闪退影响排查。

## 变更
- `runtime/agent/start_mcp_agent.cmd`
  - 启动前检查 MCP 端口是否被占用，若占用则提示并暂停窗口。
  - 启动前检查 RenderDoc bindings，若缺失提示 `RENDERDOC_PYTHON_PATH` 配置，并说明仓库 `rdc` 路径不含 `renderdoc.pyd`。

## 验证建议
- 双击 `start_mcp_agent.cmd`，若端口占用应提示并等待；若 bindings 缺失应输出明确警告。

## 回滚
- 回退 `runtime/agent/start_mcp_agent.cmd` 本次改动即可。
