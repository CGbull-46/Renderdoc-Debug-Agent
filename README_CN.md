# RenderDoc Debug Agent

🔍 AI驱动的渲染问题分析与Shader调试工具

一个智能代理，结合RenderDoc Python API和AI模型，自动分析.rdc捕获文件，识别渲染问题（如NaN闪烁、Shader错误），并提供可执行的修复建议。

## 功能特性

- 📤 **简单上传**: 基于Web的界面，轻松上传.rdc捕获文件
- 🤖 **AI驱动分析**: 使用先进的AI模型进行智能问题检测和根因分析
- 🎨 **RenderDoc集成**: 利用RenderDoc Python API进行深度捕获分析
- ⚡ **问题检测**: 自动检测常见渲染问题：
  - 导致闪烁的NaN/无穷值
  - Shader编译和运行时错误
  - 精度问题
  - 混合问题
  - 资源绑定问题
  - 性能瓶颈
- 🔧 **Shader修复**: 提供具体的Shader代码修复，包含修改前后的示例
- 💡 **智能建议**: 提供可执行的建议来解决已识别的问题

## 快速开始

### 前置要求

- Python 3.8或更高版本
- （可选）安装Python绑定的RenderDoc，用于完整分析
- （可选）OpenAI API密钥，用于AI驱动的洞察

### 安装

1. 克隆仓库：
```bash
git clone https://github.com/haolange/Renderdoc-Debug-Agent.git
cd Renderdoc-Debug-Agent
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 配置环境变量：
```bash
cp .env.example .env
# 编辑.env并添加您的OpenAI API密钥（可选但推荐）
```

4. 运行应用：
```bash
python app.py
```

5. 打开浏览器访问：
```
http://localhost:5000
```

## 配置说明

基于`.env.example`创建`.env`文件：

```env
# OpenAI API配置（可选但推荐用于AI分析）
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Flask配置
FLASK_SECRET_KEY=your_secret_key_here
FLASK_ENV=development
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=104857600

# RenderDoc配置（可选）
RENDERDOC_PATH=/usr/bin/renderdoc
```

### 无AI运行

工具支持两种模式：

1. **AI驱动模式**（推荐）：需要OpenAI API密钥进行智能分析
2. **基于规则模式**：无需API密钥，使用启发式和模式匹配

即使没有RenderDoc Python绑定，工具也能基于常见渲染问题模式提供有价值的分析。

## 使用方法

### Web界面

1. 在浏览器中打开 http://localhost:5000
2. 拖放您的.rdc文件或点击浏览
3. 点击"分析捕获"
4. 查看分析结果：
   - 检测到的问题及严重程度
   - 根因分析
   - 具体建议
   - Shader代码修复

### 分析结果

工具提供：

- **文件信息**：基本捕获文件详情
- **AI分析**：渲染数据的综合分析
- **检测到的问题**：已识别问题列表，包含严重程度（高/中/低）
- **建议**：修复问题的可执行步骤
- **Shader修复**：展示如何修复Shader问题的具体代码示例

## 常见检测问题

### NaN/无穷值闪烁

**症状**：像素闪烁、黑色闪光、渲染不稳定

**常见原因**：
- Shader中除以零
- 标准化零长度向量
- 负数的平方根
- 无效的数学运算

**修复示例**：
```hlsl
// 修改前（可能产生NaN）：
float3 normal = normalize(input.normal);

// 修改后（防止NaN）：
float3 normal = input.normal;
float lenSq = dot(normal, normal);
if (lenSq > 0.0001) {
    normal = normal * rsqrt(lenSq);
}
```

### Shader精度问题

**症状**：视觉伪影、计算错误

**常见原因**：
- 在需要高精度时使用低精度
- 深度冲突
- 大坐标值

**修复示例**：
```hlsl
// 使用适当的精度
highp float depth = calculateDepth();
mediump float3 color = calculateColor();
```

### 除以零

**症状**：NaN值、渲染伪影

**修复示例**：
```hlsl
// 修改前：
float result = a / b;

// 修改后：
float result = a / max(b, 0.0001);
```

## 架构

```
┌─────────────────┐
│   Web浏览器      │
│  (index.html)   │
└────────┬────────┘
         │ 上传.rdc
         ▼
┌─────────────────┐
│   Flask应用      │
│    (app.py)     │
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌──────────┐
│  RenderDoc   │ │ AI分析器     │ │ 文件存储  │
│  分析器      │ │ (ai_analyzer│ │          │
│ (renderdoc_  │ │    .py)     │ │          │
│  analyzer.py)│ └─────────────┘ └──────────┘
└──────────────┘       │
      │                │
      │         ┌──────▼─────┐
      │         │  OpenAI    │
      │         │    API     │
      │         └────────────┘
      │
┌─────▼────────┐
│  RenderDoc   │
│  Python API  │
└──────────────┘
```

## 开发

### 项目结构

```
Renderdoc-Debug-Agent/
├── app.py                  # 主Flask应用
├── renderdoc_analyzer.py   # RenderDoc API集成
├── ai_analyzer.py          # AI驱动的分析模块
├── requirements.txt        # Python依赖
├── .env.example           # 环境变量模板
├── templates/
│   └── index.html         # Web界面
├── uploads/               # 上传文件（自动创建）
└── README.md             # 本文件
```

## Docker部署

### 使用Docker Compose（推荐）

```bash
# 创建.env文件并设置您的API密钥
cp .env.example .env

# 构建并运行
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 使用Docker

```bash
# 构建镜像
docker build -t renderdoc-debug-agent .

# 运行容器
docker run -d -p 5000:5000 \
  -v $(pwd)/uploads:/app/uploads \
  -e OPENAI_API_KEY=your_key \
  renderdoc-debug-agent
```

## API端点

- `GET /` - 主Web界面
- `POST /upload` - 上传并分析.rdc文件
- `GET /health` - 健康检查端点

## 故障排除

### "RenderDoc Python模块不可用"

这意味着未安装RenderDoc Python绑定。工具仍可使用基于文件的分析和AI模式工作。

### "AI分析失败"

检查您的`.env`文件：
- 验证`OPENAI_API_KEY`设置正确
- 确保您有API额度
- 检查网络连接

如果AI不可用，工具将回退到基于规则的分析。

## 安全考虑

- 上传的文件存储在`uploads/`目录
- 在生产环境中设置强`FLASK_SECRET_KEY`
- 保护好您的OpenAI API密钥
- 根据服务器容量考虑文件大小限制
- 为生产部署实施身份验证

## 贡献

欢迎贡献！请随时提交Pull Request。

## 许可证

本项目采用Mozilla公共许可证2.0版 - 详见LICENSE文件。

## 致谢

- RenderDoc提供的出色图形调试工具
- OpenAI提供的AI能力
- 图形编程社区对常见渲染问题的见解

## 支持

如有问题、疑问或建议，请在GitHub上开启issue。

---

## 相关文档

- [英文README](README.md)
- [API文档](API.md)
- [部署指南](DEPLOYMENT.md)
- [问题修复指南](ISSUES_GUIDE.md)
