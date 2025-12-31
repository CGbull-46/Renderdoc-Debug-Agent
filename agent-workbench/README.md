# Agent Workbench

本目录用于存放 **coding agent 开发治理/中间产物**（计划、记忆、协议、清单、检查脚本），与项目本身的功能/架构文档（`docs/`）分离。

## 必读顺序（新对话/上下文不明确时）
1) `AGENTS.md`（硬约束与安全边界）
2) `agent-workbench/memory/SUMMARY.md`（简化摘要，决定是否加载详细记录）
3) `agent-workbench/plans/active/*`（当前活跃 plan）
4) 按需查阅：
   - `agent-workbench/memory/entries/*`（详细记录，只追加）
   - `agent-workbench/protocols/*`（流程协议/约束细化）
   - `agent-workbench/decisions/DECISIONS.md`（长期决策，只追加）

## 目录结构
- `agent-workbench/memory/`
  - `SUMMARY.md`：全局简化摘要（可 compact，保持短）
  - `entries/`：每次迭代详细记录（只追加新文件）
- `agent-workbench/plans/`
  - `active/`：当前进行中的计划
  - `archive/`：已完成/废弃的计划归档
  - `_template.md`：plan 模板（可泛化到完全体）
- `agent-workbench/protocols/`：开发治理协议（Working Set / memory / doc sync / encoding…）
- `agent-workbench/checklists/`：迭代收尾/接口变更/安全自检清单
- `agent-workbench/tools/`：自检脚本（不依赖网络，输出可复现）

## 写入规则（强约束）
- `memory/entries/*`：**只追加新文件**，不在旧文件上重写历史（除非修正错别字/敏感信息泄漏）。
- `memory/SUMMARY.md`：允许 compact（压缩旧摘要），但必须保留到对应 `entries/*` 的链接。
- `plans/active/*`：每个 plan 必须包含 Working Set、验收标准、文档同步清单。

## compact 规则（摘要变长时）
当 `memory/SUMMARY.md` 变得不“简化”（例如 >200 行或难以 30 秒扫完）：
- 只对 `SUMMARY.md` 做 compact：把旧条目压缩成更短索引；
- `entries/` 永远保留，作为可追溯事实来源。
