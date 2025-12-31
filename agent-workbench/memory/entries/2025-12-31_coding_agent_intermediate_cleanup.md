# 2025-12-31 — Agent Workbench Migration Cleanup（原 Coding Agent Intermediate）

---
id: mem_20251231_cai_migration_cleanup
date: 2025-12-31
status: final
tags:
  - area:agent
  - area:docs
  - type:refactor
related_plan: ""
working_set:
  - AGENTS.md
  - docs/agent/README.md
  - agent-workbench/memory/SUMMARY.md
  - agent-workbench/memory/entries/2025-12-31_coding_agent_memory_framework_v1.md
  - agent-workbench/tools/agent_checks.ps1
api_changes: []
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: powershell -ExecutionPolicy Bypass -File "agent-workbench/tools/agent_checks.ps1" -Root .
    expected: 输出 All checks passed
---

## 变更摘要
### Changed
- 修正 `docs/agent/README.md` 的定位说明：`docs/agent/` 作为**项目功能文档**；coding agent 的治理资产统一放在 `agent-workbench/`。
- 清理 Memory entry 中易引起误解的占位文本（避免出现连续问号串），配合自检脚本降低“乱码/问号”类回归风险。

## 验收与验证
- 自检：`agent-workbench/tools/agent_checks.ps1` 通过（Secret Scan + Encoding/QuestionMark Scan）。
