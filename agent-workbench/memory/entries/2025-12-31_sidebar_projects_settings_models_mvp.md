# 2025-12-31 - Sidebar Projects + Settings Models MVP

---
id: mem_20251231_sidebar_projects_settings_models_mvp
date: 2025-12-31
status: final
tags:
  - area:frontend
  - area:orchestrator
  - area:docs
  - type:feature
related_plan: agent-workbench/plans/archive/sidebar_projects_and_settings_models_plan.md
working_set:
  - frontend/src/DebugPanel.tsx
  - frontend/src/types.ts
  - orchestrator/server.js
  - orchestrator/package.json
  - orchestrator/package-lock.json
  - config/models.json
  - docs/api/spec.md
  - README.md
api_changes:
  - endpoint: GET /projects
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: POST /projects
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: POST /projects/import
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: GET /projects/:id
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: POST /projects/:id/upload-capture
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: GET /projects/:id/history
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: PUT /projects/:id/history
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: GET /projects/:id/resources
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: GET /projects/:id/resource
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: GET /models
    change: changed
    doc_updated: docs/api/spec.md
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: node orchestrator/server.js
    expected: HTTP 服务仅监听 127.0.0.1:8080（默认）
  - command: npm run start
    expected: 前端可创建/打开项目、上传 .rdc、读取 resources、设置模型并发起 /nl-debug
---

## 背景
- 为后续调试迭代引入“可复用的本地 Project”概念，并将 Settings 收敛为最小可用的 Key + 模型选择。

## 变更摘要
### Added
- `projects/` 本地工作区（运行时生成，`.gitignore` 忽略）与 Projects API（创建/导入/资源/历史）。
- `config/models.json`：模型枚举配置源（前端通过 `/models` 拉取并渲染下拉）。

### Changed
- Settings 收敛为：OpenRouter API Key、Planner Model、Action Model（仅本地存储，不写仓库）。
- `/nl-debug` 支持携带 `plannerModel`/`actionModel`/`projectId`，并将 submission/message 持久化到项目 `history.json`。

## 关键决策
- Project Folder 由 Orchestrator 管控（仓库根目录 `projects/` 工作区），避免浏览器环境无法安全写用户任意目录的限制。
- 模型枚举由 `config/models.json` 驱动，避免前端硬编码枚举，便于快速迭代。

