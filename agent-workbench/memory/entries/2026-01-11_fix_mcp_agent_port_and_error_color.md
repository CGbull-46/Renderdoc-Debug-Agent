# 2026-01-11 MCP 端口占用与错误颜色修复

## 问题
- MCP Agent 窗口报错：`MCP port 8765 already in use`，启动失败。
- 日志里的 `[ERROR]` 未按红色提示显示。

## 根因
- start_mcp_agent.cmd 仅在端口占用时报错退出，且错误输出使用普通 echo/黄色提示，缺少红色高亮。
- 当默认端口被占用时缺少自动回退逻辑，导致误判为“agent 本身错误”。

## 修复
- start_mcp_agent.cmd：
  - 默认端口模式下自动挑选可用端口（8765/8766/8767）。
  - 无可用端口时输出红色错误并提示设置 `MCP_PORT`。
  - 统一 `[ERROR]` 输出为红色（PowerShell Write-Host -ForegroundColor Red）。

## 验证
- 命令：`cmd /c "set MCP_PORT=8770&& runtime\agent\start_mcp_agent.cmd"`
- 结果：输出 `[OK] MCP port: 8770` 并进入 `[INFO] Starting MCP Agent...`，进程保持运行（超时终止用于非交互验证）。

## 影响/回滚
- 影响：仅修改 `runtime/agent/start_mcp_agent.cmd` 日志与端口选择逻辑。
- 回滚：还原 `runtime/agent/start_mcp_agent.cmd`。
