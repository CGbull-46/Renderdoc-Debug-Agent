# Memory 协议（SUMMARY + entries）

## 文件角色
- `agent-workbench/memory/SUMMARY.md`：简化摘要（可 compact）
- `agent-workbench/memory/entries/*`：详细记录（只追加新文件）

## 写入规则（每次迭代）
1) 新增 1 个 entry 文件（复制模板填充）
2) 在 SUMMARY 追加 1–3 行摘要并链接到该 entry

## compact 规则
- 只 compact SUMMARY，不重写 entries
- compact 后 SUMMARY 仍必须可检索：保留日期/主题/链接/标签
