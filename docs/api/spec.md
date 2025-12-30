# RenderDoc MCP 工具接口规范（Version: 0.1）

以下接口由 `agent.tools.renderdoc_tools.RenderdocTools` 暴露，供 Planner/Explainer 通过 MCP 调用。所有返回值均可安全序列化为 JSON。

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
- **入参**：`{ question: string, capturePath: string, openrouterKey?: string }`
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

### POST /upload-capture?name=<rdc>
- **描述**：上传 `.rdc` 捕获到 orchestrator 本地 `captures/` 目录。
- **返回**：`{ capturePath: string }`

### GET /health
- **描述**：健康检查，供前端 Settings 模态框测试连通性。
- **返回**：`{ status: 'ok', version: '0.2.0', mcp: { host, port }, models: { planner, explainer } }`

### GET /models
- **描述**：返回可用的 Planner/Explainer 模型列表。
- **返回**：`{ models: [{ id, role }], default: string }`
