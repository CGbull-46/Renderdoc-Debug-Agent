#!/bin/bash

# RenderDoc Debug Agent - Quick Start Script

set -e

echo "🔍 RenderDoc Debug Agent - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your OpenAI API key for AI-powered analysis"
    echo ""
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip."
    exit 1
fi

echo "✓ pip3 found"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "🔧 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -q -r requirements.txt

# Create uploads directory
mkdir -p uploads

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Starting RenderDoc Debug Agent..."
echo "   Open your browser to: http://localhost:5000"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""

# Run the application
python app.py
