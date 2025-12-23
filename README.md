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
3. 复制配置文件：
   - `config/openrouter.example.json` → `config/openrouter.json`，填入自己的 `apiKey`。
4. 双击运行：`scripts/start_debug_agent.bat`。
5. 打开浏览器：`http://localhost:3000`，上传 `.rdc` 后点击“运行智能诊断”。

## 手动启动
### 1) MCP Agent
```bash
python -m agent
```

### 2) Orchestrator
```bash
cd orchestrator
npm install
node server.js
```

### 3) Frontend
```bash
cd frontend
npm install
npm run start
```

可选：执行一次冒烟测试（需要设置 `RENDERDOC_CAPTURE`）
```bash
python -m agent.smoke_test
```

## 配置说明
- `config/openrouter.json`
  - `apiKey`: OpenRouter API Key
  - `plannerModel`: 规划模型（默认 `gpt-4o-mini`）
  - `explainerModel`: 解释模型（默认 `gpt-4o`）

- 环境变量（可替代或补充配置文件）：
  - `OPENROUTER_API_KEY`, `PLANNER_MODEL`, `EXPLAINER_MODEL`
  - `RENDERDOC_PYTHON_PATH`, `RENDERDOC_CAPTURE`
  - `MCP_HOST`, `MCP_PORT`, `ORCH_PORT`

## HTTP / MCP 接口
### Orchestrator HTTP
- `POST /upload-capture?name=xxx.rdc`：上传 `.rdc`，返回 `capturePath`。
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
- `agent/`：RenderDoc MCP 工具与本地服务。
- `orchestrator/`：OpenRouter 调度与 HTTP 入口。
- `frontend/`：调试面板 UI。
- `docs/`：架构、SOP、Prompt 与 API 文档。
- `captures/`：上传的 `.rdc`（运行时生成）。
- `rdc/`：上游 RenderDoc 源码（只读，不在本项目中修改）。

## 注意事项
- 不要提交真实 API Key；`config/openrouter.json` 已被 `.gitignore` 忽略。
- RenderDoc capture 必须支持 Local Replay，否则 MCP 工具会返回错误。

本项目采用 MIT License。
