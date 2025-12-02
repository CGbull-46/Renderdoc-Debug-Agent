#!/usr/bin/env python3
"""
Example script demonstrating programmatic use of RenderDoc Debug Agent
"""

import requests
import json
import sys


def analyze_rdc_file(filepath, server_url='http://localhost:5000'):
    """
    Analyze a RenderDoc capture file using the Debug Agent API.
    
    Args:
        filepath: Path to the .rdc file
        server_url: URL of the running Debug Agent server
        
    Returns:
        Analysis results as a dictionary
    """
    # Check if file exists
    try:
        with open(filepath, 'rb') as f:
            files = {'file': f}
            response = requests.post(f'{server_url}/upload', files=files)
            
            if response.status_code == 200:
                return response.json()
            else:
                return {
                    'error': f'Request failed with status {response.status_code}',
                    'details': response.text
                }
    except FileNotFoundError:
        return {'error': f'File not found: {filepath}'}
    except Exception as e:
        return {'error': f'Analysis failed: {str(e)}'}


def print_analysis_results(results):
    """Print formatted analysis results."""
    if 'error' in results:
        print(f"❌ Error: {results['error']}")
        if 'details' in results:
            print(f"Details: {results['details']}")
        return
    
    print("=" * 80)
    print("🔍 RENDERDOC DEBUG AGENT - ANALYSIS RESULTS")
    print("=" * 80)
    
    print(f"\n📁 File: {results.get('filename', 'Unknown')}")
    
    # AI Analysis
    if 'ai_insights' in results:
        ai = results['ai_insights']
        
        print("\n" + "=" * 80)
        print("🤖 AI ANALYSIS")
        print("=" * 80)
        print(ai.get('analysis', 'No analysis available'))
        
        # Issues
        if 'issues_detected' in ai and ai['issues_detected']:
            print("\n" + "=" * 80)
            print("⚠️  ISSUES DETECTED")
            print("=" * 80)
            for i, issue in enumerate(ai['issues_detected'], 1):
                severity = issue.get('severity', 'medium').upper()
                print(f"\n{i}. [{severity}] {issue.get('type', 'Issue')}")
                print(f"   {issue.get('description', 'No description')}")
        
        # Recommendations
        if 'recommendations' in ai and ai['recommendations']:
            print("\n" + "=" * 80)
            print("💡 RECOMMENDATIONS")
            print("=" * 80)
            for i, rec in enumerate(ai['recommendations'], 1):
                print(f"{i}. {rec}")
        
        # Shader Fixes
        if 'shader_fixes' in ai and ai['shader_fixes']:
            print("\n" + "=" * 80)
            print("🔧 SHADER FIXES")
            print("=" * 80)
            for i, fix in enumerate(ai['shader_fixes'], 1):
                print(f"\n{i}. {fix.get('description', 'Shader Fix')}")
                print(f"Language: {fix.get('language', 'Unknown')}")
                print("Code:")
                print("-" * 40)
                print(fix.get('code', 'No code available'))
                print("-" * 40)
    
    print("\n" + "=" * 80)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python example_usage.py <path_to_rdc_file>")
        print("Example: python example_usage.py captures/frame001.rdc")
        sys.exit(1)
    
    rdc_file = sys.argv[1]
    server = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:5000'
    
    print(f"Analyzing {rdc_file}...")
    print(f"Server: {server}\n")
    
    results = analyze_rdc_file(rdc_file, server)
    print_analysis_results(results)
