# Config 迁移与 OpenRouter 设置持久化计划

---
id: plan_config_relocate_openrouter_env
status: done
date: 2026-01-01
tags:
  - area:orchestrator
  - area:frontend
  - area:docs
working_set:
  - config/models.json
  - config/openrouter.example.json
  - runtime/config/models.json
  - runtime/config/.env
  - runtime/orchestrator/server.js
  - runtime/frontend/src/DebugPanel.tsx
  - README.md
  - docs/api/spec.md
  - .gitignore
touchpoints:
  - api
  - env
  - docs
acceptance:
  - item: Orchestrator 能从 `runtime/config/.env` 读取 `OPENROUTER_API_KEY`，且未配置时仍支持环境变量兜底。
    done: true
  - item: 前端 Settings 应用后会调用后端保存 API Key；API Key 不再写入 localStorage。
    done: true
  - item: `/nl-debug` 在未提供 `openrouterKey` 时可使用后端持久化的 Key 正常调用。
    done: true
  - item: `config/` 迁移到 `runtime/config/` 后，README 与 `.gitignore` 的路径说明同步更新。
    done: true
  - item: 删除 `config/openrouter.example.json`，且相关文档不再引用它。
    done: true
risks:
  - 迁移 `config/` 后可能遗留路径引用，导致启动时读不到配置。
  - 把 API Key 透传给前端会有泄露风险，需要明确只返回“是否已保存”的标记。
rollback:
  - 先保留兼容路径读取（旧 `config/`）并在稳定后移除。
  - 前端保留 localStorage 作为临时回退方案（仅在新接口不可用时启用）。
---

## 背景与目标
- 背景：当前 `openrouter.example.json` 已过时，API Key 由前端 localStorage 维护且每次请求透传；用户希望把 Key 持久化到后端配置中。
- 目标：配置集中到 `runtime/config/`，前端设置可写入后端 env 文件，重启后可恢复默认模型与 Key 状态。

## 范围
### In Scope
- 迁移 `config/` → `runtime/config/`（包含 `models.json`）。
- 新增后端配置持久化（env 格式），并在 Orchestrator 启动时读取。
- 前端 Settings 调用后端保存配置，不再写入 localStorage 的 API Key。
- 更新 README/docs/api/spec.md/.gitignore 的路径与接口描述。

### Out of Scope
- RenderDoc MCP 工具行为改动。
- 引入外部依赖或新的远程资产。

## 约束与前置（治理相关）
- 安全边界：仅 `127.0.0.1`，不写 Key 到仓库。
- Working Set：只改上述文件；如需扩展必须先确认。
- 避免新增依赖，优先使用轻量解析实现 `.env` 读写。

## 设计
- 配置目录：迁到 `runtime/config/`，Orchestrator 读取 `runtime/config/models.json` 与 `runtime/config/.env`。
- 配置持久化：
  - 前端 Settings 提交时调用新接口（例如 `PUT /settings`）发送 `{ apiKey?, plannerModel?, actionModel? }`。
  - Orchestrator 写入 `runtime/config/.env`（仅保存非空值；为空表示清除）。
  - 前端启动或打开 Settings 时调用 `GET /settings` 获取 `{ hasApiKey, plannerModel, actionModel }`，不返回明文 Key。
- 请求流程：
  - `/nl-debug` 默认不再依赖 `openrouterKey`，若用户手动输入则仍允许覆盖。
- 兼容策略：读取配置时可短期兼容旧 `config/` 路径，避免迁移失败。

## 实施步骤（5–7 步）
1) 盘点 `config/` 路径引用（Orchestrator/README/docs），确定迁移影响面。
2) Orchestrator 新增 `.env` 读写与 `/settings` API，更新配置加载逻辑与兜底策略。
3) 前端 Settings 改为调用 `/settings` 获取/保存配置；API Key 不落 localStorage。
4) 迁移 `models.json` 到 `runtime/config/`，更新相关读取路径。
5) 删除 `config/openrouter.example.json` 并更新 README/docs/api/spec.md/.gitignore。
6) 自测：启动 Orchestrator + 前端，保存配置后重启页面验证读取。

## 验收标准
- 前端 Settings 保存后生成 `runtime/config/.env`，且重启前端仍能保持模型默认值与“已保存 Key”状态。
- `/nl-debug` 在未传 `openrouterKey` 时可正常调用 OpenRouter。
- README 与 docs/api/spec.md 对配置路径与新接口描述一致。

## 文档同步清单（必须勾选）
- [ ] `README.md`（配置路径/使用方式变更）
- [ ] `docs/api/spec.md`（新增 `/settings` 接口说明）
- [ ] 相关 schema 导出（无）
- [ ] `agent-workbench/memory/SUMMARY.md` + 新增 `memory/entries/*`
