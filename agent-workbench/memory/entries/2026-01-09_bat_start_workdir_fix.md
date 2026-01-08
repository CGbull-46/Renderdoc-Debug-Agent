# 2026-01-09 bat 使用 start /D 修复工作目录解析

## 背景
- MCP Agent / Orchestrator 窗口仍提示路径语法错误，说明 cmd /k 内部路径解析仍不稳定。

## 变更
- `start_debug_agent.bat`
  - `start` 命令改用 `/D` 指定工作目录，避免在 cmd /k 中嵌套 `cd /d` 引号。

## 验证建议
- 双击 `start_debug_agent.bat`，确认 MCP/Orchestrator 窗口无路径语法错误。
- 访问 `http://127.0.0.1:8080/models` 返回 JSON。

## 回滚
- 回退 `start_debug_agent.bat` 本次改动即可。
