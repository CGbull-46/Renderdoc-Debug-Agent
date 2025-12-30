# AGENTS.md

本文件用于指导自动化 Agent/LLM 在本仓库中工作的边界与约定。
本文件**仅面向 coding agent**；给人类读者的文档请从 `docs/README.md` 开始。

## 与用户的交流限制
- 自然语言描述的内容，需要用中文输出（包括思维链和对话窗口的内容），但专业名词需要保持英文。

## 优先阅读的文档
- 变更日志（近期改动）：`docs/agent/changelog.md`（只追加，不新增拆分文件）
- 架构与数据流：[docs/arch/overview.md](docs/arch/overview.md)
- 工具接口：[docs/api/spec.md](docs/api/spec.md)
- 调试 SOP：[docs/guides/debug_sop.md](docs/guides/debug_sop.md)
- 工作流说明：[docs/guides/workflows.md](docs/guides/workflows.md)
- Prompt 模板：`docs/agent/prompts/*`
- 规划文档：`docs/agent/plans/*`

## 代码修改约束
- **不要修改 `rdc/`**：该目录为上游 RenderDoc 源码，仅作为参考/镜像。
- **MCP 工具保持确定性**：新增/修改工具时同步更新 `agent/tools/renderdoc_tools.py` 的 `export_schema()` 与相关文档。
- **安全边界**：Orchestrator 仅监听本机端口，不开启公网服务；严禁把 API Key 写入仓库。
- **前端最小依赖**：避免引入新的远程资产或复杂依赖，保持本地可运行。

## 文档同步
- 变更启动方式、端口或环境变量时，需同步更新 `README.md`。
- 需要新增流程说明时，优先扩展 `docs/` 内对应模块，而不是把长篇方案放在此文件。
- 每次迭代完成后，将变更摘要追加到 `docs/agent/changelog.md`；不要再新建 `docs/changelog/` 或按日期拆分的 changelog 文件。

## 工作方式（Agent/LLM）
- **先读再改**：在**新对话开启或任务上下文不明确时**，优先查阅上面的 `docs/*`（特别是 `docs/agent/changelog.md` 的近期记录），确保不与架构/接口约定冲突。在连续对话中，已掌握上下文后无需重复读取。
- **结构分离**：`docs/` 面向人类；`docs/agent/` 面向 coding agent。避免把 agent-only 的计划/记忆/Prompt 混放在面向人类的文档目录中。
- **小步迭代**：优先选择最小可行改动（MVP），避免无关重构与大范围格式化。
- **不确定先澄清**：当需要改动的文件不明确或涉及跨模块决策时，先向用户确认范围与目标。

## 工作集（Working Set）与改动范围
- **只修改已明确指定的文件**。若需要改动其他现有文件但未被指定，应请求用户将文件加入工作集或使用 `#codebase` 让工具自动发现。
- **新增文件允许**（在仓库目录下），但应说明新增原因，并保持依赖最小化。

## MCP 工具确定性细则（补充）
- 工具行为应**可复现**：避免使用不稳定的随机性/时间依赖输出；如必须使用，需提供可配置且默认固定的种子或确定性策略。
- 工具接口应**清晰报错**：返回结构化错误信息（含错误码/原因/可行动建议），避免吞错或仅打印日志。
- 任何对工具输入/输出 schema 的变更：必须同步更新
  - `agent/tools/renderdoc_tools.py` 中的 `export_schema()`
  - 相关接口文档（通常是 `docs/api_spec.md` 或对应模块文档）
- 保持**本机安全边界**：工具/服务端默认只绑定 `127.0.0.1`，不引入公网监听的默认配置。

## 自检与验收（改动后最低要求）
- 能在本地按既有方式启动（未改变启动方式时不应引入额外步骤）。
- 若涉及端口/环境变量/启动参数：已同步 `README.md`，且默认仍为本机监听。
- 不在仓库中引入任何密钥、Token、私有地址；日志与示例配置中也不应包含敏感信息。
- 若涉及工具接口：schema 与文档已同步，且至少具备一个最小可运行调用路径说明（放在对应 `docs/*` 中）。
