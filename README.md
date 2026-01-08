# RenderDoc Debug Agent

本项目提供一个本地 RenderDoc MCP Agent + 云端 Orchestrator + 前端面板的最小闭环，让你可以用自然语言驱动 GPU 调试，并把结果以可读的方式展示出来。

## 功能概览
- **本地 MCP Agent（Python）**：封装 RenderDoc Python API，提供确定性的工具调用。
- **Cloud Orchestrator（Node.js）**：调用 OpenRouter 的 Planner/Explainer，桥接 MCP WebSocket。
- **前端调试面板（React）**：上传 `.rdc`，发送调试问题，展示解释与结果。

## 快速开始（Windows）
1. 安装依赖：RenderDoc、Python 3.x、Node.js（含 npm）。
2. 确保 RenderDoc Python 绑定可用：
   - 将 RenderDoc 的 `python/` 目录加入 `PYTHONPATH`，或
   - 设置环境变量 `RENDERDOC_PYTHON_PATH`。
3. **快速预览**：双击运行 `start_debug_agent.bat`，自动启动 MCP Agent + Orchestrator + 前端 UI（http://localhost:3000）。
4. **完整配置**（可选，用于 /nl-debug 等功能）：
   - 前端 Settings 填入 OpenRouter API Key 并 Apply（会写入 `runtime/config/.env`），或
   - 手动创建 `runtime/config/.env`，设置 `OPENROUTER_API_KEY`。
   - 如不使用一键脚本，可按下方"手动启动"逐个启动组件。

## 手动启动
### 1) MCP Agent
```bash
python -m runtime.agent
```

### 2) Orchestrator
```bash
cd runtime/orchestrator
npm install
node server.js
```

### 3) Frontend
```bash
cd runtime/frontend
npm install
npm run dev
```

可选：执行一次冒烟测试（需要设置 `RENDERDOC_CAPTURE`）
```bash
python -m runtime.agent.smoke_test
```

## 配置说明
- `runtime/config/.env`
  - `OPENROUTER_API_KEY`: OpenRouter API Key
- `runtime/config/models.json`
  - `models`: 可选模型枚举（含 `id`/`label`/`role`）
  - `defaultPlanner`: 默认 Planner 模型
  - `defaultAction`: 默认 Action 模型

- 环境变量（作为 `.env` 兜底）：
  - `OPENROUTER_API_KEY`, `PLANNER_MODEL`, `EXPLAINER_MODEL`
  - `RENDERDOC_PYTHON_PATH`, `RENDERDOC_CAPTURE`
  - `MCP_HOST`, `MCP_PORT`, `ORCH_PORT`

## HTTP / MCP 接口
### Orchestrator HTTP
- `POST /projects/:id/upload-capture?name=xxx.rdc`：上传 `.rdc` 到指定项目，返回 `capturePath`（项目内相对路径）。
- `POST /nl-debug`：
  ```json
  { "question": "...", "capturePath": "...", "openrouterKey": "(optional)" }
  ```

### MCP WebSocket
请求示例：
```json
{ "id": "1", "tool": "iterate_actions", "arguments": { "capture_path": "path/to/capture.rdc" } }
```
响应包含同样 `id`，并返回 `ok/result` 或 `error`。

## 仓库结构
- `runtime/agent/`：RenderDoc MCP 工具与本地服务（Python）。
- `runtime/orchestrator/`：OpenRouter 调度与 HTTP 入口（Node.js）。
- `runtime/frontend/`：调试面板 UI（React）。
- `docs/`：架构、SOP、Prompt 与 API 文档。
- `projects/`：项目工作区（运行时生成，默认不提交）。
- `rdc/`：上游 RenderDoc 源码（只读，不在本项目中修改）。

## 规划（Plan）
- 当前活跃计划：`agent-workbench/plans/active/`
- 已归档计划：`agent-workbench/plans/archive/`

## 变更日志（Memory）
- 简化摘要：`agent-workbench/memory/SUMMARY.md`
- 详细记录：`agent-workbench/memory/entries/`

## 注意事项
- 不要提交真实 API Key；`runtime/config/.env` 已被 `.gitignore` 忽略。
- RenderDoc capture 必须支持 Local Replay，否则 MCP 工具会返回错误。

本项目采用 MIT License。
