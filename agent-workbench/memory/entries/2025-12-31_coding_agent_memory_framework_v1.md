# 2025-12-31 - Coding Agent Memory/Plans 框架 v1

---
id: mem_20251231_coding_agent_memory_framework_v1
date: 2025-12-31
status: final
tags:
  - area:governance
  - area:memory
  - area:plans
  - type:feature
related_plan: null
working_set:
  - agent-workbench/README.md
  - agent-workbench/memory/SUMMARY.md
  - agent-workbench/memory/README.md
  - agent-workbench/memory/entries/_template.md
  - agent-workbench/plans/_template.md
  - agent-workbench/plans/active/
  - agent-workbench/plans/archive/
  - agent-workbench/protocols/*
  - agent-workbench/checklists/*
  - agent-workbench/tools/agent_checks.ps1
api_changes: []
schema_changes: []
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: powershell -ExecutionPolicy Bypass -File "agent-workbench/tools/agent_checks.ps1"
    expected: 输出 All checks passed（若发现疑似 secret/文档疑似乱码标记则失败并提示）
---

## 背景
- 随着迭代增多，单文件 changelog 与无模板的 plans/记忆容易漂移、难检索、难选择性加载。

## 框架要点（v1）
### Memory 双层
- `agent-workbench/memory/SUMMARY.md`：简化摘要（允许 compact）
- `agent-workbench/memory/entries/*`：详细记录（只追加新文件）

### Plan 标准化
- `agent-workbench/plans/_template.md`：可泛化到完全体的 plan 模板（含 Working Set/验收/同步清单）
- `agent-workbench/plans/active/` 与 `agent-workbench/plans/archive/`：将活跃与归档分离

### 协议/清单/自检
- `agent-workbench/protocols/*`：Working Set、memory、doc sync、encoding 等流程协议
- `agent-workbench/checklists/*`：迭代收尾与 API 变更清单
- `agent-workbench/tools/agent_checks.ps1`：简单自检（疑似 secret、文档疑似乱码标记）

## 备注
- 旧的单文件 changelog 已归档为 `agent-workbench/memory/entries/_legacy_changelog_migrated.md`；`agent-workbench/changelog.md` 仅保留跳转说明。
