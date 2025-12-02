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

### 异常与错误
- 如果无法打开捕获、缺少本地重放或 RenderDoc 模块未找到，将抛出 `CaptureError` 或 `ImportError`。Orchestrator 应向用户反馈友好提示或要求提供新的捕获路径/安装路径。
