# 2026-01-09 bat 启动脚本引号修复

## 背景
- 双击 `start_debug_agent.bat` 后 MCP Agent / Orchestrator 窗口提示 “The filename, directory name, or volume label syntax is incorrect.”，导致后端未启动。

## 变更
- `start_debug_agent.bat`
  - 调整 `cmd /k` 调用为双引号嵌套写法，避免路径解析错误。
  - 拆分 Python 命令与参数（`PY_CMD`/`PY_ARGS`），避免带空格的命令在新窗口中被错误解析。
  - 修正目录路径拼接为单反斜杠。

## 验证建议
- 双击 `start_debug_agent.bat`，确认 MCP Agent 与 Orchestrator 窗口均能显示正常启动日志。
- 浏览器访问 `http://127.0.0.1:8080/models` 返回 JSON。

## 回滚
- 回退 `start_debug_agent.bat` 本次改动即可。
