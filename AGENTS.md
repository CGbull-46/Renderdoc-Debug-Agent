# AGENTS.md

本文件用于指导自动化 Agent/LLM 在本仓库中工作的边界与约定。
本文件**仅面向 coding agent**；给人类读者的文档请从 `docs/README.md` 开始。

## 与用户的交流限制
- 自然语言描述的内容，需要用中文输出（包括思维链和对话窗口的内容），但专业名词需要保持英文。
- 表达风格尽量技术化、可验证、可复现：优先给出可检验假设、验证方法与回滚条件，避免空泛建议。
- 对实现类输出建议采用固定结构：问题重构（含量化指标/假设）→ 模块调研摘要（关键文件+数据流/控制流+默认行为/knobs）→ Step-by-Step 计划（每步含验证）→ 总结（≤3 行 + 修改/引用索引）。

## 优先阅读的文档
- coding agent 入口：`agent-workbench/README.md`
- 简化摘要（近期改动）：`agent-workbench/memory/SUMMARY.md`（必要时可 compact）
- 架构与数据流：[docs/arch/overview.md](docs/arch/overview.md)
- 工具接口：[docs/api/spec.md](docs/api/spec.md)
- 调试 SOP：[docs/guides/debug_sop.md](docs/guides/debug_sop.md)
- 工作流说明：[docs/guides/workflows.md](docs/guides/workflows.md)
- 产品 Prompt 模板（用于理解/复用）：`docs/agent/prompts/*`
- 规划文档：`agent-workbench/plans/active/*`（当前活跃）
- 详细记忆（按需加载）：`agent-workbench/memory/entries/*`

## 代码修改约束
- **不要修改 `rdc/`**：该目录为上游 RenderDoc 源码，仅作为参考/镜像。
- **MCP 工具保持确定性**：新增/修改工具时同步更新 `runtime/agent/tools/renderdoc_tools.py` 的 `export_schema()` 与相关文档。
- **安全边界**：Orchestrator 仅监听本机端口，不开启公网服务；严禁把 API Key 写入仓库。
- **前端最小依赖**：避免引入新的远程资产或复杂依赖，保持本地可运行。

## 文档同步
- 变更启动方式、端口或环境变量时，需同步更新 `README.md`。
- 需要新增流程说明时，优先扩展 `docs/` 内对应模块，而不是把长篇方案放在此文件。
- 每次迭代完成后：
  - 新增一份详细记录：`agent-workbench/memory/entries/YYYY-MM-DD_*.md`（只追加新文件）
  - 更新简化摘要：`agent-workbench/memory/SUMMARY.md`（必要时 compact）

## 编码与文本处理注意事项（PowerShell）
- 避免在 Windows PowerShell 中用管道把脚本/文本直接喂给外部程序（例如 `@'... '@ | python -`）去改中文文档：管道会按当前 code page 转码，无法表示的字符可能被替换成 `?`，导致文档内容“变问号”。
- 必须用脚本批量改文件时，优先选择**明确指定 UTF-8** 的方式：
  - 直接用 `python -c` 读取/写入，并在 `open(..., encoding='utf-8')` 中显式指定编码；或
  - 在 PowerShell 侧用 `Set-Content -Encoding utf8` / `Out-File -Encoding utf8` 写回；必要时先设置 `$OutputEncoding` 为 UTF-8 再做管道操作。

## 工作方式（Agent/LLM）
- **先读再改**：在**新对话开启或任务上下文不明确时**，优先查阅 `agent-workbench/README.md` 与 `agent-workbench/memory/SUMMARY.md` 的近期摘要，并按需回看 `docs/*`，确保不与架构/接口约定冲突。在连续对话中，已掌握上下文后无需重复读取。
- **先重构再动手（Refinement）**：将模糊描述重构为精确工程问题：**核心技术点**（一句话）+ **现象量化**（指标/当前值/目标值）+ **可验证假设**（1～3 条，可用 log/trace/metrics/repro case 验证），并明确影响范围与成功判据。
- **先 Survey 再提问（Module Survey）**：若问题暗示具体模块（如 Auth/DB/Cache/Queue/UI Rendering/Build/Observability），先做最小化的代码/配置检索并输出调研摘要：关键组件/文件（含命名/目录线索）、数据流与控制流（含同步/异步、事务/幂等/重试边界）、默认行为快照（输入/输出、失败模式、Top 3 knobs/参数）；信息不足时先给出“最小可行检索清单”（≤10 个关键词/典型目录/命名模式）；完成后再提出澄清问题与改动建议。
- **结构分离**：`docs/`（含 `docs/agent/`）属于**项目本身**的功能/架构/接口文档；`agent-workbench/` 用于**coding agent 开发治理**（计划/记忆/协议/清单等）。避免把治理资产混放进 `docs/`（尤其是 `docs/agent/`）。
- **计划与执行（Plan & Execution）**：输出 Step-by-Step 实施计划，每步包含“改哪里/怎么改/如何验证”；默认优先 **MVP**（最小改动/快速止血），避免无关重构与大范围格式化，并按需补充 **Enhanced**（结构性改进/长期收益）；输出代码/配置前先写清改动动机，并按需声明性能/可靠性/安全约束（如 `p95/p99 latency`、backpressure、idempotency、secret/PII logging、XSS/CSRF/CSP/JWT 等）与灰度/回滚条件；如用户要求交付建议，补充 branch/commit 拆分、canary/feature flag、回滚与迁移策略（如 `expand/contract`）。
- **收尾（Conclusion）**：以独立“总结”结束（中文 ≤3 行），并列出“修改/引用索引清单”（按本仓库模块分组，便于快速定位）。
- **不确定先澄清**：当需要改动的文件不明确或涉及跨模块决策时，先向用户确认范围与目标。

## 工作集（Working Set）与改动范围
- **全工程目录可以修改任意文件**。但注意这不意味着可以随意大改，只是我懒得频繁授权而已。
- **新增文件允许**（在仓库目录下），但应说明新增原因，并保持依赖最小化。

## MCP 工具确定性细则（补充）
- 工具行为应**可复现**：避免使用不稳定的随机性/时间依赖输出；如必须使用，需提供可配置且默认固定的种子或确定性策略。
- 工具接口应**清晰报错**：返回结构化错误信息（含错误码/原因/可行动建议），避免吞错或仅打印日志。
- 任何对工具输入/输出 schema 的变更：必须同步更新
  - `runtime/agent/tools/renderdoc_tools.py` 中的 `export_schema()`
  - 相关接口文档（通常是 `docs/api_spec.md` 或对应模块文档）
- 保持**本机安全边界**：工具/服务端默认只绑定 `127.0.0.1`，不引入公网监听的默认配置。

## 自检与验收（改动后最低要求）
- 能在本地按既有方式启动（未改变启动方式时不应引入额外步骤）。
- 若涉及端口/环境变量/启动参数：已同步 `README.md`，且默认仍为本机监听。
- 不在仓库中引入任何密钥、Token、私有地址；日志与示例配置中也不应包含敏感信息。
- 若涉及工具接口：schema 与文档已同步，且至少具备一个最小可运行调用路径说明（放在对应 `docs/*` 中）。
