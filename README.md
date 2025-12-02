# RenderDoc Debug Agent

🔍 AI-Powered Rendering Issue Analysis & Shader Debugging Tool

[English](README.md) | [中文文档](README_CN.md)

An intelligent agent that uses RenderDoc Python API combined with AI models to automatically analyze .rdc capture files, identify rendering issues (like NaN flashes, shader errors), and provide actionable fix recommendations.

## Features

- 📤 **Easy Upload**: Web-based interface for uploading .rdc capture files
- 🤖 **AI-Powered Analysis**: Uses advanced AI models for intelligent issue detection and root cause analysis
- 🎨 **RenderDoc Integration**: Leverages RenderDoc Python API for deep capture analysis
- ⚡ **Issue Detection**: Automatically detects common rendering problems:
  - NaN/Infinity values causing flashing
  - Shader compilation and runtime errors
  - Precision issues
  - Blending problems
  - Resource binding issues
  - Performance bottlenecks
- 🔧 **Shader Fixes**: Provides specific shader code fixes with before/after examples
- 💡 **Smart Recommendations**: Actionable suggestions to resolve identified issues

## Quick Start

### Prerequisites

- Python 3.8 or higher
- (Optional) RenderDoc with Python bindings for full analysis
- (Optional) OpenAI API key for AI-powered insights

### Installation

1. Clone the repository:
```bash
git clone https://github.com/haolange/Renderdoc-Debug-Agent.git
cd Renderdoc-Debug-Agent
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key (optional but recommended)
```

4. Run the application:
```bash
python app.py
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
# OpenAI API Configuration (optional but recommended for AI analysis)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo-preview

# Flask Configuration
FLASK_SECRET_KEY=your_secret_key_here
FLASK_ENV=development
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=104857600

# RenderDoc Configuration (optional)
RENDERDOC_PATH=/usr/bin/renderdoc
```

### Running Without AI

The tool works in two modes:

1. **AI-Powered Mode** (recommended): Requires OpenAI API key for intelligent analysis
2. **Rule-Based Mode**: Works without API key using heuristics and pattern matching

Even without RenderDoc Python bindings, the tool provides valuable analysis based on common rendering issue patterns.

## Usage

### Web Interface

1. Open http://localhost:5000 in your browser
2. Drag and drop your .rdc file or click to browse
3. Click "Analyze Capture"
4. Review the analysis results:
   - Issues detected with severity levels
   - Root cause analysis
   - Specific recommendations
   - Shader code fixes

### Analysis Results

The tool provides:

- **File Information**: Basic capture file details
- **AI Analysis**: Comprehensive analysis of the rendering data
- **Issues Detected**: List of identified problems with severity levels (high/medium/low)
- **Recommendations**: Actionable steps to fix issues
- **Shader Fixes**: Specific code examples showing how to fix shader problems

## Common Issues Detected

### NaN/Infinity Flashing

**Symptoms**: Flickering pixels, black flashes, unstable rendering

**Common Causes**:
- Division by zero in shaders
- Normalizing zero-length vectors
- Square root of negative numbers
- Invalid mathematical operations

**Fix Example**:
```hlsl
// Before (can produce NaN):
float3 normal = normalize(input.normal);

// After (safe from NaN):
float3 normal = input.normal;
float lenSq = dot(normal, normal);
if (lenSq > 0.0001) {
    normal = normal * rsqrt(lenSq);
}
```

### Shader Precision Issues

**Symptoms**: Visual artifacts, incorrect calculations

**Common Causes**:
- Using low precision where high precision is needed
- Depth fighting
- Large coordinate values

**Fix Example**:
```hlsl
// Use appropriate precision
highp float depth = calculateDepth();
mediump float3 color = calculateColor();
```

### Division by Zero

**Symptoms**: NaN values, rendering artifacts

**Fix Example**:
```hlsl
// Before:
float result = a / b;

// After:
float result = a / max(b, 0.0001);
```

## Architecture

```
┌─────────────────┐
│   Web Browser   │
│  (index.html)   │
└────────┬────────┘
         │ Upload .rdc
         ▼
┌─────────────────┐
│   Flask App     │
│    (app.py)     │
└────────┬────────┘
         │
         ├──────────────┬──────────────┐
         ▼              ▼              ▼
┌──────────────┐ ┌─────────────┐ ┌──────────┐
│  RenderDoc   │ │ AI Analyzer │ │ File     │
│  Analyzer    │ │ (ai_analyzer│ │ Storage  │
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

## Development

### Project Structure

```
Renderdoc-Debug-Agent/
├── app.py                  # Main Flask application
├── renderdoc_analyzer.py   # RenderDoc API integration
├── ai_analyzer.py          # AI-powered analysis module
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
├── templates/
│   └── index.html         # Web interface
├── uploads/               # Uploaded files (created automatically)
└── README.md             # This file
```

### Adding Custom Analysis Rules

Edit `ai_analyzer.py` and add patterns to the `_mock_ai_analysis` method:

```python
common_issues.append({
    'type': 'Custom Issue Type',
    'description': 'Description of the issue',
    'causes': ['Cause 1', 'Cause 2'],
    'fixes': ['Fix suggestion 1', 'Fix suggestion 2']
})
```

## API Endpoints

- `GET /` - Main web interface
- `POST /upload` - Upload and analyze .rdc file
- `GET /health` - Health check endpoint

## Troubleshooting

### "RenderDoc Python module not available"

This means RenderDoc Python bindings are not installed. The tool will still work using file-based analysis and AI patterns.

To install RenderDoc with Python support:
- Windows/Linux: Install RenderDoc and ensure Python bindings are available
- Check RenderDoc documentation for Python API setup

### "AI analysis failed"

Check your `.env` file:
- Verify `OPENAI_API_KEY` is set correctly
- Ensure you have API credits
- Check internet connectivity

The tool will fall back to rule-based analysis if AI is unavailable.

### Large file upload fails

Increase `MAX_CONTENT_LENGTH` in `.env`:
```env
MAX_CONTENT_LENGTH=209715200  # 200MB
```

## Security Considerations

- Uploaded files are stored in the `uploads/` directory
- Set a strong `FLASK_SECRET_KEY` in production
- Keep your OpenAI API key secure
- Consider file size limits based on your server capacity
- Implement authentication for production deployments

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Mozilla Public License Version 2.0 - see the LICENSE file for details.

## Acknowledgments

- RenderDoc for the amazing graphics debugging tool
- OpenAI for AI capabilities
- The graphics programming community for insights on common rendering issues

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
