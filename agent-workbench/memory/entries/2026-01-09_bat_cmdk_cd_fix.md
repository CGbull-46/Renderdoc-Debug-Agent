# 2026-01-09 bat 启动 cmd /k 路径修复

## 背景
- MCP Agent / Orchestrator 窗口提示 “... is not recognized as an internal or external command”，说明 cmd /k 里首个命令解析成了路径本身。

## 变更
- `start_debug_agent.bat`
  - 将 `cmd /k` 的首条命令改为 `cd /d "path" && ...`，避免把路径当成命令执行。

## 验证建议
- 双击 `start_debug_agent.bat` 后，MCP Agent 与 Orchestrator 窗口不再出现 “is not recognized...”。
- 浏览器访问 `http://127.0.0.1:8080/models` 返回 JSON。

## 回滚
- 回退 `start_debug_agent.bat` 本次改动即可。
