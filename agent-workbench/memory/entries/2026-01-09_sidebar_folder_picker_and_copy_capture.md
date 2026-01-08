# 2026-01-09 Sidebar 目录选择与本地捕获复制

## 背景
- Open/Create Project 需要改为系统目录选择面板。
- Upload .rdc 需要向后端传递本地路径，并通过本地 Agent 复制到项目目录（覆盖同名）。
- Settings 中模型列表需正确读取 `models.json` 并在 UI 中生效。

## 变更
- `runtime/frontend/src/DebugPanel.tsx`
  - Open/Create 改为目录选择（`showDirectoryPicker` 优先，`webkitdirectory` 兜底）。
  - Open 项目走目录导入，Create 项目选目录后显示上传子面板。
  - 上传时若存在 `file.path`，以 JSON `sourcePath` 发送；否则回退为文件流上传。
  - 模型加载逻辑在当前选择不在列表时回落到 `defaultPlanner/defaultAction`。
- `runtime/orchestrator/server.js`
  - `/projects/:id/upload-capture` 支持 JSON `sourcePath`，调用 MCP `copy_capture` 覆盖写入。
  - 新增 CORS 头与 OPTIONS 处理，保障前后端连通。
  - capture 写入改为 upsert，避免重复记录。
- `runtime/agent/tools/renderdoc_tools.py`
  - 新增 `copy_capture` 工具并同步 schema/dispatch。
- `docs/api/spec.md`
  - 补充 `copy_capture` 工具说明与 upload-capture 的 JSON 路径复制说明。

## 验证建议
- 运行前端后点击 Open Project，应弹出系统目录选择面板并可导入项目。
- Create Project 选择目录后上传 `.rdc`，若客户端暴露 `file.path` 应触发本地 Agent 复制。
- Settings 打开后模型下拉显示 `models.json` 内容。

## 回滚
- 回退本次涉及的前端/后端/Agent/文档变更文件即可。
