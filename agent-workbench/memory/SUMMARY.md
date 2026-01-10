# Memory Summary（简化摘要）

用途：coding agent 启动时优先阅读本文件，用于快速判断是否需要进一步加载 `agent-workbench/memory/entries/*` 还原上下文。

## 最近变更（可按需 compact）
- 2026-01-11：修复 ABI probe 正则误报，可稳定识别 `python36.dll` 并输出 `(match)`；详见 `agent-workbench/memory/entries/2026-01-11_fix_abi_probe_regex.md`
- 2026-01-11：MCP 端口回退范围扩展至 `8765-8785`（MCP Agent 与 full stack launcher），无可用端口时红色报错退出；详见 `agent-workbench/memory/entries/2026-01-11_fix_mcp_port_range_fullstack.md`
- 2026-01-11：修复端口占用报错与 ERROR 颜色，统一关键错误为红色输出；详见 `agent-workbench/memory/entries/2026-01-11_fix_mcp_agent_port_and_error_color.md`
- 2026-01-11：修复 MCP Agent 在 Python 3.6（bundled Python）下的依赖/启动兼容问题（`_pth`、pip fallback、`asyncio.run` fallback 等）；详见 `agent-workbench/memory/entries/2026-01-11_fix_mcp_agent_py36.md`
- 2026-01-11：会话归档（完成）：确认 MCP/Orchestrator 联通性验证路径；详见 `agent-workbench/memory/entries/2026-01-11_session_archive.md`
- 2026-01-10：会话归档：总结 MCP Agent 稳定化的根因、修复面与可复现验证命令；详见 `agent-workbench/memory/entries/2026-01-10_session_archive_mcp_agent_stable.md`

## 长期不变的治理要点
- 工作方式：默认先读 `agent-workbench/README.md` 与本 SUMMARY，再决定是否加载某条 entry。
- 安全边界：Orchestrator 仅监听 `127.0.0.1`；严禁把 API Key/Token 写入仓库（含日志与示例配置）。
- 上游目录：禁止修改 `rdc/`（上游 RenderDoc 镜像/参考）。
- 文本编码：避免 PowerShell 管道导致中文转码；批量写文件时显式使用 UTF-8（必要时带 BOM）。

