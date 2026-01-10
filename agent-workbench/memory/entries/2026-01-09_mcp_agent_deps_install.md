# 2026-01-09 MCP Agent 依赖自检与自动安装

## 背景
- MCP Agent 启动闪退，报错显示缺少 `websockets`，且 RenderDoc Python bindings 未找到时会直接退出。

## 变更
- `runtime/agent/start_mcp_agent.cmd`
  - 启动前检查 `websockets`，缺失则自动执行 `pip install --user websockets`。
  - 失败时给出可复制的安装命令并暂停窗口，避免闪退。
  - 启动失败时提示检查 `RENDERDOC_PYTHON_PATH`。

## 验证建议
- 双击 `start_debug_agent.bat` 或直接运行 `runtime/agent/start_mcp_agent.cmd`，应先执行依赖检查，再进入 MCP Agent 运行状态。

## 回滚
- 回退 `runtime/agent/start_mcp_agent.cmd` 本次改动即可。
