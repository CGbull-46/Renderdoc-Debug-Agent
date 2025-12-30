# AI 驱动的 RenderDoc 调试架构（Version: 0.1）

本仓库实现了“本地 RenderDoc 工具 + 云端 Planner/Explainer 模型”的双端协作架构，目标是在 Windows/macOS 上以自然语言对话驱动图形调试。核心要素：

- **本地 Agent**（`agent/`）：用 Python 封装 RenderDoc API，暴露为 MCP 工具，确保调试调用具有确定性和可重放性。
- **云端 Orchestrator**：外部组件，负责调用 Planner/Explainer 模型生成 Action Chain，并通过 WebSocket/MCP 让本地 Agent 执行。
- **交互入口**：桌面或 Web UI 只需将用户意图发送给 Orchestrator；模型会自动调用 MCP 工具收集证据、分析并生成解释。

数据流概览：

1. 用户在 UI 中提出自然语言问题（如“导出 G-Buffer 并检查 NaN”）。
2. Planner 模型根据 `agent.runtime.RenderdocDebugAgent.list_mcp_tools()` 提供的 JSON Schema 规划工具调用序列。
3. 本地 Agent 通过 `RenderdocTools.dispatch()` 执行 RenderDoc API 调用（打开捕获、遍历 action 树、查询 Pixel History、保存纹理等）。
4. 执行结果回传给模型进行推理与多模态解释（例如附带导出的纹理图像）。
5. 交互过程通过反向 WebSocket 进行，避免暴露本地端口到公网。

跨平台注意：

- `agent.renderdoc_adapter.load_renderdoc()` 自动搜寻 Windows/macOS/Linux 常见的 Python 绑定路径，可通过 `RENDERDOC_PYTHON_PATH` 强制指定。
- RenderDoc 本身需要支持本地重放；如果捕获或 GPU 不支持，`RenderdocCapture` 会抛出带状态码的错误便于模型处理。

接入指南：

- 在部署前确保安装 RenderDoc 并生成 Python 绑定；Windows 和 macOS 都有官方安装包，Linux 可参考官网编译说明。
- 运行 `RenderdocDebugAgent.run_mcp_server_sync()` 可开启本地 MCP WebSocket 服务，供 Orchestrator/LLM 调用。
- 推荐的模型上下文注入顺序：[docs/api/spec.md](../api/spec.md) → [docs/guides/debug_sop.md](../guides/debug_sop.md) → [docs/guides/workflows.md](../guides/workflows.md) → `docs/agent/prompts/*`。
