# AI 驱动的图形调试智能体：系统架构与代码实现方案

本方案面向 **下一代辅助图形渲染调试平台** 的设计与实现，目标是在桌面环境中让 AI 像专业图形工程师那样使用 RenderDoc﻿ 进行调试。方案既给出架构设计，又提供可直接使用的代码、配置与工作流。文中所有关键技术概念保持英文，保证读者可以直接映射到对应的 API/库。

## 1 系统架构总览

### 1.1 构建时与运行时的生态位

系统分为 **构建阶段(build‑time)** 和 **运行阶段(run‑time)**：

| 阶段 | 主要活动 | 涉及组件 |
| --- | --- | --- |
| 构建阶段 | 编译前端 React 应用、构建本地 Python Agent、生成文档/Prompt 模板、预配置云端编排器 Docker 镜像 | `frontend/`、`agent/`、`docs/`、`orchestrator/` |
| 运行阶段 | 用户通过桌面应用与 Agent 交互，本地 Agent 读取 RenderDoc 捕获并执行调试逻辑，云端编排器调度 Planner/Explainer 模型，WebSocket 持续保持会话 | Desktop App、Local Python Agent、OpenRouter、Cloud Orchestrator |

- **构建阶段**：开发者需要在本机安装 RenderDoc（从 [renderdoc.org](https://renderdoc.org/) 下载并编译），并生成 Python 绑定；前端使用 `create-react-app` 构建 UI；云端编排器使用 Node.js/Go 实现并容器化。
- **运行阶段**：桌面端提供交互式面板，允许用户加载 `.rdc` 捕获文件，触发分析任务。前端请求被发送给本地 Agent，本地 Agent 使用 RenderDoc Python API 打开捕获并执行 L2/L4 工具，如遍历 action 树、获取 Pixel History、保存纹理等。这些功能在官方文档的示例中有详细用法，例如：
  - 通过 `OpenCaptureFile()`、`OpenFile()`、`LocalReplaySupport()` 和 `OpenCapture()` 打开捕获并初始化 replay controller【652469736104950†L127-L146】。
  - 使用 `GetRootActions()` 遍历 drawcall 树，递归访问 children 属性【652469736104950†L73-L86】。
  - 枚举 GPU 性能计数器并通过 `EnumerateCounters()` 和 `FetchCounters()` 获取数据【747808785890107†L53-L66】。
  - 创建 `TextureSave` 对象并调用 `SaveTexture()` 将渲染目标输出为图像【752170484799808†L106-L151】。

### 1.2 组件与数据流

#### 1.2.1 组件

1. **Desktop App**：包含前端 UI 和一个轻量的本地 HTTP/WebSocket 服务，用于与 Python Agent 通信。用户在 UI 中上传 `.rdc` 文件、查看 Pixel History、NaN/Inf 诊断结果以及 AI 的思维链可视化。
2. **Local Python Agent**：
   - 使用 RenderDoc Python API 执行底层调试任务，暴露一组确定性工具（L2 数据读取、L4 分析推理）。
   - 通过安全的 WebSocket 客户端向云端编排器建立反向连接（不监听公网端口，满足安全限制）。
   - 底层逻辑包含：捕获加载、action 遍历、Pixel History 清洗、NaN/Inf 扩散分析、几何异常检测、几何/纹理导出等。
3. **Cloud Orchestrator**（Node/Go）：
   - 作为控制器，接收来自本地 Agent 的状态/结果消息，负责转发给 OpenRouter 上的 Planner/Explainer 模型。
   - 实现动态模型路由，根据任务类型选择合适的 LLM，例如使用 GPT‑4 Planner 模型规划步骤，使用 Gemini/GPT‑4 Explainer 模型生成解释。
   - 维护任务队列及状态机，驱动 Planner→Executor→Verifier 流程。
4. **OpenRouter**：统一的智能网关，提供多模型接入与工具调用能力，支持 Chat Completion、Tool Calling 等模式【150699301761062†L88-L97】。

#### 1.2.2 数据流闭环

```
                 ┌───────────────┐        ┌──────────────┐
                 │   Desktop UI  │        │ Local Python │
                 │   (React)     │        │    Agent     │
                 └──────┬────────┘        └──────┬───────┘
                        │   WebSocket             │
                        │   (localhost)           │
                        ▼                          ▼
               ┌────────────────┐        ┌────────────────┐
               │   Cloud        │        │RenderDoc API   │
               │ Orchestrator   │        └────────────────┘
               └──────┬─────────┘                ▲
                      │                         │
                      │HTTP/WebSocket           │
                      ▼                         │
                 ┌──────────────┐               │
                 │  OpenRouter  │───────────────┘
                 └──────────────┘
```

1. **用户交互**：用户在桌面应用上传捕获文件并选择调试任务（如 NaN 诊断）。
2. **本地处理**：前端通过本地 WebSocket 与 Python Agent 通信，请求其执行数据读取（L2）。Agent 打开 `.rdc` 捕获并提取必要数据，初步分析后返回本地结果（例如 Pixel History 列表）。
3. **云端调度**：本地 Agent 将任务上下文（捕获摘要、像素值、调用栈等）通过反向 WebSocket 发送给 Cloud Orchestrator。后者使用 Planner 模型拆解工作步骤，并将每个步骤封装为可执行指令。
4. **执行与验证**：指令通过 Orchestrator 发送回本地 Agent 执行，结果再返回给 Orchestrator；Explainer 模型对结果进行解释与推理，如发现证据不足则要求补充数据；Verifier 模型对步骤结果进行一致性检验，直至任务完成。

示例伪代码（Cloud Orchestrator 内部）：

```go
// 伪代码：云端调度循环
type Orchestrator struct {
    conn *websocket.Conn // 与本地 Agent 的反向连接
    planner ModelClient  // Planner 模型客户端
    explainer ModelClient// Explainer 模型客户端
    stateMachine *AgentStateMachine
}

func (o *Orchestrator) Run() {
    for {
        // 从本地 Agent 读取消息
        msg := o.conn.ReadJSON()
        switch msg.Type {
        case "task_request":
            // 调用 Planner 生成 action 链
            plan := o.planner.Plan(msg.Payload)
            o.conn.WriteJSON(Message{Type: "execute_plan", Payload: plan})
        case "execution_result":
            // 调用 Explainer 验证结果并生成解释
            explanation := o.explainer.Explain(msg.Payload)
            if explanation.NeedMoreData {
                // 请求补充数据
                o.conn.WriteJSON(Message{Type: "data_request", Payload: explanation.Request})
            } else {
                o.conn.WriteJSON(Message{Type: "task_complete", Payload: explanation})
            }
        }
    }
}
```

## 2 核心智能设计：调试 SOP 与 System Prompts

### 2.1 Planner System Prompt

Planner 是负责将用户的高层需求拆解为可执行 **Action Chain** 的模型。Prompt 设计必须强调工程化原则、工具约束与状态外化。一个典型的 Planner System Prompt 示例（中文）：

> **角色**：你是图形调试计划制定者，熟悉 RenderDoc API、本地 Agent 工具、GPU 调试流程。
>
> **目标**：根据用户问题和上下文，将调试任务拆解为一系列原子操作（action）。每个 action 必须指向具体工具或 API，例如 `open_capture`, `iterate_actions`, `get_pixel_history`, `analyze_nan_inf` 等。确保拆解步骤的顺序合理，并考虑先收集证据再进行推理。
>
> **约束**：
> 1. 避免跨步骤依赖混乱，每个 action 只做一件事并返回明确结果。
> 2. 遵循证据优先原则，不在没有数据的情况下做假设。
> 3. 尊重安全限制，不要求本地 Agent 打开公网端口。
> 4. 输出格式为 JSON 数组，每个元素包含 `name`、`arguments` 描述。
>
> **示例**：
> 输入："发现渲染结果有黑色斑点，怀疑 NaN 扩散"
>
> 输出：
> ```json
> [
>   {"name": "open_capture", "arguments": {"file_path": "?"}},
>   {"name": "iterate_actions", "arguments": {}},
>   {"name": "get_pixel_history", "arguments": {"event_id": 42, "x": 100, "y": 200}},
>   {"name": "analyze_nan_inf", "arguments": {"history": "@prev"}}
> ]
> ```

实现时，代码会将 Planner 的回复解析为列表，并依次提交给本地 Agent 执行。

### 2.2 Explainer System Prompt

Explainer 负责对执行结果进行解释，遵循“无证据不推理”原则，提示任何证据不足的部分。示例 Prompt：

> **角色**：你是图形调试分析师，负责根据底层数据给出专业解释。
>
> **行为准则**：
> 1. 仅根据提供的证据和数字进行推理，不凭空假设。若数据不足，应指出需要哪些额外信息。
> 2. 强调原因链：指出问题发生的具体阶段（例如某个 draw call 或 shader），并关联 GPU 管线状态。
> 3. 解释应清晰、简明，并提供可执行建议（如建议检查某个 shader 的输出）。
>
> **输出格式**：返回 `analysis` 字符串以及 `need_more_data` 布尔值；若需要更多数据，还应返回 `request` 字段，说明缺失的数据。

### 2.3 场景化 SOP 模板

#### 2.3.1 NaN/Inf 扩散诊断

思维链模板：

1. **定位异常像素**：通过前端或用户指定 `event_id`, `x`, `y` 获取 Pixel History 列表。每个历史项包含前后颜色、事件 ID、深度等【212365828210120†L108-L139】。
2. **检测数值异常**：遍历 `history` 列表，检查 `afterColor` 或 `shaderOutputs` 中的每个分量是否为 `NaN` 或 `Inf`；如果发现异常，则记录对应事件 ID 和来源 shader。
3. **溯源分析**：对异常事件使用 `DebugPixel()` 获取详细的像素调试 trace，包括每个 shader 阶段的寄存器值；进一步检查 upstream 的输入值（如 UV 坐标、采样值）。
4. **报告与建议**：输出所有包含 NaN/Inf 的事件列表，并建议检查对应 shader 的数学运算（如除以零、对负数开平方等）。

Python 实现示例：

```python
import math
import renderdoc as rd

class RenderDocAgent:
    def __init__(self, controller: rd.ReplayController):
        self.controller = controller

    def get_pixel_history(self, tex_id: rd.ResourceId, x: int, y: int):
        # 获取像素历史
        history = self.controller.PixelHistory(tex_id, x, y, 0, 0, 0xffffffff, rd.FormatComponentType.None)
        return history

    def analyze_nan_inf(self, history):
        anomalies = []
        for mod in history:
            # 访问修改后的颜色
            c = mod.postMod.colour
            # RenderDoc 颜色为 float4﻿，检查 NaN/Inf
            if any(math.isnan(component) or math.isinf(component) for component in c):
                anomalies.append({
                    'event_id': mod.eventID,
                    'color': tuple(c),
                    'shader': mod.shaderName
                })
        return anomalies
```

上述代码使用 RenderDoc 的 Pixel History API 从纹理中提取像素修改序列，并检测颜色向量中的 NaN/Inf 分量【212365828210120†L130-L136】。在实际运行中，需先通过 `controller.SetFrameEvent(event_id, True)` 将当前事件设置为正确的 draw call，然后根据输出目标 ID 调用 `PixelHistory`。

#### 2.3.2 几何异常检测

几何异常包括 **顶点坐标异常（超出裁剪空间或为 NaN/Inf）** 与 **拓扑错误**。思维链模板：

1. **收集网格数据**：在特定事件 ID 上调用 `controller.SetFrameEvent(event_id, True)`，然后通过 `controller.GetPostVSData(stage, meshSlot)` 或 `controller.PostVertexBuffers()` 获取顶点着色器输出的数据（位置、法线、UV）。
2. **验证数值**：遍历每个顶点的位置，如果位置存在 NaN/Inf 或绝对值远超裁剪空间（例如 >10^4），则记录异常；检查 UV 是否超出 [0,1] 区间。
3. **拓扑检查**：验证索引缓冲区中是否存在重复/越界索引；可选地检查法线长度接近零。
4. **报告**：生成包含异常顶点索引、坐标与建议的报告，例如建议修复顶点着色器输出或检查模型导出流程。

Python 实现示例（伪代码）：

```python
from collections import namedtuple

Vertex = namedtuple('Vertex', ['position', 'uv', 'normal'])

class GeometryAnalyzer:
    def __init__(self, controller: rd.ReplayController):
        self.controller = controller

    def fetch_vertices(self, event_id: int, mesh_slot: int = 0):
        self.controller.SetFrameEvent(event_id, True)
        # 获取顶点着色器后的网格数据
        vsout = self.controller.GetPostVSData(rd.MeshDataStage.VSOut, mesh_slot)
        vertices = []
        for i in range(vsout.numIndices):
            pos = vsout.positions[i]
            uv = vsout.textureCoordinates[0][i] if vsout.textureCoordinates else None
            nrm = vsout.normals[i] if vsout.normals else None
            vertices.append(Vertex(pos, uv, nrm))
        return vertices

    def detect_anomalies(self, vertices):
        issues = []
        for idx, v in enumerate(vertices):
            px, py, pz, pw = v.position
            # 检测 NaN/Inf 或超范围
            if any(math.isnan(c) or math.isinf(c) for c in (px, py, pz)) or abs(px) > 1e4 or abs(py) > 1e4 or abs(pz) > 1e4:
                issues.append({'index': idx, 'position': (px, py, pz), 'reason': 'invalid_position'})
            if v.uv is not None:
                u, t = v.uv
                if u < 0 or u > 1 or t < 0 or t > 1:
                    issues.append({'index': idx, 'uv': (u, t), 'reason': 'uv_out_of_range'})
        return issues
```

## 3 前端实施：React 组件示例

前端使用 React + TypeScript 实现用户界面，主要功能包括：上传捕获文件、显示 Pixel History 表格、展示思维链可视化、发送调试请求。以下是核心组件示例。

### 3.1 `DebugPanel.tsx`

```tsx
import React, { useState } from 'react';
import PixelHistoryTable from './PixelHistoryTable';
import ThoughtChain from './ThoughtChain';

interface PixelMod {
  eventId: number;
  color: [number, number, number, number];
  shader: string;
}

const DebugPanel: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<PixelMod[]>([]);
  const [thoughts, setThoughts] = useState<string[]>([]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (f) {
      // 将文件发送给本地 Agent
      const formData = new FormData();
      formData.append('capture', f);
      await fetch('http://localhost:9000/upload', { method: 'POST', body: formData });
    }
  };

  const runNanAnalysis = async () => {
    // 请求分析 NaN 扩散
    const res = await fetch('http://localhost:9000/nan_analysis', { method: 'POST' });
    const data = await res.json();
    setHistory(data.history);
    setThoughts(data.thoughts);
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>AI 调试面板</h2>
      <input type="file" accept=".rdc" onChange={handleUpload} />
      <button onClick={runNanAnalysis} disabled={!file}>执行 NaN 分析</button>
      <PixelHistoryTable history={history} />
      <ThoughtChain thoughts={thoughts} />
    </div>
  );
};

export default DebugPanel;
```

### 3.2 `PixelHistoryTable.tsx`

```tsx
import React from 'react';

interface PixelMod {
  eventId: number;
  color: [number, number, number, number];
  shader: string;
}

const PixelHistoryTable: React.FC<{ history: PixelMod[] }> = ({ history }) => (
  <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }}>
    <thead>
      <tr>
        <th>Event ID</th>
        <th>Color (RGBA)</th>
        <th>Shader</th>
      </tr>
    </thead>
    <tbody>
      {history.map((mod, idx) => (
        <tr key={idx}>
          <td>{mod.eventId}</td>
          <td>{mod.color.join(', ')}</td>
          <td>{mod.shader}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default PixelHistoryTable;
```

### 3.3 `ThoughtChain.tsx`

```tsx
import React from 'react';

const ThoughtChain: React.FC<{ thoughts: string[] }> = ({ thoughts }) => (
  <div style={{ marginTop: 16 }}>
    <h3>思维链可视化</h3>
    <ol>
      {thoughts.map((t, idx) => (
        <li key={idx}>{t}</li>
      ))}
    </ol>
  </div>
);

export default ThoughtChain;
```

该前端仅为最小可用原型(MVP)。生产环境下可集成图形化的链式图表（例如 `react-flow`）和 3D 预览器，以及对状态机的实时显示。

## 4 后端实施：本地 Agent 和通信协议

### 4.1 本地 Python Agent

#### 4.1.1 目录结构

```
agent/
├── main.py            # WebSocket 客户端与任务调度
├── rd_agent.py        # RenderDoc 封装（L2/L4 工具）
├── geometry.py        # 几何异常分析
├── workflow.py        # 状态机实现
└── requirements.txt   # 依赖：websockets、transitions、renderdoc
```

#### 4.1.2 `rd_agent.py`

```python
import renderdoc as rd
import math
from typing import List, Dict, Any

class RenderDocAgent:
    def __init__(self):
        self.controller: rd.ReplayController | None = None

    def open_capture(self, path: str) -> None:
        cap = rd.OpenCaptureFile()
        result = cap.OpenFile(path, '', None)
        if result != rd.ResultCode.Succeeded:
            raise RuntimeError(f"Couldn't open file: {result}")
        if not cap.LocalReplaySupport():
            raise RuntimeError("Capture cannot be replayed")
        result, controller = cap.OpenCapture(rd.ReplayOptions(), None)
        if result != rd.ResultCode.Succeeded:
            raise RuntimeError(f"Couldn't initialise replay: {result}")
        self.controller = controller

    def close(self):
        if self.controller:
            self.controller.Shutdown()
            self.controller = None

    def iterate_actions(self) -> List[Dict[str, Any]]:
        """遍历根 action 树，返回列表包含 eventId 和 name"""
        actions_info: List[Dict[str, Any]] = []
        def _iter(d, indent=''):
            actions_info.append({'event_id': d.eventId,
                                 'name': d.GetName(self.controller.GetStructuredFile())})
            for child in d.children:
                _iter(child, indent + '    ')
        for a in self.controller.GetRootActions():
            _iter(a)
        return actions_info

    def get_pixel_history(self, tex_id: rd.ResourceId, x: int, y: int):
        history = self.controller.PixelHistory(tex_id, x, y, 0, 0, 0xffffffff, rd.FormatComponentType.NoType)
        return history

    def analyze_nan_inf(self, history) -> List[Dict[str, Any]]:
        anomalies = []
        for mod in history:
            c = mod.postMod.colour
            if any(math.isnan(component) or math.isinf(component) for component in c):
                anomalies.append({
                    'event_id': mod.eventID,
                    'color': [float(x) for x in c],
                    'shader': mod.shaderName
                })
        return anomalies

    def save_color_output(self, event_id: int, file_prefix: str) -> List[str]:
        """保存指定 draw call 的颜色输出为多种格式"""
        self.controller.SetFrameEvent(event_id, True)
        rdobj = rd
        texsave = rdobj.TextureSave()
        draw = self.controller.GetDrawcall(event_id)
        texsave.resourceId = draw.outputs[0]
        texsave.alpha = rdobj.AlphaMapping.BlendToCheckerboard
        texsave.mip = 0
        texsave.slice.sliceIndex = 0
        paths = []
        for ftype in [rdobj.FileType.JPG, rdobj.FileType.PNG]:
            texsave.destType = ftype
            fname = f"{file_prefix}.{ftype.name.lower()}"
            self.controller.SaveTexture(texsave, fname)
            paths.append(fname)
        return paths
```

#### 4.1.3 `geometry.py`

```python
import math
import renderdoc as rd
from dataclasses import dataclass

@dataclass
class VertexInfo:
    position: tuple
    uv: tuple | None

class GeometryAnalyzer:
    def __init__(self, controller: rd.ReplayController):
        self.controller = controller

    def fetch_vertices(self, event_id: int, mesh_slot: int = 0):
        self.controller.SetFrameEvent(event_id, True)
        vsout = self.controller.GetPostVSData(rd.MeshDataStage.VSOut, mesh_slot)
        vertices = []
        for i in range(vsout.numIndices):
            pos = vsout.positions[i]
            uv = vsout.textureCoordinates[0][i] if vsout.textureCoordinates else None
            vertices.append(VertexInfo(pos, uv))
        return vertices

    def detect_anomalies(self, vertices):
        issues = []
        for idx, v in enumerate(vertices):
            x, y, z, w = v.position
            if any(math.isnan(c) or math.isinf(c) for c in (x, y, z)) or abs(x) > 1e4 or abs(y) > 1e4 or abs(z) > 1e4:
                issues.append({'index': idx, 'position': (x, y, z), 'reason': 'invalid_position'})
            if v.uv is not None:
                u, t = v.uv
                if u < 0 or u > 1 or t < 0 or t > 1:
                    issues.append({'index': idx, 'uv': (u, t), 'reason': 'uv_out_of_range'})
        return issues
```

#### 4.1.4 `main.py`：WebSocket 客户端与任务分派

```python
import asyncio
import json
import websockets
from rd_agent import RenderDocAgent
from geometry import GeometryAnalyzer
from workflow import AgentStateMachine

class AgentClient:
    def __init__(self, uri: str):
        self.uri = uri
        self.agent = RenderDocAgent()
        self.workflow = AgentStateMachine(self)

    async def handle_message(self, msg: dict, ws):
        msg_type = msg.get('type')
        if msg_type == 'execute_plan':
            for action in msg['payload']:
                name = action['name']
                args = action['arguments']
                if name == 'open_capture':
                    self.agent.open_capture(args['file_path'])
                elif name == 'iterate_actions':
                    actions = self.agent.iterate_actions()
                    await ws.send(json.dumps({'type': 'execution_result', 'payload': actions}))
                elif name == 'get_pixel_history':
                    history = self.agent.get_pixel_history(args['tex_id'], args['x'], args['y'])
                    await ws.send(json.dumps({'type': 'execution_result', 'payload': 'history_serialized'}))
                elif name == 'analyze_nan_inf':
                    anomalies = self.agent.analyze_nan_inf(args['history'])
                    await ws.send(json.dumps({'type': 'execution_result', 'payload': anomalies}))
                # 可扩展更多工具
        elif msg_type == 'data_request':
            # 根据 Explainer 需求补采数据
            pass

    async def run(self):
        async with websockets.connect(self.uri) as ws:
            while True:
                msg = await ws.recv()
                data = json.loads(msg)
                await self.handle_message(data, ws)

if __name__ == '__main__':
    client = AgentClient('wss://cloud.example.com/agent')
    asyncio.run(client.run())
```

该 WebSocket 客户端仅建立反向连接，未监听任何公网端口，从而满足安全要求。

#### 4.1.5 `workflow.py`：Planner→Executor→Verifier 状态机

```python
from transitions import Machine

class AgentStateMachine:
    states = ['planning', 'executing', 'verifying', 'completed', 'error']

    def __init__(self, client):
        self.client = client
        self.machine = Machine(model=self, states=AgentStateMachine.states, initial='planning')
        self.machine.add_transition(trigger='plan_ready', source='planning', dest='executing')
        self.machine.add_transition(trigger='execution_done', source='executing', dest='verifying')
        self.machine.add_transition(trigger='verification_pass', source='verifying', dest='completed')
        self.machine.add_transition(trigger='verification_fail', source='verifying', dest='planning')
        self.machine.add_transition(trigger='error_occurred', source='*', dest='error')

    def on_enter_executing(self):
        # 执行计划中的动作，可调用 client 方法
        pass

    def on_enter_verifying(self):
        # 调用 Explainer 验证结果
        pass

    def on_enter_completed(self):
        print('任务完成')
```

### 4.2 通信协议

采用 JSON 格式的消息，通过 WebSocket 进行双向通信。以下是核心消息的 JSON Schema：

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "oneOf": [
    {
      "title": "TaskRequest",
      "type": "object",
      "properties": {
        "type": {"const": "task_request"},
        "taskId": {"type": "string"},
        "task": {"type": "string"},
        "context": {"type": "object"}
      },
      "required": ["type", "taskId", "task"]
    },
    {
      "title": "ExecutePlan",
      "type": "object",
      "properties": {
        "type": {"const": "execute_plan"},
        "taskId": {"type": "string"},
        "payload": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "arguments": {"type": "object"}
            },
            "required": ["name", "arguments"]
          }
        }
      },
      "required": ["type", "taskId", "payload"]
    },
    {
      "title": "ExecutionResult",
      "type": "object",
      "properties": {
        "type": {"const": "execution_result"},
        "taskId": {"type": "string"},
        "payload": {}
      },
      "required": ["type", "taskId", "payload"]
    },
    {
      "title": "DataRequest",
      "type": "object",
      "properties": {
        "type": {"const": "data_request"},
        "taskId": {"type": "string"},
        "request": {"type": "object"}
      },
      "required": ["type", "taskId", "request"]
    },
    {
      "title": "TaskComplete",
      "type": "object",
      "properties": {
        "type": {"const": "task_complete"},
        "taskId": {"type": "string"},
        "result": {}
      },
      "required": ["type", "taskId", "result"]
    }
  ]
}
```

### 4.3 云端示例实现（Node.js）

以下使用 `ws` 和 `axios` 创建 Cloud Orchestrator，可连接本地 Agent 并通过 OpenRouter 调用模型。为简化演示，将 Planner/Explainer 调用抽象为函数。

```js
// orchestrator/server.js
const WebSocket = require('ws');
const axios = require('axios');

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const API_KEY = process.env.OPENROUTER_API_KEY;

class Orchestrator {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.wss.on('connection', ws => this.onConnection(ws));
  }

  async callModel(messages, model) {
    const res = await axios.post(OPENROUTER_API, {
      model,
      messages
    }, { headers: { Authorization: `Bearer ${API_KEY}` } });
    return res.data;
  }

  async onConnection(ws) {
    ws.on('message', async data => {
      const msg = JSON.parse(data);
      if (msg.type === 'task_request') {
        // 调用 Planner
        const plan = await this.callModel([
          { role: 'system', content: PLANNER_PROMPT },
          { role: 'user', content: msg.task }
        ], 'gpt-4o');
        ws.send(JSON.stringify({ type: 'execute_plan', taskId: msg.taskId, payload: plan.actions }));
      } else if (msg.type === 'execution_result') {
        // 调用 Explainer
        const analysis = await this.callModel([
          { role: 'system', content: EXPLAINER_PROMPT },
          { role: 'user', content: JSON.stringify(msg.payload) }
        ], 'gpt-4o');
        ws.send(JSON.stringify({ type: 'task_complete', taskId: msg.taskId, result: analysis }));
      }
    });
  }
}

new Orchestrator();
```

生产环境中可使用 Go 实现同样的功能，利用 `gorilla/websocket` 与 `net/http`，并通过接口抽象便于扩展。

## 5 Agentic 工作流设计

结合状态机与消息协议，整体流程如下：

1. Planner 模型根据任务描述生成 Action Chain，并通过 `execute_plan` 消息发送给本地 Agent。
2. Agent 遍历 Action Chain，逐个调用封装的 RenderDoc 工具（L2/L4）。每个动作执行完毕后通过 `execution_result` 报告 Orchestrator。
3. Orchestrator 收到结果后调用 Explainer 模型进行分析。如果 Explainer 需要更多数据，则向 Agent 发送 `data_request`，Agent 采集后返回；否则发送 `task_complete`。
4. Verifier 可作为另一个模型或规则，对 Explainer 的结论进行二次审视；若不通过，则触发状态机回到 planning 状态并重新拆解任务。

该工作流由 `workflow.py` 中的 `AgentStateMachine` 实现，其状态转换在代码中定义。

## 6 AI 协作与指令策略

### 6.1 文档结构策略

为了在 AI 自驱动开发时高效利用上下文，建议将项目文档拆分为模块化文件，而非单一巨型文档。这可降低每次上下文注入的大小，便于模型定位所需信息。推荐的目录结构：

```
docs/
├── arch.md        # 系统架构与数据流（即本文档）
├── api_spec.md    # RenderDoc 封装的工具接口说明，JSON Schema 定义
├── sop.md         # 调试 SOP 与 Prompt 模板，如 NaN/Inf 诊断、几何异常检测
├── workflows.md   # 状态机与 Agent 工作流说明
├── prompts/
│   ├── planner.md   # Planner System Prompt
│   └── explainer.md # Explainer System Prompt
└── tasks.md       # 模拟任务描述与预期输出
```

### 6.2 上下文注入策略

在开发环境中，Grok Agent 应遵循以下规则：

1. **优先查阅文档**：在开始编写代码前，先读取 `docs/api_spec.md` 了解工具接口；阅读 `docs/sop.md` 获取调试流程；再查看 `docs/arch.md` 熟悉全局架构。
2. **外部模型提示注入**：当调用 Planner 或 Explainer 模型时，将对应的 System Prompt 文件内容注入 `messages[0]`，然后将用户任务或数据作为 `messages[1]`。
3. **版本管理**：对文档的更新要保持版本号，可在文件头部加入 `Version: x.y`；更新后通知所有模型重新加载。
4. **日志持久化**：Agent 执行过程中将关键事件写入 `logs/` 目录，便于模型回溯。

### 6.3 任务分发 Prompt 示例

以下示例展示如何为 Grok Agent 下发开发任务：

- **Task 1：实现“思维链可视化组件”**

  Prompt：`请在前端实现一个用于显示 AI 思维链的 React 组件，要求将每个思维步骤绘制为节点，并按顺序连接，点击节点可显示详细内容。`

  Planner 可能输出如下 Action Chain：

  ```json
  [
    {"name": "open_file", "arguments": {"path": "frontend/src/components/ThoughtGraph.tsx"}},
    {"name": "write_code", "arguments": {"content": "...React component code..."}},
    {"name": "commit", "arguments": {"message": "feat: 思维链可视化组件"}}
  ]
  ```

- **Task 2：实现“Pixel History 数据清洗算法”**

  Prompt：`在 Python Agent 中新增函数 clean_pixel_history，用于剔除没有修改颜色的历史项并按事件顺序排序。`

  示例实现：

  ```python
  def clean_pixel_history(self, history):
      return [mod for mod in history if mod.preMod.colour != mod.postMod.colour]
  ```

- **Task 3：编写“OpenRouter 动态路由客户端”**

  Prompt：`使用 Node.js 实现一个客户端，根据任务类型选择不同模型（例如 planner 使用 gpt‑4o，explainer 使用 gemini-pro），并支持工具调用。`

  Planner 可能生成 `server/router.js` 的创建动作，包含动态判断逻辑。代码可参考 4.3 节的云端示例。

## 7 改进与扩展建议

1. **模型路由优化**：当前选择特定模型（如 GPT‑4o）作为 Planner/Explainer；可根据实时性能与成本动态调整，利用 OpenRouter 的模型筛选参数，通过实验确定最佳组合。
2. **多 Agent 协作**：未来可引入专用的“Verifier”模型或规则引擎，用于审查 Explainer 的结论，进一步降低 hallucination 风险。
3. **离线缓存与增量分析**：针对大型捕获文件，可在本地 Agent 端实现增量加载和缓存机制，只传输必要的摘要数据到云端，减少带宽占用。
4. **前端可视化增强**：结合 WebGL 或 `three.js` 在浏览器中直接预览网格、纹理及异常点；利用图数据库展示复杂依赖关系。

## 结论

本方案提供了完整的 **AI 驱动图形调试平台** 的架构与代码基础，实现了云端大模型与本地 RenderDoc 调试的协同工作。设计强调证据优先、状态外化、安全连接和模块化文档结构。随着进一步的开发，你可以基于本方案扩展更多调试场景（例如内存越界、着色器性能分析），并逐步构建出成熟的 AI‑辅助图形工程师平台。

