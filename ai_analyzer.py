"""
AI Analyzer Module
Uses AI models to analyze rendering issues and provide intelligent insights
"""

import os
import json
from typing import Dict, List, Any, Optional
from openai import OpenAI


class AIAnalyzer:
    """AI-powered analyzer for rendering issues using multimodal AI."""
    
    def __init__(self):
        """Initialize the AI analyzer."""
        self.api_key = os.getenv('OPENAI_API_KEY')
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4-turbo-preview')
        self.client = None
        
        if self.api_key and self.api_key != 'your_openai_api_key_here':
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                print(f"Warning: Failed to initialize OpenAI client: {e}")
                self.client = None
    
    def analyze(self, renderdoc_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze rendering data using AI to provide insights and recommendations.
        
        Args:
            renderdoc_data: Data extracted from RenderDoc analysis
            
        Returns:
            Dictionary containing AI-generated insights
        """
        if self.client is None:
            return self._mock_ai_analysis(renderdoc_data)
        
        try:
            # Prepare the analysis prompt
            prompt = self._create_analysis_prompt(renderdoc_data)
            
            # Call AI model
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse response
            ai_response = response.choices[0].message.content
            
            # Structure the insights
            insights = {
                'analysis': ai_response,
                'issues_detected': self._extract_issues(ai_response),
                'recommendations': self._extract_recommendations(ai_response),
                'shader_fixes': self._extract_shader_fixes(ai_response),
                'model_used': self.model
            }
            
            return insights
            
        except Exception as e:
            return {
                'error': f'AI analysis failed: {str(e)}',
                'fallback': self._mock_ai_analysis(renderdoc_data)
            }
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for the AI model."""
        return """You are an expert graphics programmer and rendering engineer specializing in debugging graphics issues. 
You have deep knowledge of:
- Graphics APIs (DirectX, Vulkan, OpenGL, Metal)
- Shader programming (HLSL, GLSL, etc.)
- Common rendering issues (NaN values, precision errors, blending issues, depth problems)
- Performance optimization
- GPU debugging techniques

Analyze the provided RenderDoc capture data and provide:
1. Identification of rendering issues (especially NaN/Inf values, shader errors, incorrect states)
2. Root cause analysis of problems
3. Specific, actionable recommendations to fix issues
4. Shader code suggestions when relevant
5. Performance insights

Be specific and technical in your analysis. Format your response clearly with sections for:
- Issues Found
- Root Cause Analysis
- Recommendations
- Shader Fixes (if applicable)"""
    
    def _create_analysis_prompt(self, data: Dict[str, Any]) -> str:
        """Create a detailed prompt from RenderDoc data."""
        # Format the data for analysis
        data_summary = json.dumps(data, indent=2, default=str)
        
        prompt = f"""Analyze this RenderDoc capture data and identify rendering issues:

{data_summary}

Please provide:
1. All rendering issues you can identify (especially NaN flashes, shader errors, state issues)
2. Root cause of each issue
3. Specific steps to fix each issue
4. Any shader code that needs to be modified (with before/after examples)
5. Performance recommendations

Focus especially on:
- NaN or Inf values that could cause flashing
- Shader compilation or runtime errors
- Incorrect render states
- Resource binding issues
- Performance bottlenecks
"""
        return prompt
    
    def _extract_issues(self, response: str) -> List[Dict[str, str]]:
        """Extract issues from AI response."""
        issues = []
        
        # Simple extraction based on common patterns
        lines = response.split('\n')
        in_issues_section = False
        
        for line in lines:
            line = line.strip()
            if 'issue' in line.lower() and ('found' in line.lower() or 'detected' in line.lower()):
                in_issues_section = True
                continue
            
            if in_issues_section and line and (line.startswith('-') or line.startswith('*') or line.startswith('1.')):
                issues.append({
                    'description': line.lstrip('-*0123456789. '),
                    'severity': 'medium'  # Default severity
                })
        
        return issues if issues else [{'description': 'See full analysis for details', 'severity': 'info'}]
    
    def _extract_recommendations(self, response: str) -> List[str]:
        """Extract recommendations from AI response."""
        recommendations = []
        
        lines = response.split('\n')
        in_recommendations = False
        
        for line in lines:
            line = line.strip()
            if 'recommendation' in line.lower():
                in_recommendations = True
                continue
            
            if in_recommendations and line and (line.startswith('-') or line.startswith('*') or line.startswith('1.')):
                recommendations.append(line.lstrip('-*0123456789. '))
        
        return recommendations if recommendations else ['See full analysis for detailed recommendations']
    
    def _extract_shader_fixes(self, response: str) -> List[Dict[str, str]]:
        """Extract shader fix suggestions from AI response."""
        fixes = []
        
        # Look for code blocks or shader-related sections
        if '```' in response:
            parts = response.split('```')
            for i in range(1, len(parts), 2):
                code = parts[i].strip()
                if code:
                    # Try to determine language
                    lang = 'hlsl'
                    if code.startswith('glsl') or code.startswith('GLSL'):
                        lang = 'glsl'
                        code = '\n'.join(code.split('\n')[1:])
                    elif code.startswith('hlsl') or code.startswith('HLSL'):
                        code = '\n'.join(code.split('\n')[1:])
                    
                    fixes.append({
                        'language': lang,
                        'code': code,
                        'description': 'Shader fix suggestion'
                    })
        
        return fixes
    
    def _mock_ai_analysis(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Provide mock AI analysis when API is not available.
        This uses rule-based heuristics.
        """
        issues = []
        recommendations = []
        shader_fixes = []
        
        # Analyze the data structure
        if 'error' in data:
            issues.append({
                'type': 'analysis_error',
                'severity': 'high',
                'description': f"Analysis error: {data.get('error')}",
            })
        
        if data.get('mode') == 'mock':
            issues.append({
                'type': 'limited_analysis',
                'severity': 'info',
                'description': 'Running in limited analysis mode without RenderDoc API'
            })
            recommendations.append('Install RenderDoc with Python bindings for comprehensive analysis')
        
        # Check file size for potential issues
        if 'file_size_mb' in data:
            size_mb = data['file_size_mb']
            if size_mb > 500:
                issues.append({
                    'type': 'performance',
                    'severity': 'medium',
                    'description': f'Large capture file ({size_mb}MB) may indicate excessive draw calls or resource usage'
                })
                recommendations.append('Consider optimizing draw call count and texture/buffer sizes')
        
        # Common rendering issue patterns
        common_issues = [
            {
                'type': 'NaN Detection',
                'description': 'NaN values in shaders often cause flickering or black pixels',
                'causes': [
                    'Division by zero in shader code',
                    'Square root of negative numbers',
                    'Invalid vector normalization (zero-length vectors)',
                    'Logarithm of zero or negative numbers'
                ],
                'fixes': [
                    'Add defensive checks: if (length(v) > 0.0001) normalize(v)',
                    'Clamp values before division: x / max(y, 0.0001)',
                    'Use saturate() or clamp() on intermediate results'
                ]
            },
            {
                'type': 'Shader Precision',
                'description': 'Precision issues can cause artifacts',
                'causes': [
                    'Using mediump where highp is needed',
                    'Large coordinate values losing precision',
                    'Depth fighting due to precision'
                ],
                'fixes': [
                    'Use highp for positions and coordinates',
                    'Implement reverse-Z depth buffer',
                    'Use logarithmic depth for large scenes'
                ]
            },
            {
                'type': 'Blending Issues',
                'description': 'Incorrect blend states can cause visual artifacts',
                'causes': [
                    'Wrong blend equation',
                    'Pre-multiplied alpha not handled correctly',
                    'Blend state not set per render target'
                ],
                'fixes': [
                    'Verify blend factors match your alpha mode',
                    'Use separate blend for color and alpha',
                    'Check alpha output from pixel shader'
                ]
            }
        ]
        
        # Example shader fix for NaN issues
        shader_fixes.append({
            'language': 'hlsl',
            'code': '''// Before (can produce NaN):
float3 normal = normalize(input.normal);
float intensity = dot(normal, lightDir);

// After (safe from NaN):
float3 normal = input.normal;
float lenSq = dot(normal, normal);
if (lenSq > 0.0001) {
    normal = normal * rsqrt(lenSq);  // Fast normalize
}
float intensity = saturate(dot(normal, lightDir));''',
            'description': 'Safe normalization to prevent NaN from zero-length vectors'
        })
        
        shader_fixes.append({
            'language': 'hlsl',
            'code': '''// Before (can produce NaN):
float result = someValue / divisor;

// After (safe from division by zero):
float result = someValue / max(divisor, 0.0001);

// Or use conditional:
float result = abs(divisor) > 0.0001 ? someValue / divisor : 0.0;''',
            'description': 'Prevent division by zero in shaders'
        })
        
        analysis = f"""
AI Analysis Report (Rule-based fallback mode)

OVERVIEW:
This is a rule-based analysis. For AI-powered insights, configure OpenAI API key.

COMMON RENDERING ISSUES TO CHECK:

1. NaN/Infinity Flashing:
   - Often caused by division by zero or normalizing zero-length vectors
   - Check all normalize() calls in shaders
   - Validate denominators before division
   - Use saturate() or clamp() to bound values

2. Shader Precision:
   - Ensure appropriate precision qualifiers
   - Check for depth precision issues
   - Verify coordinate system scales

3. State Management:
   - Verify render states are set correctly
   - Check depth/stencil configuration
   - Validate blend modes

4. Resource Binding:
   - Ensure all shader resources are bound
   - Check for uninitialized textures
   - Verify buffer sizes and formats

RECOMMENDATIONS:
"""
        
        for issue in common_issues:
            analysis += f"\n{issue['type']}:\n"
            for cause in issue['causes']:
                analysis += f"  - {cause}\n"
        
        return {
            'mode': 'rule_based',
            'analysis': analysis.strip(),
            'issues_detected': issues,
            'recommendations': recommendations,
            'shader_fixes': shader_fixes,
            'common_patterns': common_issues,
            'note': 'Configure OPENAI_API_KEY for AI-powered analysis'
        }
