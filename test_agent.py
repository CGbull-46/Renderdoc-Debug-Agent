"""
Unit tests for RenderDoc Debug Agent
"""

import unittest
import os
import tempfile
from renderdoc_analyzer import RenderDocAnalyzer
from ai_analyzer import AIAnalyzer


class TestRenderDocAnalyzer(unittest.TestCase):
    """Test RenderDoc analyzer functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.analyzer = RenderDocAnalyzer()
        
    def test_analyzer_initialization(self):
        """Test analyzer initializes correctly."""
        self.assertIsNotNone(self.analyzer)
    
    def test_mock_analysis(self):
        """Test mock analysis with a temporary file."""
        # Create a temporary file to simulate an RDC file
        with tempfile.NamedTemporaryFile(suffix='.rdc', delete=False) as f:
            # Write some dummy data
            f.write(b'RDC\x00' + b'\x00' * 1000)
            temp_path = f.name
        
        try:
            # Analyze the file
            result = self.analyzer.analyze(temp_path)
            
            # Check result structure
            self.assertIsInstance(result, dict)
            self.assertIn('filepath', result)
            self.assertEqual(result['filepath'], temp_path)
            self.assertIn('file_size', result)
            
        finally:
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)


class TestAIAnalyzer(unittest.TestCase):
    """Test AI analyzer functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.analyzer = AIAnalyzer()
    
    def test_analyzer_initialization(self):
        """Test analyzer initializes correctly."""
        self.assertIsNotNone(self.analyzer)
    
    def test_mock_analysis(self):
        """Test mock AI analysis."""
        # Sample RenderDoc data
        sample_data = {
            'mode': 'mock',
            'filepath': '/test/sample.rdc',
            'file_size': 1024000,
            'file_size_mb': 1.0,
            'api': 'DirectX 11'
        }
        
        # Analyze
        result = self.analyzer.analyze(sample_data)
        
        # Check result structure
        self.assertIsInstance(result, dict)
        self.assertIn('analysis', result)
        self.assertIsInstance(result['analysis'], str)
        
        # Should have issues detected
        if 'issues_detected' in result:
            self.assertIsInstance(result['issues_detected'], list)
        
        # Should have recommendations
        if 'recommendations' in result:
            self.assertIsInstance(result['recommendations'], list)
        
        # Should have shader fixes
        if 'shader_fixes' in result:
            self.assertIsInstance(result['shader_fixes'], list)
            if result['shader_fixes']:
                fix = result['shader_fixes'][0]
                self.assertIn('code', fix)
                self.assertIn('language', fix)


class TestIntegration(unittest.TestCase):
    """Integration tests."""
    
    def test_full_pipeline(self):
        """Test the full analysis pipeline."""
        # Create a temporary RDC file
        with tempfile.NamedTemporaryFile(suffix='.rdc', delete=False) as f:
            f.write(b'RDC\x00' + b'\x00' * 5000)
            temp_path = f.name
        
        try:
            # Run RenderDoc analysis
            rd_analyzer = RenderDocAnalyzer()
            rd_result = rd_analyzer.analyze(temp_path)
            
            # Run AI analysis
            ai_analyzer = AIAnalyzer()
            ai_result = ai_analyzer.analyze(rd_result)
            
            # Verify results
            self.assertIsInstance(rd_result, dict)
            self.assertIsInstance(ai_result, dict)
            
        finally:
            # Clean up
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == '__main__':
    unittest.main()
