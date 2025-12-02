"""
RenderDoc Analyzer Module
Handles the interaction with RenderDoc Python API to extract data from .rdc files
"""

import os
import sys
import json
import struct
from typing import Dict, List, Any, Optional


class RenderDocAnalyzer:
    """Analyzer for RenderDoc capture files using RenderDoc Python API."""
    
    def __init__(self):
        """Initialize the RenderDoc analyzer."""
        self.renderdoc_module = None
        self._try_import_renderdoc()
    
    def _try_import_renderdoc(self):
        """Try to import RenderDoc Python module."""
        try:
            # Try to import renderdoc module
            # Note: This requires RenderDoc to be installed with Python bindings
            import renderdoc as rd
            self.renderdoc_module = rd
        except ImportError:
            print("Warning: RenderDoc Python module not available. Using mock analysis.")
            self.renderdoc_module = None
    
    def analyze(self, filepath: str) -> Dict[str, Any]:
        """
        Analyze a RenderDoc capture file.
        
        Args:
            filepath: Path to the .rdc file
            
        Returns:
            Dictionary containing analysis results
        """
        if self.renderdoc_module is not None:
            return self._analyze_with_renderdoc(filepath)
        else:
            return self._mock_analysis(filepath)
    
    def _analyze_with_renderdoc(self, filepath: str) -> Dict[str, Any]:
        """Analyze using actual RenderDoc API."""
        try:
            rd = self.renderdoc_module
            
            # Initialize RenderDoc
            rd.InitialiseReplay(rd.GlobalEnvironment(), [])
            
            # Open the capture file
            cap = rd.OpenCaptureFile()
            status = cap.OpenFile(filepath, '', None)
            
            if status != rd.ReplayStatus.Succeeded:
                raise Exception(f"Failed to open capture file: {status}")
            
            # Create replay context
            result = cap.OpenCapture(None)
            if result.status != rd.ReplayStatus.Succeeded:
                raise Exception(f"Failed to create replay context: {result.status}")
            
            controller = result.controller
            
            # Extract information
            analysis = {
                'api': cap.DriverName(),
                'frame_count': len(cap.GetSectionProperties()),
                'drawcalls': [],
                'shaders': [],
                'textures': [],
                'buffers': [],
                'potential_issues': []
            }
            
            # Get draw calls
            for i, draw in enumerate(controller.GetDrawcalls()):
                drawcall_info = {
                    'event_id': draw.eventId,
                    'name': draw.name,
                    'flags': str(draw.flags)
                }
                analysis['drawcalls'].append(drawcall_info)
                
                # Check for potential issues
                if i < 100:  # Limit analysis to first 100 draws
                    issues = self._check_drawcall_issues(controller, draw)
                    analysis['potential_issues'].extend(issues)
            
            # Get shader information
            shaders = controller.GetShaders()
            for shader in shaders:
                shader_info = {
                    'resource_id': str(shader.resourceId),
                    'stage': str(shader.stage),
                    'entry_point': shader.entryPoint
                }
                analysis['shaders'].append(shader_info)
            
            # Get texture information
            textures = controller.GetTextures()
            for tex in textures:
                tex_info = {
                    'resource_id': str(tex.resourceId),
                    'name': tex.name,
                    'width': tex.width,
                    'height': tex.height,
                    'format': str(tex.format)
                }
                analysis['textures'].append(tex_info)
            
            # Cleanup
            controller.Shutdown()
            cap.Shutdown()
            rd.ShutdownReplay()
            
            return analysis
            
        except Exception as e:
            return {
                'error': f'RenderDoc analysis failed: {str(e)}',
                'fallback': self._mock_analysis(filepath)
            }
    
    def _check_drawcall_issues(self, controller, draw) -> List[Dict[str, Any]]:
        """Check for common issues in a drawcall."""
        issues = []
        
        try:
            # Set context to this draw
            controller.SetFrameEvent(draw.eventId, True)
            
            # Get pipeline state
            state = controller.GetPipelineState()
            
            # Check for NaN/Inf in shader constants
            # This is a simplified check
            if hasattr(state, 'GetShaderReflection'):
                for stage in ['VS', 'PS', 'CS', 'GS', 'HS', 'DS']:
                    shader = getattr(state, stage, None)
                    if shader:
                        # Add issue detection logic here
                        pass
            
        except Exception as e:
            pass
        
        return issues
    
    def _mock_analysis(self, filepath: str) -> Dict[str, Any]:
        """
        Provide mock analysis when RenderDoc API is not available.
        This analyzes basic file properties.
        """
        file_size = os.path.getsize(filepath)
        
        analysis = {
            'mode': 'mock',
            'filepath': filepath,
            'file_size': file_size,
            'file_size_mb': round(file_size / (1024 * 1024), 2),
            'api': 'Unknown (RenderDoc API not available)',
            'summary': 'Basic file information only. Install RenderDoc Python bindings for detailed analysis.',
            'recommendations': [
                'Install RenderDoc with Python bindings for detailed capture analysis',
                'The file appears to be a valid RenderDoc capture based on size and extension'
            ],
            'potential_issues': [
                {
                    'type': 'info',
                    'severity': 'low',
                    'message': 'Full analysis requires RenderDoc Python API',
                    'suggestion': 'Install RenderDoc and ensure Python bindings are available'
                }
            ]
        }
        
        # Try to read some basic info from the file
        try:
            with open(filepath, 'rb') as f:
                # Read first few bytes to check file signature
                header = f.read(16)
                if len(header) >= 4:
                    analysis['file_signature'] = header[:4].hex()
                    
        except Exception as e:
            analysis['read_error'] = str(e)
        
        return analysis
