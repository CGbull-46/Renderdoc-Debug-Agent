# Plan Template（可泛化到完全体）

> 复制本文件后放入 `agent-workbench/plans/active/`，并按需填写。

---
id: plan_<slug>
status: draft | active | done | archived
date: YYYY-MM-DD
tags:
  - area:frontend
  - area:orchestrator
  - area:agent
  - area:docs
working_set:
  - path/to/file.ext
  - path/to/another.ext
touchpoints:
  - api
  - schema
  - ports
  - env
acceptance:
  - item: <验收点>
    done: false
risks:
  - <风险>
rollback:
  - <回滚策略>
---

## 背景与目标
- 背景（为什么要做）
- 目标（可验证、可验收）

## 范围
### In Scope
- ...

### Out of Scope
- ...

## 约束与前置（治理相关）
- 安全边界：仅 `127.0.0.1`，不写 Key
- Working Set：只改上述文件；如需扩展必须先确认
- 若涉及工具 schema：必须同步 `export_schema()` 与文档

## 设计
- 数据结构（如有）
- API（如有）
- UI（如有）
- 兼容性/迁移（如有）

## 实施步骤（5–7 步）
1) ...
2) ...

## 验收标准
- ...

## 文档同步清单（必须勾选）
- [ ] `README.md`（启动方式/端口/ENV 变更时）
- [ ] 相关 `docs/*`（接口/流程变更时）
- [ ] 相关 schema 导出（工具接口变更时）
- [ ] `agent-workbench/memory/SUMMARY.md` + 新增 `memory/entries/*`
