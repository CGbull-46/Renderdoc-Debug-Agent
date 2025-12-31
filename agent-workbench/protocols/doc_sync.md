# 文档同步协议

目标：降低“实现与文档不一致”的概率，让 coding agent 的改动可复用、可维护。

## 触发条件与同步目标
- 启动方式/端口/ENV 变更 → 必须同步 `README.md`
- HTTP API 变更 → 必须同步 `docs/api/spec.md`
- MCP tools schema 变更 → 必须同步 `runtime/agent/tools/renderdoc_tools.py` 的 `export_schema()` 与相关文档

## 收尾检查
- 在对应 `memory/entries/*` 中勾选“文档同步清单”
