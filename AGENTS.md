# AGENTS.md

本文件用于指导自动化 Agent/LLM 在本仓库中工作的边界与约定。

## 优先阅读的文档
- 架构与数据流：`docs/arch.md`
- 工具接口：`docs/api_spec.md`
- 调试 SOP：`docs/sop.md`
- 工作流说明：`docs/workflows.md`
- Prompt 模板：`docs/prompts/*`

## 代码修改约束
- **不要修改 `rdc/`**：该目录为上游 RenderDoc 源码，仅作为参考/镜像。
- **MCP 工具保持确定性**：新增/修改工具时同步更新 `agent/tools/renderdoc_tools.py` 的 `export_schema()` 与相关文档。
- **安全边界**：Orchestrator 仅监听本机端口，不开启公网服务；严禁把 API Key 写入仓库。
- **前端最小依赖**：避免引入新的远程资产或复杂依赖，保持本地可运行。

## 文档同步
- 变更启动方式、端口或环境变量时，需同步更新 `README.md`。
- 需要新增流程说明时，优先扩展 `docs/` 内对应模块，而不是把长篇方案放在此文件。
