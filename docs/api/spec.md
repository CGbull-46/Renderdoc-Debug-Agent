# RenderDoc MCP 工具接口规范（Version: 0.1）

以下接口由 `runtime.agent.tools.renderdoc_tools.RenderdocTools` 暴露，供 Planner/Action 通过 MCP 调用。所有返回值均可安全序列化为 JSON。

## iterate_actions
- **描述**：展开指定捕获文件的 action 树，返回扁平列表。
- **参数**：
  - `capture_path` (string, required)：`.rdc` 捕获路径。
- **返回**：`[{ eventId, drawcallId, flags, name }]`

## pixel_history
- **描述**：获取某纹理在像素 (x, y) 处的历史修改，过滤掉未修改颜色的条目。
- **参数**：
  - `capture_path` (string, required)
  - `texture_id` (integer, required)：`ResourceId` 数值。
  - `x`, `y` (integer, required)：像素坐标。
  - `sample` (integer, optional, default=0)：采样索引。
- **返回**：`[{ eventId, preColour: [r,g,b,a], postColour: [r,g,b,a] }]`

## enumerate_counters
- **描述**：枚举 GPU 性能计数器并获取一次性采样结果。
- **参数**：
  - `capture_path` (string, required)
- **返回**：`[{ name, value }]`

## save_texture
- **描述**：将指定纹理导出为 PNG。
- **参数**：
  - `capture_path` (string, required)
  - `resource_id` (integer, required)
  - `output_path` (string, required)：保存路径。
  - `mip` (integer, optional, default=0)
  - `slice` (integer, optional, default=0)
- **返回**：`output_path` 字符串。

## copy_capture
- **描述**：将本地捕获文件复制到目标路径（可覆盖）。
- **参数**：
  - `source_path` (string, required)：源文件路径。
  - `dest_path` (string, required)：目标文件路径。
  - `overwrite` (boolean, optional, default=true)：目标存在时是否覆盖。
- **返回**：`{ sourcePath, destPath, overwritten }`

## analyze_nan_inf
- **描述**：对指定像素的 Pixel History 进行 NaN/Inf 异常分析。
- **参数**：
  - `capture_path` (string, required)
  - `texture_id` (integer, required)：`ResourceId` 数值。
  - `x`, `y` (integer, required)：像素坐标。
  - `sample` (integer, optional, default=0)：采样索引。
- **返回**：`[{ eventId, color: [r,g,b,a] }]`

## geometry_anomalies
- **描述**：检测指定 drawcall 的几何异常（非法位置/UV 越界）。
- **参数**：
  - `capture_path` (string, required)
  - `event_id` (integer, required)
  - `mesh_slot` (integer, optional, default=0)
- **返回**：`[{ index, position?: [x,y,z,w], uv?: [u,v], reason }]`

## get_pipeline_state
- **描述**：汇总指定 drawcall 的帧缓冲附件，便于前端 Canvas 展示。
- **参数**：
  - `capture_path` (string, required)
  - `event_id` (integer, required)
- **返回**：
  ```json
  {
    "highlightStage": "RS" | "IA" | "VS" | "PS" | "OM" | null,
    "warningMessage": "Depth attachment missing; RS highlighted" | null,
    "colorTargets": [{ "index": 0, "resourceId": "123", "name": "RT0" }],
    "depthTarget": { "resourceId": "456", "name": "Depth" }
  }
  ```

### 异常与错误
- 如果无法打开捕获、缺少本地重放或 RenderDoc 模块未找到，将抛出 `CaptureError` 或 `ImportError`。Orchestrator 应向用户反馈友好提示或要求提供新的捕获路径/安装路径。

## Orchestrator HTTP 接口（0.2.0）

### POST /nl-debug
- **入参**：`{ question: string, capturePath: string, openrouterKey?: string, plannerModel?: string, actionModel?: string, projectId?: string }`
- **说明**：未提供 `openrouterKey` 时使用后端配置（`runtime/config/.env` 或环境变量）。
- **返回**：
  ```json
  {
    "planned": { "tool": "iterate_actions", "arguments": { ... } },
    "mcp": { "ok": true, "result": { ... } },
    "explanation": "模型给出的中文解释",
    "submission": {
      "id": "sub-...",
      "timestamp": "ISO8601",
      "title": "与 question 同步",
      "status": "resolved" | "warning" | "processing",
      "pipelineState": { "highlightStage": "RS", "warningMessage": "..." },
      "evidence": { "colorBuffer": null, "depthBuffer": null }
    },
    "message": {
      "id": "msg-...",
      "role": "agent",
      "submissionId": "sub-...",
      "status": "resolved" | "warning" | "processing",
      "steps": [ { "id": "plan", "title": "Planner selected ...", "status": "completed", "logs": [ { "type": "analysis", "content": "..." } ] } ],
      "summary": { "title": "RESOLVED", "description": "中文解释", "tag": "resolved" }
    }
  }
  ```

### POST /projects
- **入参**：`{ name?: string }`
- **返回**：`{ projectId: string }`

### GET /projects
- **返回**：`{ projects: [{ id, name, updatedAt, hasCapture }] }`

### POST /projects/import
- **描述**：导入已有项目文件（`multipart/form-data`，允许 `project.json`/`history.json`/资源文件）
- **返回**：`{ projectId: string }`

### GET /projects/:id
- **返回**：`{ project: { id, name, createdAt, updatedAt, captures } }`

### POST /projects/:id/upload-capture?name=<rdc>
- **描述**：上传 `.rdc` 到项目目录的 `captures/`，支持文件流或 JSON 路径复制。
- **入参**：
  - 直接上传文件流（`Content-Type` 为 `application/octet-stream` 等）。
  - JSON：`{ sourcePath: string }`（后端调用本地 Agent 复制，并覆盖同名文件）。
- **返回**：`{ capturePath: string, copied?: boolean }`（项目内相对路径）

### GET /projects/:id/history
- **返回**：`{ version, submissions, messages }`

### PUT /projects/:id/history
- **入参**：`{ submissions, messages }`
- **返回**：`{ ok: true }`

### GET /projects/:id/resources
- **返回**：`{ resources: [{ path, type, size, updatedAt }] }`

### GET /projects/:id/resource?path=...
- **描述**：读取项目内资源文件（白名单路径）

### GET /health
- **描述**：健康检查，供前端 Settings 模态框测试连通性。
- **返回**：`{ status: 'ok', version: '0.2.0', mcp: { host, port }, models: { planner, explainer } }`

### GET /models
- **描述**：返回可用的 Planner/Action 模型列表。
- **返回**：`{ models: [{ id, label, role }], defaultPlanner: string, defaultAction: string }`

### GET /settings
- **描述**：获取后端已保存的 Key 状态（不返回明文 Key）。
- **返回**：`{ hasApiKey: boolean }`

### PUT /settings
- **描述**：保存 API Key 到 `runtime/config/.env`。
- **入参**：`{ apiKey?: string }`
- **返回**：`{ ok: true, hasApiKey: boolean }`
