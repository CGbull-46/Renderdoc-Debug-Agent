@echo off
setlocal enabledelayedexpansion

REM RenderDoc Debug Agent - Frontend Preview Launcher
REM Double-click to start the frontend UI on http://localhost:3000

title RenderDoc Debug Agent - Frontend Preview

echo.
echo ========================================
echo RenderDoc Debug Agent - Frontend Preview  
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

REM Use quoted command only for paths with spaces; avoid call "npm" which breaks in cmd
if /I "%NPM_CMD%"=="npm" (
	set "NPM_CALL=npm"
) else (
	set "NPM_CALL=\"%NPM_CMD%\""
)

REM Go to frontend directory
cd /d "%~dp0runtime\\frontend"
if errorlevel 1 goto frontend_missing

echo [OK] Working directory: %CD%
echo.

REM Install dependencies if needed
if exist node_modules goto deps_installed
echo [STEP 1/2] Installing dependencies (first time only, please wait)...
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
echo [STEP 2/2] Starting Vite dev server on http://localhost:3000
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

:done

endlocal

