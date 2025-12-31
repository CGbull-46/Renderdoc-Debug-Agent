# Working Set 协议

目标：让 coding agent 在改动范围上可控、可追溯、可协作。

## 定义
- Working Set = 本次任务**允许修改/新增**的文件集合。
- 默认：只允许修改用户明确指定的文件；需要扩展必须先征求确认或使用 `#codebase`。

## 任务开始时（必须）
- 在对话或 plan 的 `working_set` 字段列出将要修改的文件。
- 若不确定影响面：先做 `#codebase` 发现，再确认 Working Set。

## 执行中（扩展 Working Set）
- 当发现需要改动未在 Working Set 的文件时：
  1) 说明原因（阻塞/一致性/同步要求）
  2) 请求用户确认将文件加入 Working Set（或使用 `#codebase`）
  3) 记录到对应 `memory/entries/*` 的 `working_set` 中

## 收尾（必须）
- `memory/entries/*` 中的 `working_set` 必须反映**真实修改**的文件列表。

