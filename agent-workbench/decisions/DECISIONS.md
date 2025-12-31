# Decisions（开发治理决策，只追加）

本文件记录“coding agent 开发治理层”的长期决策，避免反复讨论与推倒重来。

## 2025-12-31 - 将治理/中间产物迁移到 `agent-workbench/`
### Decision
- 将 coding agent 的中间产物（plans、memory、protocols、checklists、tools）从 `docs/agent/` 抽离到仓库根目录 `agent-workbench/`。

### Why
- 避免与项目功能上下文工程（产品/架构文档）混放，降低语义混乱与误改风险。

### Notes
- `AGENTS.md` 保持为硬入口，只保存关键红线与索引。
