# 2026-01-11 - 会话归档（完成）：MCP/Orchestrator 联通性验证

## 状态结论（可验证）
- MCP Agent：可在指定端口 `LISTENING`，并可接受最小 WebSocket 连接（客户端可成功 `connect/close`）。
- Orchestrator：`/health` 返回 `200`，且 JSON 内 `mcp.host/port` 与启动参数一致（说明能连到 MCP）。
- ABI probe：日志稳定输出 `binding=python36.dll, runtime=python36.dll (match)`，不再出现 `ABI probe failed` 误报。

## 最小验证步骤（复现用）
1) 启动 MCP Agent（示例端口）：
   - `cmd /c "set MCP_PORT=8792&& runtime\\agent\\start_mcp_agent.cmd"`
   - `netstat -ano | findstr :8792` 应为 `LISTENING`
2) Orchestrator 健康检查：
   - 设置 `MCP_PORT=8793`、`ORCH_PORT=8091` 启动 `runtime/orchestrator/server.js`
   - `Invoke-WebRequest http://127.0.0.1:8091/health` 应返回 `200`

## 关键文件（定位入口）
- `runtime/agent/start_mcp_agent.cmd`
- `start_debug_agent.bat`
- `runtime/orchestrator/server.js`

