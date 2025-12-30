# Agent 文档入口

本目录用于存放 **coding agent 专用** 的材料（人类不需要日常阅读）。目标是把“给人看的 docs”与“给 agent 用的说明/约束/记忆/计划”明确分离，降低仓库认知负担。

## 目录约定
- `changelog.md`：增量变更记忆（append-only），后续每次迭代只追加条目。
- `plans/`：迭代计划（先出 Plan 再实现），可以按主题逐个文件累积。
- `prompts/`：Planner/Explainer 的 Prompt 模板（如需要注入上下文或对齐输出格式）。
- `internal/`：研究/草案/任务清单等（不保证对最终产品用户友好，但对 agent 排查/实现有帮助）。

## 对外（人类）文档在哪里？
请从 `docs/README.md` 开始阅读（架构、API、指南等）。

