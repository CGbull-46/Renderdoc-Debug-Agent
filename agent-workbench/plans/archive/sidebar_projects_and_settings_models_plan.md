# Sidebar Projects & Settings Models - Plan (MVP)

Migrated to `agent-workbench/plans/`.

Status: implemented (archived).
Note: 后续仓库结构已调整，`agent/`、`orchestrator/`、`frontend/` 迁移到 `runtime/*`；本 Plan 内的路径以当时为准，查找代码请以当前目录结构为准。

## 背景与目标
当前前端已具备基础的 DebugPanel（Sidebar / Diagnostic Feed / Canvas）与本机 Orchestrator 交互雏形。下一步希望围绕“可复用的本地调试项目(Project)”与“更贴近实际的模型/Key 设置”做一次可落地的迭代规划，满足：

- 用户可以通过 Sidebar **Open Project / Create Project** 管理本地项目与历史内容（History Content）。
- 用户可以在 Settings 中仅配置 **OpenRouter API Key、Planner Model、Action Model**（Action = 执行/解释模型，命名后续可再统一）。
- 模型枚举可由开发者快速迭代：**由工程目录的配置驱动**，前端读取后以 Enum 下拉展示。
- 所有能力仍保持 **本机安全边界**：仅 `127.0.0.1`，不把 Key 写入仓库。

> 说明：本 Plan 先保证“最小闭环与可实现性”。涉及浏览器对本地文件系统的限制处，会给出兼容策略与折中方案。

## 范围（MVP）
### In Scope
1) Sidebar 项目模式与资源面板
- 顶部两个按钮：`Open Project`、`Create Project`
- 选择/创建项目后显示：
  - 项目状态与路径/名称（不展示敏感绝对路径时提供可替代展示）
  - `Upload File`（仅 Create Project 模式下出现）：只接受 `.rdc`
  - `Resource` 面板：列出 Project Folder 下由 Agent/Orchestrator 产生的文件与资源

2) Settings 精简与模型枚举
- 仅包含：
  - OpenRouter API Key（输入框）
  - Planner Model（Enum 下拉）
  - Action Model（Enum 下拉）
- 模型枚举至少包含：
  - `GPT-5.2`
  - `Gemini 3.0 Pro`
  - `Gemini 3.0 Flash`
  - `Claude Opus 4.5`
  - `Claude Sonnet 4.5`
  - `Qwen 3.0 Max`
  - `Kimi K2`
  - `Grok 4.1`

3) 后端接口草案（Orchestrator）
- 增加“Project 概念”与资源列举/导入/上传的 HTTP 端点（见下文 API 设计）。
- `/models` 接口改为从本地配置读取并返回给前端（已有 `GET /models` 定义，可扩展）。

### Out of Scope（先不做/可选）
- 让浏览器直接把 `.rdc` “拷贝到用户任意选择的真实磁盘目录”。
  - 原因：标准浏览器环境无法安全拿到绝对路径并让后端直接写入用户指定目录（除非引入桌面壳/Electron/Tauri 或额外本机 helper）。
  - MVP 折中：以 Orchestrator 管理的 `projects/` 工作区作为 Project Folder；Open/Import 时将用户选择的项目文件导入该工作区。
- 项目多人协作/远程同步/云端存储。
- 完整的 History 数据版本迁移系统（先做简单版本字段与向后兼容策略）。

## 关键设计决策
### 1) Project Folder 的“可实现”定义（MVP）
由于浏览器限制，MVP 将 Project Folder 定义为：
- **由 Orchestrator 在本地磁盘管理的工作区目录**（例如仓库根目录下 `projects/`，并在 `.gitignore` 中忽略）。
- 用户通过 UI “选择文件夹”时，本质是：
  - **Open Project**：导入一个已有项目文件夹（或选择 `project.json` / `history.json` 等入口文件）到工作区，并激活为当前项目
  - **Create Project**：创建一个新的空项目目录到工作区，并激活为当前项目

这样可以保证：
- 后端可读写该目录，Agent 能使用其中的 `.rdc`、导出资源与日志
- UI 的“Upload（不是上传云端）”语义成立：仅把文件提交给本机后端保存副本

### 2) 模型枚举配置来源：`config/models.json` + `GET /models`
前端无法直接读取仓库根目录配置文件（浏览器沙盒），因此采用：
- 工程内新增配置文件：`config/models.json`（或 `config/models.catalog.json`，命名后续统一）
- Orchestrator 启动时加载该配置，并通过 `GET /models` 返回（已有接口，扩展即可）
- 前端 Settings Modal 在打开时拉取一次 `/models`，渲染 Enum 下拉

优点：
- 开发者更新模型列表只需改配置文件
- 前端不需要重新硬编码枚举

## 数据结构（建议）
### Project 元数据（`project.json`）
```json
{
  "version": 1,
  "id": "proj_2025_12_30_xxxxxx",
  "name": "my_project",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "captures": [
    { "name": "frame.rdc", "path": "captures/frame.rdc", "addedAt": "ISO8601" }
  ]
}
```

### History Content（`history.json`）
- 直接复用 `docs/api/spec.md` 中 `submission` / `message` 的结构（便于后续对接真实 orchestrator 输出）
```json
{
  "version": 1,
  "submissions": [ { "...": "..." } ],
  "messages": [ { "...": "..." } ]
}
```

### Resource 清单（运行时生成 or 动态列举）
资源面板可先通过后端目录扫描得到：
- `captures/*.rdc`
- `exports/**/*`（save_texture 等导出的 PNG）
- `logs/**/*`（Orchestrator/Agent 运行日志）
- `history.json` / `project.json`

## UI 交互（MVP）
### Sidebar 顶部
- `Open Project`
  - 触发：用户选择一个“项目来源”（建议 UI 先用“导入项目文件夹”的语义）
  - 结果：后端创建/更新 `project.json`、导入 `history.json`、导入资源文件（按白名单）
  - UI：加载后刷新 Resource 面板与 Diagnostic Feed（从 `history.json` 恢复）

- `Create Project`
  - 触发：用户选择一个文件夹（MVP 中将其解释为“命名/来源”，最终落盘在工作区）
  - 结果：后端创建新项目目录 + 初始化 `project.json`/`history.json`
  - UI：在按钮下方出现 `Upload File (.rdc)` + 文案提示“仅本机拷贝，供 Agent 使用”

### Upload File（仅 Create Project）
- 限制：只允许 `.rdc`
- 行为：前端把文件以 `multipart/form-data` 提交给后端；后端写入当前项目的 `captures/` 目录
- 成功后：Resource 面板刷新；并把默认 `capturePath` 绑定为该 `.rdc` 的项目内路径（供 `/nl-debug`）

### Resource 面板（两种模式都有）
- 显示：项目内文件树（按分类 Tab 或折叠分组）
- MVP 简化：先用“分组列表”，不做复杂 Tree View
- 点击资源（可选）：
  - 图片资源（PNG）可在右侧 Canvas 预览
  - 文本/JSON（history/project）可弹窗只读预览

## Orchestrator API 设计（草案）
> 仅列出新增/扩展端点；实现时需同步更新 `docs/api/spec.md`。

### Project 管理
- `GET /projects`
  - 返回：项目列表（id/name/updatedAt/hasCapture 等）

- `POST /projects`
  - 入参：`{ name?: string }`
  - 返回：`{ projectId }`

- `POST /projects/import`
  - 目的：导入已有项目（从用户选择的文件夹/文件上传而来）
  - 建议：`multipart/form-data`，允许上传 `project.json/history.json` + 资源文件（白名单）
  - 返回：`{ projectId }`

- `GET /projects/:id`
  - 返回：`project.json` + 关键路径（不暴露敏感绝对路径时用相对路径）

### Capture 上传（替代/扩展现有 `/upload-capture`）
- `POST /projects/:id/upload-capture?name=<rdc>`
  - Body：文件二进制
  - 返回：`{ capturePath }`（项目内相对路径或后端可访问路径）

### History / Resources
- `GET /projects/:id/history`
  - 返回：`{ submissions, messages }`

- `PUT /projects/:id/history`
  - 目的：保存新的 submissions/messages（由 orchestrator 调用后追加写入）

- `GET /projects/:id/resources`
  - 返回：资源列表（含类型、相对路径、大小、更新时间）

- `GET /projects/:id/resource?path=...`
  - 返回：静态文件（只允许项目目录内白名单路径，防止路径穿越）

### Models（扩展现有）
- `GET /models`
  - 返回：`{ models: [{ id, label, role }], defaultPlanner, defaultAction }`
  - 数据来源：`config/models.json`

## Settings（前端行为）
### 字段
- `OpenRouter API Key`：仅写入浏览器本机存储（localStorage 或 IndexedDB），不写入仓库
- `Planner Model`：Enum；默认从 `/models` 的 defaultPlanner
- `Action Model`：Enum；默认从 `/models` 的 defaultAction

### 存储键（建议）
- `openrouter_api_key`
- `planner_model`
- `action_model`
- `active_project_id`

## 里程碑（建议拆分）
1) **Project 概念打通**
   - 后端 `projects/` 工作区 + `project.json/history.json`
   - 前端 Sidebar 两按钮 + Resource 面板基础列表

2) **导入/创建/上传闭环**
   - Create Project -> Upload `.rdc` -> 写入 captures/ -> UI 刷新
   - Open Project -> import history/resources -> 恢复 UI

3) **Settings 精简 + 模型枚举配置化**
   - 新增 `config/models.json`
   - Orchestrator `GET /models` 读取配置
   - 前端 Settings 使用 Enum 下拉并落本机存储

## 验收标准（MVP）
- 双击 `start_debug_agent.bat` 启动前端后：
  - Sidebar 显示 `Open Project` 与 `Create Project`
  - Create Project 后出现 `.rdc` 选择与“本机拷贝”提示
  - 选择 `.rdc` 后 Resource 面板出现该文件，且可用于后续诊断请求
- Settings 中仅有 3 个字段且可持久化到本机存储
- 模型枚举来自后端 `/models`（配置可迭代）
- 不引入任何把 Key 写入仓库的路径；服务仍仅监听 `127.0.0.1`
