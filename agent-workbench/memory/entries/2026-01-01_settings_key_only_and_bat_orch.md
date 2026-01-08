# 2026-01-01 - Settings 仅存 Key + bat 启动 Orchestrator

---
id: mem_20260101_settings_key_only_and_bat_orch
date: 2026-01-01
status: final
tags:
  - area:orchestrator
  - area:frontend
  - area:docs
  - type:fix
related_plan: agent-workbench/plans/active/2026-01-01_config_relocate_openrouter_env.md
working_set:
  - runtime/orchestrator/server.js
  - runtime/frontend/src/DebugPanel.tsx
  - start_debug_agent.bat
  - README.md
  - docs/api/spec.md
  - runtime/config/.env
api_changes:
  - endpoint: GET /settings
    change: changed
    doc_updated: docs/api/spec.md
  - endpoint: PUT /settings
    change: changed
    doc_updated: docs/api/spec.md
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: start_debug_agent.bat
    expected: 同时启动 Orchestrator(8080) + 前端(3000)，Settings 下拉读取 models.json
---

## 背景
- Settings 只需要存 OpenRouter API Key；模型枚举来自 `runtime/config/models.json`。
- 双击 bat 仅启动前端导致 `/models` 失败，Settings 下拉只显示 default。

## 变更摘要
### Added
- `start_debug_agent.bat` 启动 Orchestrator 并检查其依赖。

### Changed
- `/settings` 仅保存 API Key，`runtime/config/.env` 不再写入模型信息。
- 前端 Settings 保存时只提交 API Key，模型选择仅用于当前会话请求。
