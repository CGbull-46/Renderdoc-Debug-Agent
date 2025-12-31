# 2025-12-31 — Rename: `coding agent intermediate/` → `agent-workbench/`

---
id: mem_20251231_agent_workbench_rename
date: 2025-12-31
status: final
tags:
  - area:agent
  - area:docs
  - type:refactor
related_plan: ""
working_set:
  - agent-workbench/*
  - AGENTS.md
  - README.md
  - docs/README.md
  - docs/agent/README.md
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: powershell -ExecutionPolicy Bypass -File "agent-workbench/tools/agent_checks.ps1" -Root .
    expected: 输出 All checks passed
---

## 目标
- 将治理目录从带空格且偏“中间产物”语义的命名，统一为更短更通用的 `agent-workbench/`，降低路径引用与命令行操作成本。

## 变更
- 目录重命名：`coding agent intermediate/` → `agent-workbench/`
- 同步更新所有引用（README / docs / AGENTS / templates / 自检脚本 / memory entries）。

## 验收
- `agent-workbench/tools/agent_checks.ps1` 通过。

