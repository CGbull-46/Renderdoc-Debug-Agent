# 工作流与状态机（Version: 0.1）

## 状态定义
- **planning**：等待/生成 Action Chain。
- **executing**：依次执行 Planner 生成的工具调用；失败时回到 planning 并附带错误上下文。
- **explaining**：Explainer 根据执行结果生成分析报告与后续请求。
- **completed**：任务结束，可附带可视化/纹理导出路径。

## 消息协议（MCP 兼容）
- `task_request`：来自 UI/用户，包含自由文本任务。
- `execute_plan`：Orchestrator → Agent，载荷为 `{name, arguments}[]`。
- `execution_result`：Agent → Orchestrator，包含工具输出或错误。
- `data_request`：Explainer/Verifier 需要更多证据时发送。
- `task_complete`：完成并附带报告、可选多模态附件列表。

## 本地 Agent 入口
使用 `RenderdocDebugAgent.run_mcp_server_sync()` 在本地启动 WebSocket 服务。Orchestrator 只需实现一个反向连接客户端即可与之通信，避免本地暴露公网端口。

## 可靠性建议
- 每次工具执行前校验 `capture_path` 是否存在，并在错误消息中返回用户可操作的提示（如“请安装 RenderDoc 并设置 RENDERDOC_PYTHON_PATH”）。
- 对 `save_texture` 结果生成哈希或文件大小，便于多模态模型引用与缓存。
- 日志写入 `logs/` 目录（未包含在仓库中），便于追踪模型决策过程。
