# 2026-01-01 - Config 迁移与 Settings 持久化

---
id: mem_20260101_config_relocate_settings_env
date: 2026-01-01
status: final
tags:
  - area:orchestrator
  - area:frontend
  - area:docs
  - type:refactor
related_plan: agent-workbench/plans/active/2026-01-01_config_relocate_openrouter_env.md
working_set:
  - runtime/orchestrator/server.js
  - runtime/frontend/src/DebugPanel.tsx
  - runtime/config/models.json
  - README.md
  - docs/api/spec.md
  - .gitignore
  - config/openrouter.example.json (deleted)
  - config/models.json (moved)
api_changes:
  - endpoint: GET /settings
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: PUT /settings
    change: added
    doc_updated: docs/api/spec.md
  - endpoint: POST /nl-debug
    change: changed
    doc_updated: docs/api/spec.md
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: node runtime/orchestrator/server.js
    expected: 读取 runtime/config/.env 并提供 /settings
  - command: npm run dev
    expected: Settings 保存后重启前端仍可读取模型默认值
---

## 背景
- `config/` 迁到 `runtime/config/`，OpenRouter Key 从前端 localStorage 改为后端 `.env` 持久化。

## 变更摘要
### Added
- `/settings` 接口，保存/读取 Key 状态与模型默认值。
- `runtime/config/.env` 读写支持（不返回明文 Key）。

### Changed
- `models.json` 迁移到 `runtime/config/`。
- Settings 不再使用 localStorage 保存 API Key；请求默认使用后端保存的 Key。

### Removed
- `config/openrouter.example.json`。
