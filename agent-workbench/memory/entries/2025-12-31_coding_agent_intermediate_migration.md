# 2025-12-31 - Agent Workbench 目录迁移（原 Coding Agent Intermediate）

---
id: mem_20251231_coding_agent_intermediate_migration
date: 2025-12-31
status: final
tags:
  - area:governance
  - area:docs
  - type:refactor
related_plan: null
working_set:
  - AGENTS.md
  - README.md
  - agent-workbench/
api_changes: []
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: rg -n "agent-workbench" AGENTS.md README.md
    expected: 入口引用路径一致
---

## 背景
- `docs/agent/` 被定义为“项目本身功能上下文工程”，因此将 coding agent 的中间产物（plans/changelog 等）迁移到仓库根目录，避免语义混放。

## 变更摘要
### Changed
- `docs/agent/changelog.md` → `agent-workbench/changelog.md`
- `docs/agent/plans/*` → `agent-workbench/plans/*`
- 更新了 `AGENTS.md` 与根 `README.md` 的引用路径。

## 备注
- 后续进一步演进为 `memory/SUMMARY.md` + `memory/entries/*` 的双层记忆结构（见对应 framework entry）。
