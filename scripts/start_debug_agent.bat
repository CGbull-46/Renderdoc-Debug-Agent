@echo off
REM RenderDoc Debug Agent one-click launcher (Windows).
REM
REM 1. Make sure you have:
REM    - Python 3.x installed and in PATH
REM    - Node.js + npm installed (for the orchestrator and frontend)
REM    - RenderDoc installed, with the Python binding configured
REM 2. Double-click this file to start:
REM    - Local MCP server (Python Agent)
REM    - Cloud Orchestrator (Node.js + OpenRouter)
REM    - Frontend web UI (React)
REM 3. When everything is ready, your browser will open http://localhost:3000

setlocal

REM === User configuration ===============================================
REM Orchestrator / frontend ports
if not defined ORCH_PORT (
  set "ORCH_PORT=8080"
)
if not defined FRONTEND_PORT (
  set "FRONTEND_PORT=3000"
)

REM ======================================================================

echo.
echo [1/3] Starting Python MCP server...
start "RenderDoc MCP Server" cmd /c "python -m agent && pause"

echo.
echo [2/3] Starting Node.js orchestrator...
pushd "%~dp0..\orchestrator"
if not exist node_modules (
  echo Installing Node.js dependencies for orchestrator...
  npm install ws axios
)
start "RenderDoc Orchestrator" cmd /c "node server.js && pause"
popd

echo.
echo [3/3] Starting React frontend...
pushd "%~dp0..\frontend"
if not exist node_modules (
  echo Installing Node.js dependencies for frontend (this may take a while)...
  npm install
)
start "RenderDoc Frontend" cmd /c "npm run start"
popd

echo.
echo All components are starting. When the frontend is ready, it will be available at:
echo   http://localhost:%FRONTEND_PORT%
start "" "http://localhost:%FRONTEND_PORT%"

endlocal
