# 变更日志（Memory）

本文件作为仓库的唯一“增量记忆”入口：**后续每次迭代只追加新条目，不再新增按日期拆分的 changelog 文件**。

约定：
- 追加新条目时使用日期标题：`## YYYY-MM-DD - <主题>`
- 优先按 `Added / Changed / Fixed / Notes` 组织
- 保持 UTF-8 编码；避免在仓库内写入任何 API Key/Token

---

## 2025-12-30 - 文档重构 + 前端可运行闭环

### Added
- `docs/` 目录分层：新增 `docs/arch/`、`docs/api/`、`docs/guides/` 等结构，并通过 `docs/README.md` 作为导航入口。
- Orchestrator HTTP：补充 `GET /health`、`GET /models`；`POST /nl-debug` 返回结构化的 `Submission/Message` 以供前端渲染。
- Agent MCP 工具：新增 `get_pipeline_state`，用于向 Canvas 提供帧缓冲附件信息（高亮 stage/提示）。
- 规划文档：新增 `docs/agent/plans/sidebar_projects_and_settings_models_plan.md`，用于后续 Sidebar/Projects 与 Settings/Models 的迭代实现。

### Changed
- 文档路径统一与引用更新：
  - `arch.md` → `docs/arch/overview.md`
  - `api_spec.md` → `docs/api/spec.md`
  - `sop.md` → `docs/guides/debug_sop.md`
  - `workflows.md` → `docs/guides/workflows.md`
  - `tasks.md` → `docs/agent/internal/tasks.md`
- 前端技术栈：迁移至 Vite + Tailwind，并按 Obsidian Dark 主题重做 App Shell（Sidebar / Diagnostic Feed / Canvas）。
- 启动脚本：`start_debug_agent.bat` 默认仅启动前端预览（更适合新手先看到 UI）。

### Fixed
- Windows 启动脚本闪退：
  - 修复 `start_debug_agent.bat` 在 `if (...)` 多层括号中触发的 cmd 解析错误（`... was unexpected at this time.`）。
  - 修复 `call "npm"` 导致 npm 在错误目录解析自身安装路径、进而报 `MODULE_NOT_FOUND` 的问题；对 `npm` 与带空格路径的 `npm.cmd` 分别采用安全调用方式。
- 前端构建报错：
  - 修复 Tailwind/PostCSS 配置在 CJS/ESM 兼容性上的加载问题（避免 `postcss Cannot read properties of undefined (reading 'call')`）。
  - 布局改为桌面端全屏铺满、三栏等高；同时保持小屏自动堆叠。
  - 增加桌面端三栏可拖拽分隔条：Sidebar（10%–15%）/Diagnostic Feed（15%–25%）/Canvas（占剩余空间），随浏览器缩放自适应。

### Notes
- `vite` 提示 “CJS build deprecate” 属于上游告警，不影响当前 MVP 运行；后续可在不破坏本地可运行的前提下再升级处理。
- 本仓库安全边界保持：服务默认仅监听 `127.0.0.1`；仓库内不提交任何 Key/Token。
