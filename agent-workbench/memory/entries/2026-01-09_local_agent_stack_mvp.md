# 2026-01-09 本地 Agent 隐式启动与 MCP 工具文档同步

## 背景
- UI 0.1 已可用，但本地 MCP Agent 未纳入一键启动链路，MVP 闭环不完整。

## 变更
- `start_debug_agent.bat`：新增 Python 检测并自动启动 MCP Agent，与 Orchestrator/Frontend 同步启动。
- `README.md`：更新快速开始与完整配置说明，明确一键脚本覆盖本地 Agent。
- `docs/api/spec.md`：补充 `analyze_nan_inf` 与 `geometry_anomalies` 接口说明。

## 验证建议
- 运行 `start_debug_agent.bat`，确认 MCP Agent/Orchestrator/Frontend 三窗口启动。
- 浏览器打开 `http://localhost:3000`，Settings 中 Health 检查返回 `status: ok`。

## 回滚
- 回退 `start_debug_agent.bat`/`README.md`/`docs/api/spec.md` 到本次改动前版本。
