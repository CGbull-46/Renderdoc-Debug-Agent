@echo off
setlocal

set "PY_CMD=%~1"
set "PY_ARGS=%~2"

if not defined PY_CMD set "PY_CMD=python"

set "PY_LAUNCH=%PY_CMD%"
if defined PY_ARGS set "PY_LAUNCH=%PY_LAUNCH% %PY_ARGS%"

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

%PY_LAUNCH% -m runtime.agent
