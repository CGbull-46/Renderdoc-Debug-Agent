# 2026-01-09 bat 路径尾随反斜杠修复

## 背景
- MCP Agent / Orchestrator 窗口仍提示 “The filename, directory name, or volume label syntax is incorrect.”。
- 原因：`%~dp0` 带尾随反斜杠，`cmd /k "cd /d \"...\\""` 会导致路径解析失败。

## 变更
- `start_debug_agent.bat`
  - 新增 `ROOT_DIR` 变量，移除尾随反斜杠后再用于 `cd /d`。
  - MCP/Orchestrator/Frontend 启动都使用 `ROOT_DIR`。

## 验证建议
- 双击 `start_debug_agent.bat`，两个窗口不再出现路径语法错误。
- 访问 `http://127.0.0.1:8080/models` 返回 JSON。

## 回滚
- 回退 `start_debug_agent.bat` 本次改动即可。
