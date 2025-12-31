## MCP 封装 RenderDoc Python API 的规划说明（草案）

Version: 0.1

本说明用于指导后续 Codex 自动把 RenderDoc 的 Python API 封装成 MCP 工具，供云端 AI 模型（经 Orchestrator / MCP Server）以结构化方式调用。

### 1. RenderDoc Python API 分布与用法扫描结论

在 `rdc/` 仓库中，和 `renderdoc` / `qrenderdoc` Python API 直接相关的代码集中在：

- `rdc/util/test/rdtest/`：测试基础设施  
  - `capture.py`：通过 `renderdoc` API 进行注入执行、目标控制（`CreateTargetControl`、`ExecuteAndInject`、`TargetControlMessage` 等），管理 capture 生成。  
  - `analyse.py`：围绕 `ReplayController` 封装了打开 capture、抓取 index buffer、PostVS 数据等高层 helper（`open_capture`、`fetch_indices`、`get_vsin_attrs`、`get_postvs_attrs` 等），展示如何用 `CaptureFile`/`ReplayController` 组合操作。  
  - `testcase.py` 等：演示如何在测试里驱动渲染、获取 pipeline state 等。  
- `rdc/util/test/tests/**`：大量 D3D11/D3D12/Vulkan 等具体测试脚本（`VK_*`, `D3D11_*`, `D3D12_*`），广泛调用 `renderdoc` API（例如 `PixelHistory`, `GetMinMax`, `DebugPixel`, `EnumerateCounters`, `FetchCounters` 等）来完成各种 GPU 行为验证。  
- `rdc/docs/python_api/ui_extension_tutorial/__init__.py`：展示 UI extension 脚本如何同时使用 `qrenderdoc` 和 `renderdoc`，尤其是：  
  - 使用 `CaptureContext` 获取当前 action / pipeline state；  
  - 使用 `ReplayController.AsyncInvoke` 执行异步分析任务（例如 `GetMinMax`）；  
  - 演示典型的 “取当前 Render Target → 调用分析 API → 结果回推到 UI” 的流程。  
- `rdc/docs/regenerate_stubs.py`, `rdc/docs/conf.py`, `rdc/docs/python_api/*.rst`：用于文档 / stub 生成，间接反映了 Python API 的结构和命名。

这些文件展示了三类对 MCP 封装最重要的模式：

1. **Capture 生命周期管理**：`OpenCaptureFile → OpenFile → LocalReplaySupport → OpenCapture → ReplayController`。  
2. **分析工具调用**：`PixelHistory`, `GetMinMax`, `EnumerateCounters`/`FetchCounters`, `GetPostVSData`, `GetBufferData`, `DebugPixel` 等。  
3. **运行时上下文获取**：通过 `CaptureContext` / `ReplayController` 拿到当前 action、pipeline state、资源等信息。

### 2. MCP 封装文件放置位置建议

目标：**不修改 RenderDoc 上游源码结构，仅在本项目侧提供 MCP 适配层**，同时让后续升级 RenderDoc 源码时不需要合并冲突。

结论：

- **MCP 适配层应放在 `agent/` 目录内的新子包中，而不是写进 `rdc/` 下**。  
  - 理由 1：`rdc/` 是完整的 RenderDoc upstream 仓库，未来更新时希望保持“可重新 clone / pull”而无需手工合并改动。  
  - 理由 2：`agent/` 已经是 “Local Python Agent + MCP server” 的封装区域（见根目录 `AGENTS.md` 与 `docs/` 设计），把所有和云端 / MCP 协议相关的代码集中在此更清晰。  
  - 理由 3：MCP Server 本身与 RenderDoc 生命周期解耦，它只需要通过 `PYTHONPATH` 找到 `renderdoc` 模块即可，不要求被放入 `rdc` 仓库内部。

推荐结构（后续由 Codex 自动补全实现）：

```text
agent/
  mcp_server.py
  renderdoc_adapter.py
  tools/
    renderdoc_tools.py
  mcp_renderdoc/
    __init__.py
    session.py          # 负责与 renderdoc / qrenderdoc 建立会话、管理 ReplayController
    tools_capture.py    # capture 相关 MCP 工具（打开 .rdc、迭代 actions、保存纹理等）
    tools_analysis.py   # 分析类 MCP 工具（Pixel History、NaN/Inf、几何检查、Counters 等）
    tools_pipeline.py   # pipeline 状态 / 资源相关 MCP 工具（当前 RT、depth、绑定资源查询）
```

其中 `mcp_renderdoc` 将作为 MCP Server 的 “工具实现层”，对上暴露简洁的 Python 函数，对下直接调用 `renderdoc` API 和 `rdc/util/test/rdtest/analyse.py` 这类 helper。

### 3. MCP 视角下的 RenderDoc 能力分层

从 MCP 工具设计角度，把 RenderDoc 能力划分为几层，方便后续按模块实现和注册：

1. **Session / Capture 级别（L1/L2）**
   - 打开 / 关闭 capture：  
     - `open_capture(file_path: str) -> {capture_id, driver, num_frames}`  
     - `close_capture(capture_id: str)`  
   - 管理 Replay 会话：  
     - 内部维护 `{capture_id -> ReplayController}` 映射，必要时支持多 capture 并存。  
   - 遍历 action / drawcall：  
     - `list_actions(capture_id, root_only: bool = False) -> [ {event_id, name, children?} ]`  
     - 封装 `ReplayController.GetRootActions()` 和递归遍历。

2. **像素级分析（L2/L4）**
   - Pixel History：  
     - `get_pixel_history(capture_id, tex_id, x, y) -> history[]`  
     - `clean_pixel_history(history) -> history[]`（剔除未改变颜色的项）  
   - NaN/Inf 分析：  
     - `analyze_nan_inf(history) -> anomalies[]`  
   - Pixel Debug：  
     - `debug_pixel(capture_id, event_id, x, y) -> trace`（可后续扩展为结构化 trace，用于 explainer 模型）。

3. **几何 / 网格分析**
   - PostVS / mesh 数据：  
     - `get_postvs_vertices(capture_id, event_id, stage, mesh_slot) -> vertices[]`  
       - 用 `ReplayController.GetPostVSData` 或 `analyse.get_postvs_attrs` 封装。  
   - 几何异常检测：  
     - `detect_geometry_anomalies(vertices) -> issues[]`（NaN/Inf、超范围、UV 越界等）。

4. **管线状态 / 资源查询**
   - 当前 Render Target / Depth：  
     - `get_current_targets(capture_id, event_id) -> {color_targets, depth_target}`  
   - 资源名称 / 描述：  
     - `get_resource_info(capture_id, resource_id) -> {...}`。

5. **性能计数器 / 统计**
   - `list_gpu_counters(capture_id) -> counters[]`（包装 `EnumerateCounters`）  
   - `fetch_gpu_counters(capture_id, counter_ids, events) -> samples[]`（包装 `FetchCounters`）。

上述能力会映射到 MCP 工具名，例如：

- `renderdoc.open_capture`  
- `renderdoc.list_actions`  
- `renderdoc.get_pixel_history` / `renderdoc.analyze_nan_inf`  
- `renderdoc.get_postvs_vertices` / `renderdoc.detect_geometry_anomalies`  
- `renderdoc.list_gpu_counters` / `renderdoc.fetch_gpu_counters`

### 4. MCP 文件 / 接口设计思路

#### 4.1 MCP 工具声明（JSON/YAML 或 Python schema）

Codex 后续可以在 `runtime/agent/mcp_renderdoc/__init__.py` 中导出一份工具列表，例如（伪代码）：

```python
TOOLS = [
    {
        "name": "renderdoc.open_capture",
        "description": "Open an .rdc capture and create a replay controller session.",
        "parameters": {
            "type": "object",
            "properties": {
                "file_path": {"type": "string", "description": "Path to .rdc capture file."}
            },
            "required": ["file_path"]
        },
        "handler": "mcp_renderdoc.session.open_capture_tool",
    },
    # ...更多工具...
]
```

`mcp_server.py` 中的 MCP server 实现负责：

- 将 OpenRouter / OpenAI 的 `tool_call` 映射到上述 `TOOLS` 里的 handler；  
- 维护 `capture_id` / session 的存储（可用简单的 in‑memory 字典 + LRU）；  
- 把 RenderDoc 原始对象（`ReplayController` 等）屏蔽在 MCP 协议层之下，不直接暴露。

#### 4.2 会话管理与 RenderDoc 绑定

在 `mcp_renderdoc/session.py` 中实现：

- `class RenderDocSessionManager:`  
  - 负责：  
    - `open_capture(file_path) -> capture_id`  
    - `close_capture(capture_id)`  
    - `get_controller(capture_id) -> rd.ReplayController`  
  - 内部使用类似 `rdc/util/test/rdtest/analyse.open_capture` 的逻辑（或复制其精简版）：  
    - `rd.OpenCaptureFile()` → `OpenFile()` → `LocalReplaySupport()` → `OpenCapture()`。  
  - 注意清理：`ReplayController.Shutdown()` / `CaptureFile.Shutdown()`。

### 5. 与现有 `agent` 代码的衔接

当前 `agent/` 下已有：

- `renderdoc_adapter.py`：对 RenderDoc 的 loader / 适配封装；  
- `tools/renderdoc_tools.py`：具体的 RenderDoc 工具集合；  
- `mcp_server.py`：MCP server 实现。

后续自动化改造建议：

1. 在 `renderdoc_adapter.py` 内部，**复用/参考** `rdc/util/test/rdtest/analyse.py` 的 `open_capture` 等逻辑，将其收敛为一个清晰的 Python API（例如 `RenderDocAdapter.open_capture(...)` / `get_pixel_history(...)`）。  
2. 在 `tools/renderdoc_tools.py` 中，基于 adapter 实现高层工具（比如 NaN/Inf 分析、几何异常检测），保持与 `docs/sop.md` 中 SOP 对齐。  
3. 新增 `mcp_renderdoc` 子包，把上述工具映射为 MCP 工具声明 + handler：  
   - MCP handler 只调用 `renderdoc_tools` 和 `renderdoc_adapter`，不直接操作 `rdc/` 源码。  
   - 这样，未来如果 RenderDoc 的 Python API 有变更，只需要在适配层调整，不影响 MCP 接口。

### 6. 后续 Codex 自动化任务建议

为了让下一步的 Codex 运行时能 “机械执行” MCP 封装，建议按以下顺序下发任务：

1. **Task A：创建 `mcp_renderdoc` 包骨架**
   - 在 `runtime/agent/mcp_renderdoc/` 下创建：`__init__.py`, `session.py`, `tools_capture.py`, `tools_analysis.py`, `tools_pipeline.py`。  
   - 在 `session.py` 中定义 `RenderDocSessionManager`，实现最小的 `open_capture` / `close_capture` / `get_controller`。  
2. **Task B：对接现有 `renderdoc_adapter.py`**
   - 梳理 `renderdoc_adapter.py` 中已有的功能，统一改为通过 `RenderDocSessionManager` 获取 `ReplayController`。  
   - 确保 `runtime/agent/tools/renderdoc_tools.py` 只依赖 adapter，不直接依赖 `renderdoc` 模块。  
3. **Task C：定义 MCP 工具清单**
   - 在 `mcp_renderdoc/__init__.py` 中定义 `TOOLS` 列表，覆盖：  
     - `open_capture`, `close_capture`, `list_actions`, `get_pixel_history`, `analyze_nan_inf`, `get_postvs_vertices`, `detect_geometry_anomalies`, `list_gpu_counters`, `fetch_gpu_counters` 等。  
   - 在 `mcp_server.py` 中加载并注册这些 tools。  
4. **Task D：编写最小集成测试脚本**
   - 在 `agent/` 下增加一个简单脚本（例如 `manual_test_mcp_renderdoc.py`），可以：  
     - 直接调用 MCP handler 函数（不通过网络）验证打开 `.rdc`、列出 actions、获取一个像素历史。  
   - 这有助于在真实 LLM 接入前验证封装正确性。

---

本说明文件定位为 Codex 的 “设计锚点”：下一步的自动化代码修改可以只依赖这里描述的结构与命名，不需要再重新扫描 `rdc/` 源码。后续若有设计调整，可以提高 Version 并在文件顶部注明变更摘要。 

