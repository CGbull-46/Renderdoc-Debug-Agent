@echo off
setlocal enabledelayedexpansion

REM Normalize repo root without trailing backslash (cmd cannot cd into "...\")
for %%I in ("%~dp0.") do set "ROOT_DIR=%%~fI"

REM RenderDoc Debug Agent - Full Stack Launcher
REM Double-click to start MCP Agent + Orchestrator + Frontend UI on http://localhost:3000

title RenderDoc Debug Agent - Full Stack

echo.
echo ========================================
echo RenderDoc Debug Agent - Full Stack  
echo ========================================
echo.

REM Try to find npm in common locations
set "NPM_CMD="
where npm >nul 2>&1
if not errorlevel 1 set "NPM_CMD=npm" & goto npm_found

REM Try common Node.js installation paths
if exist "C:\Program Files\nodejs\npm.cmd" set "NPM_CMD=C:\Program Files\nodejs\npm.cmd" & goto npm_found
if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd" & goto npm_found
if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles(x86)%\nodejs\npm.cmd" & goto npm_found
if exist "%APPDATA%\npm\npm.cmd" set "NPM_CMD=%APPDATA%\npm\npm.cmd" & goto npm_found

:npm_not_found
echo [ERROR] npm not found!
echo.
echo Please do ONE of the following:
echo   1. Install Node.js from https://nodejs.org/
echo   2. If already installed, close ALL VS Code windows and reopen
echo   3. Restart your computer to refresh system PATH
echo.
echo This window will stay open. Close it when done.
echo.
pause
exit /b 1

:npm_found
echo [OK] Found npm: %NPM_CMD%
echo.

REM Try to find python
set "PY_CMD="
set "PY_ARGS="
where python >nul 2>&1
if not errorlevel 1 set "PY_CMD=python" & goto python_found
where py >nul 2>&1
if not errorlevel 1 set "PY_CMD=py" & set "PY_ARGS=-3" & goto python_found

:python_not_found
echo [ERROR] python not found!
echo.
echo Please do ONE of the following:
echo   1. Install Python 3.x from https://www.python.org/
echo   2. Ensure python or py is available in PATH
echo.
echo This window will stay open. Close it when done.
echo.
pause
exit /b 1

:python_found
if defined PY_ARGS (
  set "PY_LAUNCH=%PY_CMD% %PY_ARGS%"
) else (
  set "PY_LAUNCH=%PY_CMD%"
)
echo [OK] Found Python: %PY_LAUNCH%
echo.

REM Use quoted command only for paths with spaces; avoid call "npm" which breaks in cmd
if /I "%NPM_CMD%"=="npm" (
	set "NPM_CALL=npm"
) else (
	set "NPM_CALL=\"%NPM_CMD%\""
)

REM Pick an available MCP port (default 8765, fallback range)
call :pick_mcp_port 8765 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775 8776 8777 8778 8779 8780 8781 8782 8783 8784 8785
if not defined MCP_PORT_FOUND (
  powershell -NoProfile -Command "Write-Host '[ERROR] No free MCP port found; tried 8765-8785. Set MCP_PORT to another value.' -ForegroundColor Red" || echo [ERROR] No free MCP port found; tried 8765-8785. Set MCP_PORT to another value.
  pause
  exit /b 1
)
echo [OK] MCP port: %MCP_PORT%
echo.

REM Start local MCP agent
echo [STEP 1/4] Starting MCP Agent on ws://127.0.0.1:%MCP_PORT%
echo.
start "RenderDoc MCP Agent" /D "%ROOT_DIR%\runtime\agent" start_mcp_agent.cmd

REM Go to orchestrator directory
cd /d "%ROOT_DIR%\runtime\orchestrator"
if errorlevel 1 goto orchestrator_missing

echo [OK] Orchestrator directory: %CD%
echo.

REM Install dependencies if needed
if exist node_modules goto orch_deps_installed
echo [STEP 2/4] Installing orchestrator dependencies (first time only, please wait)...
echo.
call %NPM_CALL% install
if errorlevel 1 goto npm_install_failed
echo.
echo [OK] Orchestrator dependencies installed
echo.
goto start_orchestrator

:orch_deps_installed
echo [SKIP] Orchestrator dependencies already installed
echo.

:start_orchestrator
echo [STEP 2/4] Starting Orchestrator on http://localhost:8080 (MCP port %MCP_PORT%)
echo.
start "RenderDoc Orchestrator" "%ROOT_DIR%\runtime\orchestrator\start_orchestrator.cmd"

REM Go to frontend directory
cd /d "%ROOT_DIR%\runtime\frontend"
if errorlevel 1 goto frontend_missing

echo [OK] Working directory: %CD%
echo.

REM Install dependencies if needed
if exist node_modules goto deps_installed
echo [STEP 3/4] Installing frontend dependencies (first time only, please wait)...
echo.
call %NPM_CALL% install
if errorlevel 1 goto npm_install_failed
echo.
echo [OK] Dependencies installed
echo.
goto start_server

:deps_installed
echo [SKIP] Dependencies already installed
echo.

:start_server

REM Start the dev server
echo [STEP 4/4] Starting Vite dev server on http://localhost:3000
echo.
echo Opening browser in 3 seconds...
echo Press Ctrl+C in this window to stop the server
echo.

timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"

call %NPM_CALL% run dev

if errorlevel 1 goto dev_server_failed
goto done

:npm_install_failed
echo.
echo [ERROR] npm install failed
echo.
pause
exit /b 1

:dev_server_failed
echo.
echo [ERROR] Vite dev server failed to start
echo.
pause
goto done

:frontend_missing
echo [ERROR] Cannot find frontend directory
echo.
pause
exit /b 1

:orchestrator_missing
echo [ERROR] Cannot find orchestrator directory
echo.
pause
exit /b 1

:done

endlocal
exit /b 0

:pick_mcp_port
set "MCP_PORT="
set "MCP_PORT_FOUND="
for %%P in (%*) do (
  netstat -ano | findstr /R /C:":%%P .*LISTENING" >nul
  if errorlevel 1 (
    set "MCP_PORT=%%P"
    set "MCP_PORT_FOUND=1"
    goto :eof
  )
)
goto :eof

