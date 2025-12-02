# API Documentation

## Overview

The RenderDoc Debug Agent provides a simple REST API for analyzing RenderDoc capture files.

## Base URL

```
http://localhost:5000
```

## Endpoints

### Health Check

Check if the service is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
    "status": "healthy"
}
```

**Status Codes:**
- `200 OK` - Service is healthy

---

### Upload and Analyze

Upload a RenderDoc capture file for analysis.

**Endpoint:** `POST /upload`

**Content-Type:** `multipart/form-data`

**Parameters:**
- `file` (required) - The .rdc file to analyze

**Example Request (cURL):**
```bash
curl -X POST http://localhost:5000/upload \
  -F "file=@/path/to/capture.rdc"
```

**Example Request (Python):**
```python
import requests

with open('capture.rdc', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:5000/upload', files=files)
    result = response.json()
```

**Success Response:**

```json
{
    "success": true,
    "filename": "capture.rdc",
    "renderdoc_analysis": {
        "mode": "mock",
        "filepath": "/path/to/capture.rdc",
        "file_size": 1048576,
        "file_size_mb": 1.0,
        "api": "DirectX 11",
        "summary": "Basic file information...",
        "recommendations": [
            "Install RenderDoc with Python bindings..."
        ],
        "potential_issues": [
            {
                "type": "info",
                "severity": "low",
                "message": "Full analysis requires RenderDoc Python API"
            }
        ]
    },
    "ai_insights": {
        "mode": "rule_based",
        "analysis": "AI Analysis Report...",
        "issues_detected": [
            {
                "type": "NaN Detection",
                "severity": "high",
                "description": "NaN values in shaders often cause flickering"
            }
        ],
        "recommendations": [
            "Add defensive checks in normalize() calls",
            "Clamp values before division"
        ],
        "shader_fixes": [
            {
                "language": "hlsl",
                "code": "float3 normal = normalize(input.normal);",
                "description": "Safe normalization"
            }
        ],
        "model_used": "gpt-4-turbo-preview",
        "note": "Configure OPENAI_API_KEY for AI-powered analysis"
    }
}
```

**Error Response:**

```json
{
    "success": false,
    "error": "Invalid file type. Only .rdc files are allowed."
}
```

**Status Codes:**
- `200 OK` - Analysis completed successfully
- `400 Bad Request` - Invalid request (no file, wrong file type)
- `500 Internal Server Error` - Analysis failed

---

## Data Structures

### RenderDoc Analysis Object

```typescript
{
    mode: string;              // "mock" or "renderdoc"
    filepath: string;          // Path to the analyzed file
    file_size: number;         // File size in bytes
    file_size_mb: number;      // File size in megabytes
    api?: string;              // Graphics API (e.g., "DirectX 11", "Vulkan")
    summary?: string;          // Summary of the analysis
    recommendations?: string[]; // List of recommendations
    potential_issues?: Issue[]; // List of detected issues
    
    // When RenderDoc API is available:
    frame_count?: number;      // Number of frames in capture
    drawcalls?: DrawCall[];    // List of draw calls
    shaders?: Shader[];        // List of shaders
    textures?: Texture[];      // List of textures
    buffers?: Buffer[];        // List of buffers
}
```

### AI Insights Object

```typescript
{
    mode: string;                    // "ai_powered" or "rule_based"
    analysis: string;                // Full analysis text
    issues_detected: Issue[];        // List of detected issues
    recommendations: string[];       // List of recommendations
    shader_fixes: ShaderFix[];      // List of shader fixes
    model_used?: string;            // AI model used (if applicable)
    note?: string;                  // Additional notes
    common_patterns?: IssuePattern[]; // Common issue patterns
}
```

### Issue Object

```typescript
{
    type: string;        // Issue type (e.g., "NaN Detection")
    severity: string;    // "high", "medium", "low", or "info"
    description: string; // Description of the issue
    message?: string;    // Additional message
    suggestion?: string; // Suggestion for fixing
}
```

### Shader Fix Object

```typescript
{
    language: string;    // Shader language (e.g., "hlsl", "glsl")
    code: string;        // Shader code
    description: string; // Description of the fix
}
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production use, consider implementing rate limiting based on your requirements.

---

## Authentication

Currently, the API does not require authentication. For production deployments, implement appropriate authentication mechanisms.

---

## CORS

By default, CORS is not enabled. To enable CORS, install `flask-cors`:

```bash
pip install flask-cors
```

Then add to `app.py`:

```python
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
```

---

## Error Handling

All errors are returned in JSON format:

```json
{
    "success": false,
    "error": "Error message description"
}
```

Common error messages:
- `No file provided` - No file was uploaded
- `No file selected` - File input was empty
- `Invalid file type. Only .rdc files are allowed.` - Wrong file extension
- `Analysis failed: <details>` - Analysis encountered an error

---

## Examples

### Full Example (Python)

```python
import requests
import json

def analyze_capture(filepath, server_url='http://localhost:5000'):
    """Analyze a RenderDoc capture file."""
    with open(filepath, 'rb') as f:
        files = {'file': f}
        response = requests.post(f'{server_url}/upload', files=files)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                return result
            else:
                raise Exception(result.get('error', 'Unknown error'))
        else:
            raise Exception(f'HTTP {response.status_code}: {response.text}')

# Usage
try:
    result = analyze_capture('my_capture.rdc')
    
    print(f"File: {result['filename']}")
    print(f"\nAI Analysis:\n{result['ai_insights']['analysis']}")
    
    print("\nIssues Detected:")
    for issue in result['ai_insights']['issues_detected']:
        print(f"  - [{issue['severity']}] {issue['description']}")
    
    print("\nRecommendations:")
    for rec in result['ai_insights']['recommendations']:
        print(f"  - {rec}")
        
except Exception as e:
    print(f"Error: {e}")
```

### Full Example (JavaScript/Node.js)

```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function analyzeCapture(filepath, serverUrl = 'http://localhost:5000') {
    const form = new FormData();
    form.append('file', fs.createReadStream(filepath));
    
    try {
        const response = await axios.post(`${serverUrl}/upload`, form, {
            headers: form.getHeaders()
        });
        
        if (response.data.success) {
            return response.data;
        } else {
            throw new Error(response.data.error || 'Unknown error');
        }
    } catch (error) {
        throw new Error(`Analysis failed: ${error.message}`);
    }
}

// Usage
analyzeCapture('my_capture.rdc')
    .then(result => {
        console.log(`File: ${result.filename}`);
        console.log(`\nAI Analysis:\n${result.ai_insights.analysis}`);
        
        console.log('\nIssues Detected:');
        result.ai_insights.issues_detected.forEach(issue => {
            console.log(`  - [${issue.severity}] ${issue.description}`);
        });
        
        console.log('\nRecommendations:');
        result.ai_insights.recommendations.forEach(rec => {
            console.log(`  - ${rec}`);
        });
    })
    .catch(error => {
        console.error(`Error: ${error.message}`);
    });
```

### Full Example (cURL)

```bash
#!/bin/bash

# Upload and analyze
RESPONSE=$(curl -s -X POST http://localhost:5000/upload \
  -F "file=@capture.rdc")

# Check if successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo "Analysis successful!"
    
    # Extract and display results
    echo "$RESPONSE" | jq -r '.ai_insights.analysis'
    
    echo -e "\nIssues Detected:"
    echo "$RESPONSE" | jq -r '.ai_insights.issues_detected[] | "  - [\(.severity)] \(.description)"'
    
    echo -e "\nRecommendations:"
    echo "$RESPONSE" | jq -r '.ai_insights.recommendations[] | "  - \(.)"'
else
    echo "Analysis failed:"
    echo "$RESPONSE" | jq -r '.error'
fi
```

---

## Best Practices

1. **File Size**: Keep capture files under 100MB for optimal performance
2. **Error Handling**: Always check the `success` field in responses
3. **Timeouts**: Set appropriate timeouts as analysis may take several seconds
4. **Retries**: Implement retry logic for transient failures
5. **Validation**: Validate file extensions client-side before uploading

---

## Deployment Considerations

### Environment Variables

Set these environment variables for production:

- `OPENAI_API_KEY` - Your OpenAI API key for AI analysis
- `FLASK_SECRET_KEY` - A strong secret key for Flask sessions
- `FLASK_ENV` - Set to "production"
- `MAX_CONTENT_LENGTH` - Maximum upload size in bytes

### Security

1. Implement authentication for the API
2. Use HTTPS in production
3. Validate and sanitize all inputs
4. Implement rate limiting
5. Set appropriate CORS policies
6. Regularly rotate API keys

### Scaling

For high-traffic scenarios:
1. Use a production WSGI server (gunicorn, uwsgi)
2. Implement caching for common analysis patterns
3. Use a task queue (Celery) for long-running analyses
4. Deploy behind a load balancer
5. Use object storage for uploaded files
