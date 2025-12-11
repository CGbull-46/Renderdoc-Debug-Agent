# RenderDoc Debug Agent（本地 RenderDoc 调试智能体）

这是一个 AI 辅助的 RenderDoc 调试工作流，让开发者可以通过自然语言驱动 GPU 调试。项目以 Windows 为主，同时保持 macOS / Linux 友好。

## 提供的能力
- **RenderDoc MCP tooling**：在 `agent/tools/renderdoc_tools.py` 中，使用 Python 封装 RenderDoc API，导出适配 Model Context Protocol（MCP）的 JSON Schema 工具定义。
- **本地 Agent runtime**：`RenderdocDebugAgent` 负责加载 RenderDoc、分发工具调用，并通过一个轻量的 MCP WebSocket server 暴露给上层 Orchestrator / LLM。
- **文档与 Prompts**：`docs/` 目录下包含架构说明（arch）、SOP（sop）、Planner / Explainer 的 System Prompt 模板等，方便注入到大模型上下文中。

## 前置环境
1. 安装 RenderDoc，并确保它的 Python 绑定（`renderdoc` 模块）可用。常见做法：
   - 把 RenderDoc 的 `python/` 目录加到 `PYTHONPATH`，或者  
   - 设置环境变量 `RENDERDOC_PYTHON_PATH` 指向该目录。
2. 安装运行 MCP server 需要的可选依赖：
   ```bash
   pip install websockets
   ```
3. （可选）设置一个默认 capture 用于冒烟测试：
   - 环境变量 `RENDERDOC_CAPTURE` 指向某个 `.rdc` 文件路径。

## 一键体验（适合新手）

面向“完全不想敲命令”的初学者，可以直接用仓库自带的 Windows 启动脚本：

1. 安装前置环境（只需做一次）：
   - 安装 RenderDoc，并按官方文档配置好 Python 绑定（确保 `renderdoc` 模块在 Python 中可导入）。
   - 安装 Python 3.x、Node.js（含 npm）。
   - 在 `config/` 目录下，将 `openrouter.example.json` 复制为 `openrouter.json`，填入自己的 OpenRouter API key：
     ```json
     {
       "apiKey": "sk-xxxx",
       "plannerModel": "gpt-4o-mini",
       "explainerModel": "gpt-4o"
     }
     ```
2. 双击运行 `scripts/start_debug_agent.bat`：
   - 会自动：
     - 启动本地 RenderDoc MCP Agent（Python）。
     - 启动云端 Orchestrator（Node.js + OpenRouter）。
     - 启动前端 React 调试面板。
   - 浏览器会自动打开 `http://localhost:3000`。
3. 在浏览器中使用：
   - 选择一个 `.rdc` 文件（前端会自动上传到 Orchestrator 并返回保存路径，无需手动设置路径或环境变量）。
   - 点击“运行智能诊断”，等待几秒。
   - 页面会显示：
     - AI 对当前 capture 的中文分析建议。
     - 若工具返回像素历史，会显示 Pixel History 表格。
     - Planner 选择的工具和简单思维链。

如果你是高级用户，下面是各个组件的独立启动方式。

## 启动 MCP server（本地 RenderDoc Agent）

在仓库根目录执行：

```bash
python -m agent
```

环境变量：

- `MCP_HOST` – 监听地址（默认 `127.0.0.1`）。
- `MCP_PORT` – 监听端口（默认 `8765`）。

WebSocket 消息格式示例：

```json
{ "id": "1", "tool": "iterate_actions", "arguments": { "capture_path": "path/to/capture.rdc" } }
```

服务端会返回包含相同 `id` 的 JSON 响应，`ok` 字段标记成功与否，`result` 中是 RenderDoc 工具的返回结果。

## 列出工具与本地冒烟测试

查看当前可用的 MCP 工具，并（可选）对一个 capture 做快速测试：

```bash
python -m agent.smoke_test
```

- 若设置了 `RENDERDOC_CAPTURE`，脚本会打开该 capture，调用 `iterate_actions` 并打印前几个 action。  
- 若未设置，则只会打印工具列表，不打开 capture。

## 启动 Cloud Orchestrator（Node.js）

在 `orchestrator/` 目录安装依赖并启动：

```bash
cd orchestrator
npm install ws axios
node server.js
```

需要配置：

- `config/openrouter.json` – OpenRouter API key 与模型配置（可参考 `config/openrouter.example.json`）。

HTTP 调试入口：

```bash
curl -X POST http://localhost:8080/nl-debug ^
  -H "Content-Type: application/json" ^
  -d "{\"question\": \"帮我列出这个capture的actions\", \"capturePath\": \"C:\\\\path\\\\to\\\\capture.rdc\"}"
```

Orchestrator 会：

1. 调用 OpenRouter 的 Planner 模型，选择一个 RenderDoc MCP 工具（如 `iterate_actions` / `enumerate_counters` / `analyze_nan_inf` / `geometry_anomalies`）。  
2. 通过 WebSocket 调用本地 MCP server 执行该工具。  
3. 调用 Explainer 模型生成中文解释，并返回 `{ planned, mcp, explanation }` 三元组。

## 启动前端（React 调试面板）

在 `frontend/` 下构建并运行开发服务器：

```bash
cd frontend
npm install
npm run start
```

前端会在 `http://localhost:3000` 提供一个最小 UI：

- 选择一个 `.rdc` 文件（当前示例仅使用文件名；实际分析路径由 `RENDERDOC_CAPTURE` 或 orchestrator 的 `capturePath` 决定）。  
- 点击“运行智能诊断”按钮，会向 `http://localhost:8080/nl-debug` 发送自然语言调试请求。  
- 页面显示：Explainer 的中文说明、如果返回的是像素历史则渲染 Pixel History 表格，同时展示 Planner 选取的工具和简单思维链。

## 跨平台说明
- Loader 会在常见路径自动查找 RenderDoc Python 绑定：  
  - Windows：`C:\Program Files\RenderDoc\python` 等  
  - macOS：`/Applications/RenderDoc.app/Contents/SharedSupport/python`  
  如路径不一致，可通过 `RENDERDOC_PYTHON_PATH` 覆盖。
- 如果 capture 不支持 Local Replay，本地 Agent 会抛出 `CaptureError`，上层 Orchestrator 可以据此回退或请求新的 capture。

## 仓库结构
- `agent/` – Python 包，包含 MCP 工具实现（`tools/renderdoc_tools.py`）、RenderDoc loader（`renderdoc_adapter.py`）、MCP server（`mcp_server.py`）、runtime 封装（`runtime.py`）以及 MCP tool 描述（`mcp_renderdoc/`）。
- `docs/` – 体系架构文档、API 规范、调试 SOP、工作流说明、Prompt 模板，以及与 RenderDoc 存储/解析相关的分析文档（中文为主，专业名词保持英文）。
- `rdc/` – 上游 RenderDoc 源码 clone / submodule，本项目只读取、不修改，便于后续同步官方更新。

本项目采用 MIT License。
