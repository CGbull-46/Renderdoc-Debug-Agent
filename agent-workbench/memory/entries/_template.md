# Iteration Memory Entry - Template

> 本文件是“每次迭代的详细记录”模板：只追加新文件，不在旧文件上重写历史。
> 建议复制本模板后重命名为：`YYYY-MM-DD_<topic>__<tags>.md`。

---
id: mem_YYYYMMDD_<topic_slug>
date: YYYY-MM-DD
status: draft | final
tags:
  - area:frontend
  - area:orchestrator
  - area:agent
  - area:docs
  - type:refactor
  - type:bugfix
  - type:feature
related_plan: agent-workbench/plans/active/<plan>.md
working_set:
  - path/to/file.ext
  - path/to/another.ext
api_changes:
  - endpoint: GET /xxx
    change: added | changed | removed
    doc_updated: docs/api/spec.md
schema_changes:
  - file: runtime/agent/tools/renderdoc_tools.py
    export_schema_updated: true
security_notes:
  - checked_no_keys_committed: true
runbook:
  - command: <how to run/test>
    expected: <what to see>
---

## 背景
- 这次迭代要解决的问题是什么？触发原因/用户反馈/阻塞点是什么？

## 目标与范围
### Goals
- 明确列 1–5 个可验证目标

### Out of Scope
- 明确不做什么，避免误解与 scope creep

## 变更摘要（给人快速扫）
### Added
- ...

### Changed
- ...

### Fixed
- ...

### Notes
- ...

## 详细设计与实现记录
### 关键决策（Decision）
- 决策：…
- 备选方案：…
- 为什么选它：…
- 风险：…
- 回滚：…

### 接口/数据变更（如果有）
- API：…
- 数据结构：…
- 兼容性：…

### 代码改动点（按文件/模块）
- `path/to/file.ext`：做了什么，为什么这样做
- `path/to/another.ext`：…

## 验收与验证
- 本地启动步骤：…
- 验收点清单：…
- 结果：通过/未通过（附原因与下一步）

## 文档同步清单（必须写）
- [ ] `README.md`（启动方式/端口/ENV 变更时）
- [ ] `docs/api/spec.md`（接口变更时）
- [ ] `runtime/agent/tools/renderdoc_tools.py export_schema()`（工具 schema 变更时）
- [ ] `agent-workbench/memory/SUMMARY.md`（摘要已追加/必要时已 compact）
- [ ] `agent-workbench/memory/entries/YYYY-MM-DD_*.md`（本次详细记录已新增）

## 后续 TODO
- ...
