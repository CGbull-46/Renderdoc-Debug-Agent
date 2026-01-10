# 2026-01-11 扩展 MCP 端口回退范围并修复 full stack 启动冲突

## 问题
- MCP Agent 仍报 `MCP port 8765 already in use`，说明 full stack 端口回退范围过窄。
- start_debug_agent.bat 仅探测 8765/8766/8767，三端口全部占用时会继续选 8765 导致失败。

## 修复
- start_debug_agent.bat：端口回退范围扩展到 8765-8785；无可用端口时红色报错并退出。
- start_mcp_agent.cmd：默认端口回退范围同步扩展到 8765-8785；无可用端口时红色报错。

## 验证
- 命令：`cmd /c "set MCP_PORT=& runtime\agent\start_mcp_agent.cmd"`
- 结果：输出 `[OK] MCP port: 8768` 后进入 `[INFO] Starting MCP Agent...`，进程保持运行（超时终止用于非交互验证）。

## 影响/回滚
- 影响：仅启动脚本端口选择逻辑变更。
- 回滚：还原 `start_debug_agent.bat` 与 `runtime/agent/start_mcp_agent.cmd`。
