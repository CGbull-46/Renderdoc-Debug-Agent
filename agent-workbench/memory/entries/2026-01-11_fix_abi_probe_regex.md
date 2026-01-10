# 2026-01-11 修复 RenderDoc ABI probe 误报

## 问题
- MCP Agent 启动时提示 `[WARN] RenderDoc ABI probe failed`，binding 显示 unknown。

## 根因
- start_mcp_agent.cmd 的 Python fallback 正则写成 `python\\d+\\.dll`，在 regex 中等于匹配字面量 `\d`，导致永远匹配失败。

## 修复
- 将 Python fallback 的正则改为 `python\d+\.dll`，结合 `data.lower()` 可匹配 `PYTHON36.dll`。

## 验证
- 命令：`cmd /c "set MCP_PORT=8786&& runtime\agent\start_mcp_agent.cmd"`
- 结果：输出 `binding=python36.dll, runtime=python36.dll (match)`，不再出现 ABI probe failed 警告。

## 影响/回滚
- 影响：仅修正 ABI 探测正则。
- 回滚：还原 `runtime/agent/start_mcp_agent.cmd`。
