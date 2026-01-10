# 2026-01-09 MCP Agent 启动参数解析修复

## 背景
- MCP Agent 窗口报错：`"...start_mcp_agent.cmd" "python" "" is not recognized...`。
- 原因：`start` 将带引号的参数组合成单条命令，导致 cmd 识别失败。

## 变更
- `start_debug_agent.bat`：不再向 `start_mcp_agent.cmd` 传入参数，仅设置工作目录。
- `runtime/agent/start_mcp_agent.cmd`：脚本内部自行探测 `python/py`，避免外部参数拼接。

## 验证建议
- 双击 `start_debug_agent.bat`，MCP Agent 窗口不再出现 “is not recognized...”
- MCP Agent 正常运行后，Orchestrator 可连接到 MCP。

## 回滚
- 回退 `start_debug_agent.bat` 与 `runtime/agent/start_mcp_agent.cmd` 本次改动即可。
