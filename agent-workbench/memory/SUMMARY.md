# Memory Summary（简化摘要）

用途：coding agent 启动时优先阅读本文件，用于快速决定是否需要加载某些 `entries/*` 以还原上下文。

## 最近变更（可 compact）
- 2026-01-09：拆分 MCP/Orchestrator 启动脚本，避免 cmd /k 引号解析错误。详见 `agent-workbench/memory/entries/2026-01-09_bat_start_cmd_split.md`
- 2026-01-09：bat 启动改用 `start /D` 指定工作目录，避免 cmd /k 引号解析错误。详见 `agent-workbench/memory/entries/2026-01-09_bat_start_workdir_fix.md`
- 2026-01-09：修复 bat 路径尾随反斜杠导致的 cd /d 失败。详见 `agent-workbench/memory/entries/2026-01-09_bat_trailing_slash_fix.md`
- 2026-01-09：修复 bat 的 cmd /k 起始命令解析，避免路径被当成命令执行。详见 `agent-workbench/memory/entries/2026-01-09_bat_cmdk_cd_fix.md`
- 2026-01-09：修复 bat 启动脚本引号与 Python 参数解析，避免 MCP/Orchestrator 启动失败。详见 `agent-workbench/memory/entries/2026-01-09_bat_startup_quote_fix.md`
- 2026-01-09：Sidebar 目录选择 + upload-capture 路径复制 + CORS + 模型列表回落修复。详见 `agent-workbench/memory/entries/2026-01-09_sidebar_folder_picker_and_copy_capture.md`
- 2026-01-09：一键启动纳入本地 MCP Agent，补齐快速开始说明并同步 MCP 工具文档。详见 `agent-workbench/memory/entries/2026-01-09_local_agent_stack_mvp.md`
- 2026-01-01：Settings 改为仅保存 API Key，bat 启动 Orchestrator 修复模型下拉默认问题。详见 `agent-workbench/memory/entries/2026-01-01_settings_key_only_and_bat_orch.md`
- 2026-01-01：配置迁移到 `runtime/config/` 并新增 Settings 持久化（`/settings` + `.env`）。详见 `agent-workbench/memory/entries/2026-01-01_config_relocate_settings_env.md`
- 2025-12-31：Sidebar Projects + Settings Models MVP 落地（Projects 工作区、`/projects/*`、模型枚举、UI 对接）。详见 `agent-workbench/memory/entries/2025-12-31_sidebar_projects_settings_models_mvp.md`
- 2025-12-31：将 coding agent 中间产物从 `docs/agent/` 迁移到仓库根目录。详见 `agent-workbench/memory/entries/2025-12-31_coding_agent_intermediate_migration.md`
- 2025-12-31：Memory/Plans 框架 v1（SUMMARY + entries、plan 模板、协议/清单/自检脚本）。详见 `agent-workbench/memory/entries/2025-12-31_coding_agent_memory_framework_v1.md`
- 2025-12-31：迁移收尾（修正 `docs/agent/README.md` 定位、自检脚本跑通）。详见 `agent-workbench/memory/entries/2025-12-31_coding_agent_intermediate_cleanup.md`
- 2025-12-31：治理目录更名：`coding agent intermediate/` → `agent-workbench/`。详见 `agent-workbench/memory/entries/2025-12-31_agent_workbench_rename.md`
- 2025-12-31：Runtime 目录重组（核心代码迁入 `runtime/*`）并移除全局 `captures/` 旧接口。详见 `agent-workbench/memory/entries/2025-12-31_runtime_dir_and_capture_legacy_removal.md`
- 2025-12-30：文档结构调整 + 前端可运行闭环（DebugPanel/health/models/nl-debug 等）。详见 `agent-workbench/memory/entries/2025-12-30_docs_reorg_frontend_loop.md`

## 长期不变的治理要点（尽量少）
- Working Set：默认只改明确指定文件；需要扩展必须先确认或使用 `#codebase`。
- 安全边界：默认仅监听 `127.0.0.1`；严禁把 API Key/Token 写入仓库。
- 上游目录：禁止修改 `rdc/`。
- 编码：避免 PowerShell 管道转码导致中文变 `?`；批量改文档需显式 UTF-8。
