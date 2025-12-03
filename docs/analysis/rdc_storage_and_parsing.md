# RenderDoc (.rdc) 深度解析与 MCP 集成分析


# RenderDoc (.rdc) 存储、解析与 Rdccmd 分析

## 1. .rdc 文件存储

`.rdc` 文件格式是 RenderDoc 设计的自定义二进制容器格式。它的结构由一个文件头后跟一系列“段 (sections)”组成。

### 1.1 文件结构

文件布局大致如下：

1.  **文件头 (File Header)**：
    *   魔数 (Magic Number)：`RDOC` (ASCII)
    *   版本 (Version)：例如 `0x00000102` (SERIALISE_VERSION)
    *   头长度 (Header Length)：头部的大小，以便于未来扩展。
    *   程序版本 (Program Version)：ASCII 字符串（例如 "v1.x"），包含 git 哈希值。

2.  **缩略图 (Thumbnail)**：
    *   `BinaryThumbnail` 结构。
    *   包含宽度、高度、长度以及 JPEG 压缩的数据。

3.  **捕获元数据 (Capture Metadata)**：
    *   `CaptureMetaData` 结构。
    *   机器标识 (Machine Identity)：创建捕获的机器信息。
    *   驱动 ID (Driver ID)：例如 Vulkan, D3D11。
    *   驱动名称 (Driver Name)：ASCII 字符串。
    *   时基信息 (Timebase info)：时间戳基准和频率。

4.  **段 (Sections)**：
    *   文件的其余部分由一个或多个段组成。
    *   第一个段通常是 **帧捕获 (Frame Capture)** 数据。
    *   其他段可以包括 `ExtendedThumbnail`（扩展缩略图）、`ResolveDatabase`（调用栈解析数据库）或自定义数据。

### 1.2 段格式

每个段都有一个头，后面跟着数据。头部可以是：

*   **ASCII 头**（罕见，用于调试/追加）：
    *   用于长度、类型、版本、名称的文本字段。
    *   便于手动编辑或脚本处理。
*   **二进制头** (`BinarySectionHeader`)：
    *   `isASCII` 标志 (0x0)。
    *   `SectionType`：标识内容的枚举（例如 `FrameCapture`）。
    *   `sectionCompressedLength`：磁盘上的大小。
    *   `sectionUncompressedLength`：解压后的大小。
    *   `sectionVersion`：段数据的内部版本。
    *   `sectionFlags`：例如 `LZ4Compressed`, `ZstdCompressed`。
    *   `sectionName`：UTF-8 字符串。

### 1.3 序列化与压缩

*   **压缩**：该格式支持对段数据进行 **LZ4** 和 **Zstd** 压缩，通过段头中的标志指示。
*   **实现**：`RDCFile` 类 (`rdc/renderdoc/serialise/rdcfile.cpp`) 管理这些块的底层读写。它处理文件 I/O、头部解析和流解压。

## 2. .rdc 解析实现

解析逻辑主要包含在 `RDCFile` 中，并由 `CaptureFile` 封装。

### 2.1 RDCFile 类 (`serialise/rdcfile.cpp`)

*   **`Open(filename)`**：打开文件，验证魔数和版本。
*   **`Init(StreamReader)`**：
    *   读取文件头。
    *   读取缩略图和元数据。
    *   遍历文件，逐个读取段头以构建目录（`m_Sections` 和 `m_SectionLocations`）。它**跳过**实际的段数据，直到被请求。
*   **`ReadSection(index)`**：
    *   定位到段的数据偏移量。
    *   返回一个 `StreamReader`。如果数据被压缩，它会将文件读取器包装在解压器（`LZ4Decompressor` 或 `ZSTDDecompressor`）中。

### 2.2 CaptureFile 类 (`replay/capture_file.cpp`)

*   实现了 `ICaptureFile` 接口（公共 API）。
*   内部使用 `RDCFile` 访问文件结构。
*   **`OpenFile`**：
    *   确定文件类型（默认为 `rdc`，但也支持导入器）。
    *   创建一个 `RDCFile` 实例并调用 `Open`。
    *   根据驱动和机器标识初始化重放支持。
*   **`InitStructuredData`**：
    *   使用 `StructuredProcessor` 将 `FrameCapture` 段的内部格式解析为用于分析的结构化数据（块和缓冲区）。

## 3. Rdccmd 用法与实现

`rdccmd` (`rdc/renderdoccmd/renderdoccmd.cpp`) 是 RenderDoc 的命令行界面。它提供了各种子命令来在没有 UI 的情况下执行操作。

### 3.1 命令结构

该工具使用命令模式，每个子命令都继承自 `Command` 结构体。

*   **入口点**：`renderdoccmd` 函数解析参数并分发给相应的命令。
*   **命令**：
    *   `capture`：启动应用程序并注入 RenderDoc (`RENDERDOC_ExecuteAndInject`)。
    *   `inject`：注入到正在运行的进程 (`RENDERDOC_InjectIntoProcess`)。
    *   `replay`：加载捕获文件 (`RENDERDOC_OpenCaptureFile`) 并在预览窗口中回放 (`DisplayRendererPreview`)。
    *   `convert`：使用 `ICaptureFile::Convert` 在格式之间转换捕获文件（例如 `rdc` 到 `xml` 或 `zip`）。
    *   `thumb`：将嵌入的缩略图提取到文件（JPG, PNG 等）。
    *   `embed` / `extract`：向捕获文件添加或从中移除任意段。
    *   `remoteserver`：启动用于远程重放的服务器。

### 3.2 关键工作流

*   **捕获 (Capturing)**：
    ```bash
    renderdoccmd capture --working-dir "." --capture-file "my_capture" ./my_app
    ```
    这使用 `CaptureCommand`，它配置 `CaptureOptions` 并调用核心注入 API。

*   **重放 (Replaying)**：
    ```bash
    renderdoccmd replay my_capture.rdc
    ```
    这使用 `ReplayCommand` 打开文件并调用 `IReplayController` 创建设备并重放帧。

*   **转换 (Converting)**：
    ```bash
    renderdoccmd convert -f input.rdc -o output.xml -c xml
    ```
    这使用 `ConvertCommand`，它依赖于 `CaptureExporter` 机制。

### 3.3 API 交互

`rdccmd` 链接到 RenderDoc 核心库并使用导出的 C API（例如 `RENDERDOC_OpenCaptureFile`, `RENDERDOC_ExecuteAndInject`）。它作为如何以编程方式使用这些 API 的参考实现。


# MCP 

## 1. m_Sections 字段与解析规则详解

RenderDoc 的文件核心在于 `m_Sections`（段），每个段存储不同类型的数据。虽然文件格式是通用的块状结构，但语义由 `SectionType` 决定。

### 1.1 SectionType (段类型)

在 `rdc/renderdoc/api/replay/replay_enums.h` 中定义了 `SectionType` 枚举，关键类型如下：

| 类型 (SectionType) | 描述 | 解析规则 |
| :--- | :--- | :--- |
| **FrameCapture** | **核心数据**。包含实际的帧捕获指令流。 | 这是二进制块，需要特定驱动的 `StructuredProcessor` 将其反序列化为 `SDFile` (结构化数据)。这是 LLM 分析的重点。 |
| **ResolveDatabase** | 调用栈解析数据库。 | 包含平台特定的符号信息，用于将地址还原为函数名/行号。由 `CaptureFile::InitResolver` 解析。 |
| **ExtendedThumbnail** | 扩展缩略图。 | 存储非 JPEG 格式（如 PNG/EXR）的高保真缩略图。 |
| **Bookmarks** | 书签。 | 存储用户在 UI 中添加的书签（JSON 格式）。 |
| **Notes** | 备注。 | 存储用户添加的文本备注（JSON 格式）。 |
| **ResourceRenames** | 资源重命名。 | 存储用户对资源的自定义命名（JSON 格式）。 |
| **EmbeddedLogfile** | 嵌入日志。 | 捕获时的调试日志。 |

### 1.2 FrameCapture 的内部结构 (SDFile)

`FrameCapture` 段是黑盒二进制，但 RenderDoc 的重放层将其转换为 **结构化数据 (Structured Data)**，这是理解捕获内容的关键。

核心类定义在 `rdc/renderdoc/api/replay/structured_data.h`：

1.  **`SDFile`**: 代表整个捕获文件的结构化视图。
    *   `chunks`: 一个 `SDChunk` 列表。
    *   `buffers`: 引用的二进制数据缓冲区列表。

2.  **`SDChunk` (块)**: 代表一个 API 调用 (如 `vkDraw`, `ID3D11DeviceContext::Draw`)。
    *   `metadata`: 包含 `chunkID` (函数 ID), `timestamp` (时间戳), `duration` (耗时), `callstack` (调用栈)。
    *   **继承自 `SDObject`**: 块本身就是一个结构化对象，包含函数的参数。

3.  **`SDObject` (对象)**: 构成数据的基本单元，呈树状结构。
    *   `name`: 参数名 (如 "vertexCount", "pCreateInfo")。
    *   `type`: 数据类型信息 (`SDType`)，包含基本类型 (`SDBasic`) 和标志位。
    *   `data`: 实际数据。
        *   **Basic Types**: `UnsignedInteger`, `Float`, `String`, `Boolean`, `Resource` (资源 ID), `Enum` (枚举)。
        *   **Composite Types**:
            *   `Struct`: 包含子 `SDObject` 列表 (如 `VkGraphicsPipelineCreateInfo`)。
            *   **Array**: 包含同类型的子 `SDObject` 列表。

**解析规则总结**：要理解 `.rdc` 的内容，不能仅看二进制流，必须通过 RenderDoc 运行时的 `StructuredProcessor` 将 `FrameCapture` 段“解压”为 `SDFile` 对象树。

---

## 2. MCP 规则设计 (LLM 辅助分析)

若要创建一个 MCP (Model Context Protocol) 服务，让 LLM 能够“看懂”并分析 `.rdc` 文件，我们需要将上述的 `SDFile` 转换为 LLM 易于理解的文本/JSON 格式。

由于 `.rdc` 文件包含海量数据（可能有数万个 Draw Call），直接 Dump 全部数据给 LLM 是不可行的。

### 2.1 MCP 工具 (Tools) 需求

我们需要提供一组分层的工具，让 LLM 按需查询：

1.  **`rdc_get_summary` (获取摘要)**
    *   **输入**: 无。
    *   **返回**:
        *   API 版本 (Vulkan/D3D)。
        *   设备信息 (GPU Vendor/Model)。
        *   帧统计 (Draw Call 数量, Dispatch 数量)。
        *   关键资源列表 (Render Targets, Shaders)。
        *   存在的问题/警告 (如果有 API Validation 错误)。

2.  **`rdc_get_action_tree` (获取动作树)**
    *   **输入**: `limit` (可选，限制层级深度), `filter` (可选，如 "Draw", "Dispatch")。
    *   **返回**: 帧的层级结构列表 (Pass -> Draw Call)。
    *   **格式**: 简化版的 JSON，只包含 `EID` (Event ID), `Name` (函数名), `耗时`。
    *   **目的**: 让 LLM 了解帧的整体流程，找到感兴趣的 EID。

3.  **`rdc_inspect_action` (检查动作详情)**
    *   **输入**: `eid` (Event ID)。
    *   **返回**: 指定 EID 对应的 `SDChunk` 的完整详情。
    *   **格式**: 详细 JSON，包含所有参数 (Parameters) 和绑定的资源 ID。
    *   **目的**: 分析特定 Draw Call 的参数是否正确（如 Viewport 大小, 绑定的 Pipeline）。

4.  **`rdc_inspect_resource` (检查资源详情)**
    *   **输入**: `resource_id`。
    *   **返回**: 资源的详细信息 (Format, Size, Usage, Debug Name)。
    *   **目的**: 确认纹理/Buffer 是否符合预期。

### 2.2 上下文信息 (Context)

除了工具，MCP Server 可以在初始化时将 `rdc_get_summary` 的结果放入 System Prompt，让 LLM 对当前分析的文件有一个基本认知。

---

## 3. 对 RDC 代码库的更改需求

目前的 `renderdoccmd` 虽然有 `convert` 功能，但输出格式不适合 LLM (XML 太啰嗦，Chrome JSON 只有时间轴)。我们需要在 `rdc` 代码库中进行以下更改：

### 3.1 新增 JSON 序列化器 (`SDObject` -> JSON)

我们需要一个能将 `SDObject` 树高效转换为 JSON 的模块。
*   **位置**: `rdc/renderdoc/serialise/codecs/json_codec_llm.cpp` (新建)。
*   **逻辑**:
    *   遍历 `SDObject`。
    *   将 `SDBasic::Struct` 转为 JSON Object `{}`。
    *   将 `SDBasic::Array` 转为 JSON Array `[]`。
    *   将 `SDBasic::Resource` 转为 `{"id": 123, "name": "Texture A"}`。
    *   **关键点**: 处理由 `enum` 定义的常量，将其转为字符串 (如 `VK_FORMAT_R8G8B8A8_UNORM`) 而不是纯数字，这对 LLM 理解至关重要。RenderDoc 的 `SDObject` 包含 `HasCustomString` 标志或 `makeSDEnum` 辅助函数，需利用这些信息。

### 3.2 扩展 `renderdoccmd`

新增一个子命令 `query` 或扩展 `convert`，或者直接实现一个简易的 HTTP/MCP Server 模式。

**推荐方案: 新增 `renderdoccmd mcp-bridge` 子命令**

修改 `rdc/renderdoccmd/renderdoccmd.cpp`，添加 `McpBridgeCommand`：

1.  **交互模式**: 该命令启动后，从标准输入 (stdin) 读取 JSON 请求，向标准输出 (stdout) 打印 JSON 响应。
2.  **实现逻辑**:
    *   加载 `.rdc` 文件 (`CaptureFile::OpenFile`)。
    *   调用 `CaptureFile::InitStructuredData()` 获取 `SDFile`。
    *   根据请求类型 (`summary`, `tree`, `detail`)，筛选 `SDFile` 中的数据。
    *   使用上述的 JSON 序列化器输出结果。

### 3.3 示例代码片段 (JSON 序列化逻辑)

```cpp
// 伪代码：将 SDObject 转为 JSON
json ExtractSDObject(const SDObject *obj) {
    if (obj->type.basetype == SDBasic::Struct) {
        json j;
        for(auto child : obj->data.children) {
            j[child->name.c_str()] = ExtractSDObject(child);
        }
        return j;
    } else if (obj->type.basetype == SDBasic::UnsignedInteger) {
        // 尝试获取枚举字符串
        if (obj->type.basetype == SDBasic::Enum)
             return obj->data.str.c_str(); // 假设已填充 CustomString
        return obj->data.basic.u;
    }
    // ... 其他类型处理
}
```

### 3.4 总结

要实现 LLM 辅助分析，**不需要**修改 `.rdc` 的文件格式或核心存储逻辑。
**需要做的是**：
1.  利用现有的 `StructuredData` API。
2.  编写一个新的**导出/查询层** (在 `renderdoccmd` 中)，将内部复杂的 C++ 对象树转化为语义清晰、体积可控的 JSON 数据供 LLM 消费。