# 2026-01-10 - 会话归档：本机 MCP Agent 稳定化与可验证链路

## 问题重构（可验证）
- 现象：运行 `start_debug_agent.bat` 后，MCP Agent 窗口出现启动失败（`pip missing` / `No module named pip` / `MCP port already in use` / `ABI probe failed` 等），并且 ERROR 颜色不一致，影响排障效率。
- 目标：MCP Agent 可稳定启动并监听本机端口；Orchestrator 能通过 WebSocket 连接 MCP；ABI 检测不再误报；关键错误以红色输出。
- 成功判据：
  - `netstat -ano | findstr :<MCP_PORT>` 显示 `LISTENING` 且进程为 `thirdparty/python/python.exe`；
  - 用 bundled Python 执行 `websockets.connect("ws://127.0.0.1:<MCP_PORT>")` 可成功握手；
  - `GET http://127.0.0.1:<ORCH_PORT>/health` 返回 `200` 且 JSON 内 `mcp.port` 与启动端口一致；
  - 日志输出 `RenderDoc Python ABI ... (match)`，不再出现 `ABI probe failed`。

## 根因假设与证据
- bundled Python（3.6 embed）默认布局缺少/未启用 `site-packages`，导致 pip/websockets 依赖链断裂；启动脚本自举逻辑在 pip 缺失时走了错误分支，重复尝试调用 bundled pip 并失败。
- MCP 端口选择回退范围太窄，已有进程占用时易反复失败。
- ABI probe 的 Python fallback 正则写法错误（将 `\\d` 写成字面字符），导致对 `renderdoc.pyd` 的 DLL import 探测匹配不到，产生 false negative。

## 实施摘要（MVP 优先）
- MCP Agent 启动链路：补齐 `_pth`/`site-packages`、依赖自举与 Py3.6 兼容（`asyncio.run` fallback 等），确保 bundled Python 下可启动。
- 端口回退：将 MCP 端口回退范围扩展至 `8765-8785`，无可用端口时明确红色报错退出。
- ABI probe：修复正则以正确识别 `python36.dll` import，日志稳定输出 `binding=python36.dll, runtime=python36.dll (match)`。
- 日志颜色：关键 `[ERROR]` 统一红色输出（cmd fallback 保留）。

## 回归验证命令（可复现）
1) MCP 监听与 WS 握手：
   - `cmd /c "set MCP_PORT=8792&& runtime\\agent\\start_mcp_agent.cmd"`
   - `netstat -ano | findstr :8792`
   - `thirdparty\\python\\python.exe` 运行最小 `websockets.connect("ws://127.0.0.1:8792")` 客户端应成功。
2) Orchestrator 联通：
   - 设置 `MCP_PORT=8793`、`ORCH_PORT=8091` 启动 `runtime/orchestrator/server.js`
   - `Invoke-WebRequest http://127.0.0.1:8091/health` 返回 200。

## 风险与回滚
- 风险：`.rdc` 大文件上传/解析会引入流式落盘、异步任务、超时、清理策略等需求；仍需保持 Orchestrator 仅绑定 `127.0.0.1`。
- 回滚：若出现新的兼容问题，优先回滚启动脚本的依赖自举变更，并保留端口回退与错误颜色增强。

## 下一步（功能迭代方向）
- 现有链路已满足“Frontend 上传 `.rdc` → Orchestrator 落盘 → MCP Tool 调用 RenderDoc Python 解析 → 回传 UI”的实施前提；后续只需补齐上传 API 与工具 schema。

