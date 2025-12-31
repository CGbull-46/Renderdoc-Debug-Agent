# 2025-12-30 - 文档结构调整 + 前端可运行闭环

---
id: mem_20251230_docs_reorg_frontend_loop
date: 2025-12-30
status: final
tags:
  - area:docs
  - area:frontend
  - area:orchestrator
related_plan: null
working_set:
  - docs/
  - frontend/
  - orchestrator/
api_changes:
  - endpoint: GET /health
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: GET /models
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: POST /nl-debug
    change: changed
    doc_updated: docs/api/spec.md
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: start_debug_agent.bat
    expected: 浏览器打开前端 UI（本机）
---

## 背景
- 目标是形成最小可运行闭环：前端能跑起来并展示 DebugPanel 基本布局，后端提供基础健康检查与模型列表接口，便于后续迭代对接。

## 变更摘要
### Added
- `docs/` 目录分层与 `docs/README.md` 导航入口。
- Orchestrator：`GET /health`、`GET /models`，以及 `POST /nl-debug` 的结构化返回（Submission/Message）。

### Changed
- 前端迁移到 Vite + Tailwind，并重做 App Shell（Sidebar / Diagnostic Feed / Canvas）。
- 启动脚本 `start_debug_agent.bat` 默认只启动前端预览（更适合先看 UI）。

### Fixed
- Windows 启动脚本与前端构建兼容性问题（包含 Tailwind/PostCSS 加载与脚本调用稳定性）。

## 备注
- 这次变更更多是“可运行闭环”的基础设施与 UI 基座，为后续 Projects/Settings/Models 等功能铺路。

