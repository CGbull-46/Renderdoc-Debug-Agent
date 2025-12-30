# Renderdoc Debug Agent - 前端开发需求文档 (PRD) v1.0

## 0. 与当前仓库约束对齐 (必读)

本 PRD 需与仓库约束一致（见 `AGENTS.md` 与 `docs/*`）：

- 上游 RenderDoc 镜像目录 `rdc/` 不在前端改动范围内（仅参考）。
- Orchestrator/Agent 仅允许本机监听（默认 `127.0.0.1`），前端不得引导开启公网服务。
- 严禁把任何 API Key/Token 写入仓库；前端仅允许保存在本机（如浏览器 `localStorage`）或由运行时环境注入。
- 前端坚持“最小依赖”：不引入新的远程资产，不新增复杂运行时依赖，保证本地可运行。
- 所有接口字段、事件类型与数据结构：以 [docs/api/spec.md](../api/spec.md) 为准；本 PRD 仅描述 UI 行为与渲染逻辑。

建议在动手实现前顺序阅读：
- 架构与数据流：[docs/arch/overview.md](overview.md)
- 工具/接口：[docs/api/spec.md](../api/spec.md)
- 调试 SOP：[docs/guides/debug_sop.md](../guides/debug_sop.md)
- 工作流：[docs/guides/workflows.md](../guides/workflows.md)

## 1. 项目概述

本项目定义 Debug Agent Workspace 的前端实现方案：一个基于 React 的单页应用 (SPA)，作为调试系统的“视觉控制台”。

定位与边界（与工程现状对齐）：
- 前端不直接调用 RenderDoc 原生 API、不处理抓帧逻辑；仅通过本仓库的本地 Orchestrator/Agent API 获取状态与渲染所需数据。
- 前端负责把“对话意图 / 诊断过程 / 工具调用 / 可视化证据”以低噪声方式呈现，并驱动 Canvas 视图切换。
- 前端的网络访问范围默认仅指向本机 `127.0.0.1`（端口与路径以 [docs/api/spec.md](../api/spec.md) 为准）。

## 2. 技术栈规范

- 框架: React (Vite)
- 样式: Tailwind CSS（核心），`clsx` / `tailwind-merge`（类名管理）
- 图标: `lucide-react`
- 动画: CSS Transitions / Tailwind 动画（仅用于 loading/pulse 等轻量效果）
- 字体: 系统默认 Sans-serif (UI) + Monospace (代码/数据)

约束补充（与仓库策略一致）：
- 不引入远程字体/CDN 资源；所有资源应可离线本地运行。
- 不新增“必须联网”的前端依赖或遥测采集。

## 3. 设计系统 (Visual Language)

主题: Obsidian Dark（黑曜石深色主题）
- 背景色: `#09090b` (Zinc-950)
- 面板背景: `#18181b` (Zinc-900) + `border-zinc-800`
- 文字: `#e4e4e7` (Zinc-200) 主要, `#a1a1aa` (Zinc-400) 次要

状态色:
- Processing: `#3b82f6` (Blue-500) + 呼吸动画
- Success/Resolved: `#10b981` (Emerald-500)
- Warning/Critical: `#f43f5e` (Rose-500)
- Tool Call: `#a855f7` (Purple-500)

视觉特效:
- Glassmorphism: 弹窗/浮层使用 `backdrop-blur-md` + 半透明背景
- Shadows: `shadow-inner` + 柔和外发光
- Micro-interactions: Hover 轻微上浮，active 轻微缩放

## 4. 核心模块与功能逻辑

### 4.1 全局布局 (App Shell)

响应式三栏布局（Flexbox）：
1. Left Sidebar (260px, fixed): 项目资源管理
2. Center Panel (flex-1): AI Diagnostic Feed（对话/诊断流）
3. Right Panel (450px, resizable/fixed): The Canvas（可视化看板）

注：右栏是否支持“可拖拽调整宽度”视实现成本决定；PRD 不强制，但布局需预留扩展点。

### 4.2 左侧栏：Project Explorer

- 顶部: Open Project（主操作）
- 中间: 资源树（Tree View）
  - 展示 `.rdc` 文件（图标）
  - 展示 `cache/` 等派生目录（弱化显示）
  - 展示生成的 Image Assets（若工程已提供该概念，以实际数据源为准）
- 底部:
  - Settings（打开全屏/大模态）
  - 本机连接状态指示（Connected/Disconnected）
    - Connected: 绿色
    - Disconnected: 红色
    - 状态来源：以 `docs/api_spec.md` 的 health/status 接口为准（不要自行猜测字段）

### 4.3 中间栏：Diagnostic Feed (核心交互)

- 布局: 垂直滚动列表，底部固定输入框
- 消息类型:
  - User Message: 右对齐，深灰背景，非对称圆角（`rounded-tr-none`）
  - Agent Message: 左对齐，包含：
    A. Header: Avatar + 固定标识（例如 "AGENT"；具体命名与产品一致即可）
    B. Thinking Process（可折叠面板）
      - 默认：当状态为 processing 时默认展开；否则默认折叠
      - Step Item：每步可单独折叠详情
      - Tool Calls：以“工具调用日志”形式高亮显示（紫色等宽字体）
      - Processing 动效：spinner + `animate-pulse`（仅在 processing 的 step 上显示）
    C. Summary Card（结论摘要）
      - 逻辑控制（必须）：当且仅当 `status !== 'processing'` 时渲染；processing 时强制隐藏
      - Action Button: INSPECT IN CANVAS
      - 交互：点击后切换 Canvas 为 Single，并选择当前消息对应的 submissionId

实现备注：
- 前端不实现“推理/工具执行”，仅展示后端产出的步骤与日志。
- 日志内容可能包含敏感路径/片段：前端仅显示，不落盘、不上传。

### 4.4 右侧栏：The Canvas

Header Control Bar:
- Mode Toggle: `[ Aggregated | Single ]`
- History Dropdown:
  - 仅在 Single 模式显示
  - 数据必须过滤掉 status 为 processing 的 submission（仅完成的记录可回溯）
  - 具体字段名/状态枚举以 `docs/api_spec.md` 为准

Main Content Area:
- Pipeline Verification: IA -> VS -> RS -> PS -> OM 节点可视化
  - 支持高亮某一 stage（例如 RS 标红）
  - Hover/选中态（glow）
- Visual Evidence:
  - Render Targets 预览（Color/Depth）
  - 为空时显示 skeleton/placeholder
- Warning Blocks:
  - 显眼的错误提示块（与 status 色一致）

### 4.5 设置模态框 (Settings Modal)

触发：左侧栏底部 Settings
样式：全屏覆盖，`backdrop-blur-sm bg-black/50`

内容（对齐“本机安全边界 + 不写入仓库”）：
- Agent Base URL:
  - 默认：`http://127.0.0.1:3000`（若工程实际端口不同，以 README/api_spec 为准）
  - 用途：前端所有 API 请求的 baseURL
- Provider API Key（可选）：
  - 密码掩码显示
  - 仅保存到本机（例如 localStorage）；不得写入仓库/生成配置文件提交
  - 如果当前工程并不需要前端持有 key，则该项应可隐藏/禁用（以实际后端鉴权方式为准）
- Model Selector:
  - 下拉选择
  - 选项来源：优先由后端能力接口返回；否则使用本地常量（以工程实际支持的模型为准）
- Action Button: APPLY & TEST
  - 行为：保存设置到本机 + 调用 health/test 接口验证连通性（接口与返回结构以 `docs/api_spec.md` 为准）
  - UI：按钮 Loading（spinner），成功/失败提示文本（不要依赖 emoji 作为唯一区分）

交互逻辑（UI 期望）：
- 点击 Apply：进入 loading
- 模拟延时仅用于纯前端 mock；接入后端后应以真实请求耗时为准
- 成功：显示绿色状态与延迟/版本等（若接口提供）
- 失败：显示红色状态与可行动建议（例如“确认本机服务已启动、端口是否正确”）

## 5. 数据结构 Mock（仅用于 UI 开发；最终以 docs/api_spec.md 为准）

说明：
- 这里的接口用于前端 mock/组件 props；字段命名可在接入真实 API 时映射。
- status/枚举建议与后端保持一致，避免二次翻译。

```typescript
type StepStatus = 'pending' | 'processing' | 'completed';
type SubmissionStatus = 'processing' | 'resolved' | 'warning' | 'critical';

interface CoTStep {
  id: string;
  title: string;
  status: StepStatus;
  logs: { type: 'tool' | 'info' | 'analysis'; content: string }[];
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content?: string;

  submissionId?: string;
  status?: SubmissionStatus;
  steps?: CoTStep[];
  summary?: {
    title: string;
    description: string;
    tag: string;
  };
}

interface Submission {
  id: string;
  timestamp: string;
  title: string;
  status: SubmissionStatus;
  pipelineState: {
    highlightStage: 'IA' | 'VS' | 'RS' | 'PS' | 'OM' | null;
    warningMessage?: string;
  };
  evidence: {
    colorBuffer?: string;
    depthBuffer?: string;
  };
}
```

## 6. 交互细节与状态机 (State Logic)

1. 初始化（Mock）
- 加载 mock 数据：至少 3 条已完成记录 + 1 条 processing 记录
- Canvas 默认：Single + 选中最近一条“已完成”的 submission
- 注意：processing 的 submission 不允许进入 History dropdown（与 4.4 逻辑一致）

2. Processing 表现
- Diagnostic Feed：processing 消息展示 Thinking Process（默认展开），最后一个 step 显示 spinner
- Summary Card：processing 时不渲染
- Canvas History：不包含 processing submission

3. Inspect 跳转
- 点击某条已完成消息的 INSPECT IN CANVAS：
  - Canvas Mode => Single
  - History Selection => 对应该 message.submissionId
  - History 下拉中高亮当前项

### Renderdoc Agent - ASCII UI Blueprint

说明：以下为结构示意，不作为像素级实现约束；样式以 Tailwind 与主题色为准。

#### 1. 全局布局与已完成状态 (The Resolved View)

此视图展示了 **Submission #3** 诊断完成后的界面状态。

```ascii
+=====================================================================================================+
|  Renderdoc Agent WORKSPACE  v1.0   [Obsidian Dark Bg: #09090b]                  [ _ ] [ □ ] [ X ] |
+=====================================================================================================+
|  SIDEBAR (260px)        |  DIAGNOSTIC FEED (Flex-1)                |  THE CANVAS (450px)            |
| +---------------------+ | +--------------------------------------+ | +----------------------------+ |
| | [📁 Open Project  ] | |                                        | | [  AGGREGATED  | (●) SINGLE] | |
| |                     | |                [ User Message bubble ] | |                              | |
| | ▼ PROJECT ASSETS    | |       Why is the shadow flickering? 👤 | | History: [ Sub #3: Warning v]| |
| |   📄 scene.rdc      | |   (Right-aligned, rounded-tr-none)   | | +----------------------------+ |
| |   📂 cache/         | |                                        | |                              | |
| |   🖼️ shadow_map.png | | [🤖 Agent Avatar]                      | |  ⚠️ PIPELINE VERIFICATION    | |
| |                     | |                                        | |                              | |
| |                     | | +--[ Thinking Process (Collapsed) ]--+ | | (IA) -> (VS) -> [RS] -> (PS) | |
| |                     | | | >_ EXECUTION LOG             [v] | | |               [ !! ]       | | |
| |                     | | +----------------------------------+ | |               (Red Glow)     | | |
| |                     | |                                        | |                              | |
| |                     | | +--[ SUMMARY CARD (Fade In) ]------+ | |  EXTRACTED EVIDENCE          | |
| |                     | | | 🔶 WARNING: CULL MODE ISSUE      | | |                              | |
| |                     | | |                                  | | | +-----------+  +-----------+ | |
| |                     | | | The Backface Culling is active   | | | |           |  |           | | |
| |                     | | | but winding order is CW.         | | | | Color Buf |  | Depth Buf | | |
| |                     | | |                                  | | | | (Preview) |  | (Preview) | | |
| |                     | | | [ INSPECT IN CANVAS (Hover->) ]  | | | +-----------+  +-----------+ | |
| |                     | | +----------------------------------+ | |                              | |
| | ⚙️ Settings         | |                                        | |                              | |
| | 🟢 (Connected)      | | > [ Type a message...              ] | |                              | |
| +---------------------+ +--------------------------------------+ +----------------------------+ |
+=====================================================================================================+

```

---

#### 2. 诊断流的核心状态机 (Diagnostic Feed States)

这是前端逻辑最复杂的部分，展示了 **Processing (进行中)** 与 **Finished (已完成)** 的视觉差异。

**A. 状态：Processing (正在思考中)**
*对应 Mock 数据中的 Submission #4 (Resource Leak Analysis)*

```ascii
[🤖 Agent Avatar]
   |
   +--[ 🧠 THINKING PROCESS (Expanded by default) ]-------------------------+
   |  (Border: Blue-500/30, Effect: animate-pulse)                          |
   |                                                                        |
   |  v 1. Texture Signature Scan .................................. [✔]    |
   |  v 2. Source Code Context Search .............................. [✔]    |
   |      | search_query: "ShadowBlur.hlsl"                                 |
   |      | found_lines: 142-156                                            |
   |                                                                        |
   |  > 3. Memory Footprint Analysis ............................... [🔄]   |
   |      (Spinner Icon Spinning)                                           |
   |      "Comparing VRAM delta between DrawCall #140 and #141..."          |
   |                                                                        |
   +------------------------------------------------------------------------+
   
   (⛔ NOTE: SUMMARY CARD IS HIDDEN. User waits for the thinking to finish.)

```

**B. 状态：Resolved/Warning (诊断完成)**
*对应 Mock 数据中的 Submission #2 & #3*

```ascii
[🤖 Agent Avatar]
   |
   +--[ 🧠 THINKING PROCESS (Collapsed) ]-----------------------------------+
   |  >_ 4 Steps Executed (Click to expand details)                     [v] |
   +------------------------------------------------------------------------+
   |
   +--[ 📑 SUMMARY CARD (Background: Zinc-800, Border: Green/Red) ]---------+
   |                                                                        |
   |   ✅ RESOLVED: DEPTH FORMAT MISMATCH                                   |
   |   ----------------------------------                                   |
   |   Expected D32_FLOAT but found D24_UNORM.                              |
   |                                                                        |
   |                      [ ⤢ INSPECT IN CANVAS ]                           |
   |                      (Click -> Auto-scrolls Canvas & Highlights History)|
   +------------------------------------------------------------------------+

```

---

#### 3. 设置弹窗交互 (Settings Modal Overlay)

(Background Layer: Main Workspace blurred via backdrop-blur-sm)

```ascii
+---------------------------------------------------------------+
|  WORKSPACE SETTINGS                                      [X]  |
+---------------------------------------------------------------+
|  AGENT BASE URL                                               |
|  [ http://127.0.0.1:3000                                 ]    |
|                                                               |
|  PROVIDER API KEY (optional, stored locally)                   |
|  [ ****************************************************** ]    |
|                                                               |
|  MODEL                                                        |
|  [ <from backend capabilities or local fallback>        v ]    |
|                                                               |
|  [      APPLY & TEST CONNECTION (shows spinner while loading) ]|
|                                                               |
|  Feedback Area:                                               |
|  Connected. Latency: 45ms                                     |
+---------------------------------------------------------------+
```