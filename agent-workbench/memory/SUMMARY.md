# Memory Summary（简化摘要）

用途：coding agent 启动时优先阅读本文件，用于快速决定是否需要加载某些 `entries/*` 以还原上下文。

## 最近变更（可 compact）
- 2026-01-11：修复 ABI probe 正则误报，能够识别 python36.dll 并显示 match。详见 agent-workbench/memory/entries/2026-01-11_fix_abi_probe_regex.md
- 2026-01-11：扩展 MCP 端口回退范围至 8765-8785，full stack 无可用端口时报错并退出。详见 agent-workbench/memory/entries/2026-01-11_fix_mcp_port_range_fullstack.md
- 2026-01-11：修复 MCP 端口占用与错误颜色提示，默认端口自动回退并统一 ERROR 红色输出。详见 agent-workbench/memory/entries/2026-01-11_fix_mcp_agent_port_and_error_color.md
- 2026-01-11：修复 MCP Agent 在 Python 3.6 下的依赖/启动问题（cmd 变量展开、_pth 路径、dataclasses/asyncio.run 兼容），并补充验证记录。详见 agent-workbench/memory/entries/2026-01-11_fix_mcp_agent_py36.md
- 2026-01-11：会话归档（待续），记录未闭环问题与下一步。详见 `agent-workbench/memory/entries/2026-01-11_session_archive.md`
- 2026-01-11：内置 Python 的 pip 缺失时回退系统 pip 安装 websockets，并硬化 ABI 探测。详见 `agent-workbench/memory/entries/2026-01-11_bundled_python_pip_fallback.md`
- 2026-01-11：内置 Python 缺失 `_pth` 时自动生成并设置 PYTHONHOME，避免 ABI 误报 unknown。详见 `agent-workbench/memory/entries/2026-01-11_bundled_python_pth_fix.md`
- 2026-01-11：MCP Agent 固定优先使用 `thirdparty/renderdoc` bindings，并补充 README 说明。详见 `agent-workbench/memory/entries/2026-01-11_prefer_local_renderdoc.md`
- 2026-01-10：MCP Agent 支持内置 Python（thirdparty/python）并自动补齐 pip/site-packages，修复 ABI 探测 unknown。详见 `agent-workbench/memory/entries/2026-01-10_bundled_python_runtime_bootstrap.md`
- 2026-01-10：MCP Agent 优先使用 `thirdparty/python` 的内置 Python，并在 README 说明要求。详见 `agent-workbench/memory/entries/2026-01-10_bundled_python_prefer.md`
- 2026-01-10：ABI 探测改为显式设置 RD_PYD 并由 Python 解析，避免 unknown。详见 `agent-workbench/memory/entries/2026-01-10_mcp_agent_abi_probe_env_fix.md`
- 2026-01-10：ABI 探测改为 PowerShell 解析 renderdoc.pyd，告警统一黄色。详见 `agent-workbench/memory/entries/2026-01-10_mcp_agent_abi_probe_fix_ps.md`
- 2026-01-10：修复 ABI 检测为 unknown 的问题并让警告显示为黄色。详见 `agent-workbench/memory/entries/2026-01-10_mcp_agent_abi_fix_and_warn_color.md`
- 2026-01-10：MCP Agent ABI 检查日志改为始终输出，并追加 import error 细节。详见 `agent-workbench/memory/entries/2026-01-10_mcp_agent_abi_check_always_log.md`
- 2026-01-10：MCP Agent 增加 Python ABI 匹配度日志与黄色警告，并清理 rdc 路径提示。详见 `agent-workbench/memory/entries/2026-01-10_mcp_agent_abi_log_and_path_cleanup.md`
- 2026-01-10：启动时检测 RenderDoc bindings 的 Python ABI，必要时切换到匹配版本或提前报错。详见 `agent-workbench/memory/entries/2026-01-10_renderdoc_python_abi_check.md`
- 2026-01-10：修复 MCP Agent 启动脚本 “batch label” 报错，内联 bindings 探测逻辑。详见 `agent-workbench/memory/entries/2026-01-10_mcp_agent_find_label_fix.md`
- 2026-01-10：优先使用仓库 `thirdparty/renderdoc` 的 RenderDoc bindings，并同步 DLL search path。详见 `agent-workbench/memory/entries/2026-01-10_thirdparty_renderdoc_binding.md`
- 2026-01-09：MCP Agent 启动时自动探测 renderdoc.pyd 并设置 RENDERDOC_PYTHON_PATH。详见 `agent-workbench/memory/entries/2026-01-09_renderdoc_binding_autodetect.md`
- 2026-01-09：MCP Agent 启动前增加端口占用与 RenderDoc bindings 自检提示。详见 `agent-workbench/memory/entries/2026-01-09_mcp_agent_port_and_binding_check.md`
- 2026-01-09：MCP Agent 启动时自检并自动安装 websockets，失败时保留窗口提示。详见 `agent-workbench/memory/entries/2026-01-09_mcp_agent_deps_install.md`
- 2026-01-09：MCP Agent 启动参数解析修复，脚本内部自行探测 python。详见 `agent-workbench/memory/entries/2026-01-09_mcp_agent_start_args_fix.md`
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
