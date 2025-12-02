@echo off
REM RenderDoc Debug Agent - Quick Start Script for Windows

echo 🔍 RenderDoc Debug Agent - Quick Start
echo ======================================
echo.

REM Check if .env exists
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env and add your OpenAI API key for AI-powered analysis
    echo.
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

echo ✓ Python found
python --version

REM Create virtual environment if it doesn't exist
if not exist venv (
    echo 🔧 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo 📦 Installing dependencies...
pip install -q -r requirements.txt

REM Create uploads directory
if not exist uploads mkdir uploads

echo.
echo ✅ Setup complete!
echo.
echo 🚀 Starting RenderDoc Debug Agent...
echo    Open your browser to: http://localhost:5000
echo.
echo    Press Ctrl+C to stop the server
echo.

REM Run the application
python app.py

pause
