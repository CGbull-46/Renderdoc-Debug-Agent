# 2025-12-31 — Runtime 目录重组 & 移除全局 captures 旧接口

---
id: mem_20251231_runtime_dir_and_capture_legacy_removal
date: 2025-12-31
status: final
tags:
  - area:agent
  - area:orchestrator
  - area:frontend
  - area:docs
  - type:refactor
related_plan: ""
working_set:
  - runtime/agent/*
  - runtime/orchestrator/server.js
  - runtime/frontend/*
  - README.md
  - docs/api/spec.md
  - docs/arch/overview.md
  - docs/README.md
  - scripts/start_debug_agent.bat
  - start_debug_agent.bat
  - .gitignore
api_changes:
  - endpoint: POST /upload-capture
    change: removed
    doc_updated: docs/api/spec.md
  - endpoint: GET /captures/*
    change: removed
    doc_updated: docs/api/spec.md
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: python -m runtime.agent
    expected: MCP server 监听在 127.0.0.1:8765（或 MCP_HOST/MCP_PORT 指定）
  - command: cd runtime/orchestrator && npm install && node server.js
    expected: Orchestrator 监听在 127.0.0.1:8080（或 ORCH_PORT 指定）
  - command: cd runtime/frontend && npm install && npm run dev
    expected: 前端 dev server 在 http://localhost:3000
---

## 背景与目标
- 背景：仓库根目录已经区分出了 `agent-workbench/`（治理资产），但核心可运行代码仍分散在顶层 `agent/`、`orchestrator/`、`frontend/`，阅读与定位成本偏高。
- 目标：
  - 把核心可运行组件统一收拢到一个明确的顶层目录（`runtime/`）。
  - 删除“全局 captures 工作区”的旧设计与旧接口，统一以 `projects/<id>/captures/` 作为 `.rdc` 存储位置。

## 变更摘要
### Changed
- 新增 `runtime/` 作为可运行组件聚合目录：
  - `runtime/agent/`（Python MCP Agent）
  - `runtime/orchestrator/`（Node.js Orchestrator）
  - `runtime/frontend/`（React/Vite Frontend）
- 更新启动脚本与文档，匹配新目录结构与新的 `python -m runtime.agent` 入口。

### Removed
- Orchestrator 移除旧接口：
  - `POST /upload-capture`（写入全局 `captures/`）
  - `GET /captures/*`（全局 captures 静态读取）
- `.gitignore` 移除 `/captures/`（避免误导；当前实现不再生成该目录）。

## 兼容性说明
- 旧的 `/upload-capture` 与 `/captures/*` 调用方需要迁移到项目接口：
  - 上传：`POST /projects/:id/upload-capture`
  - 读取：`GET /projects/:id/resource?path=captures/<name>.rdc`

## 验收与验证
- 手动路径检查：README/spec/脚本均指向 `runtime/*`，不再引用全局 `captures/`。
- 最小启动路径（见 runbook）。

