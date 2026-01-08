# 2026-01-09 拆分 MCP/Orchestrator 启动脚本

## 背景
- `start_debug_agent.bat` 中 `cmd /k` 引号解析仍不稳定，导致路径语法错误。

## 变更
- 新增 `runtime/agent/start_mcp_agent.cmd` 与 `runtime/orchestrator/start_orchestrator.cmd`，各自负责切换目录并启动服务。
- `start_debug_agent.bat` 改为 `start` 调用上述脚本，避免复杂的嵌套引号。

## 验证建议
- 双击 `start_debug_agent.bat`，两个新窗口正常启动且不再出现路径语法错误。
- 访问 `http://127.0.0.1:8080/models` 返回 JSON。

## 回滚
- 回退 `start_debug_agent.bat`，删除新增的 `start_*.cmd`。
