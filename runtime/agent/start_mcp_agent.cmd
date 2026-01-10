@echo off
setlocal EnableDelayedExpansion
set "ORIG_PATH=%PATH%"

for %%I in ("%~dp0..\..") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

set "TMP_OUT=%TEMP%\renderdoc_mcp_agent_py_out.txt"
set "TMP_ERR=%TEMP%\renderdoc_mcp_agent_py_err.txt"

set "PY_EXE="
set "PY_ARGS="
set "PY_SOURCE="
set "LOCAL_PY_DIR=%ROOT_DIR%\thirdparty\python"

if exist "%LOCAL_PY_DIR%\python.exe" (
  set "PY_EXE=%LOCAL_PY_DIR%\python.exe"
  set "PY_SOURCE=local"
) else if exist "%LOCAL_PY_DIR%\python3.exe" (
  set "PY_EXE=%LOCAL_PY_DIR%\python3.exe"
  set "PY_SOURCE=local"
)

if not defined PY_EXE (
  for /f "delims=" %%F in ('dir /b /s "%LOCAL_PY_DIR%\python.exe" 2^>nul') do (
    if not defined PY_EXE (
      set "PY_EXE=%%F"
      set "PY_SOURCE=local"
    )
  )
)

if not defined PY_EXE (
  where python >nul 2>&1
  if not errorlevel 1 set "PY_EXE=python" & set "PY_SOURCE=system"
)
if not defined PY_EXE (
  where py >nul 2>&1
  if not errorlevel 1 set "PY_EXE=py" & set "PY_ARGS=-3" & set "PY_SOURCE=system"
)

if not defined PY_EXE (
  powershell -NoProfile -Command "Write-Host '[ERROR] python not found!' -ForegroundColor Red" || echo [ERROR] python not found!
  echo.
  echo Please install Python 3.x or ensure python/py is on PATH.
  echo.
  pause
  exit /b 1
)

set "PY_DISPLAY=%PY_EXE%"
if defined PY_ARGS set "PY_DISPLAY=%PY_DISPLAY% %PY_ARGS%"

if /I "%PY_SOURCE%"=="system" (
  if not exist "%LOCAL_PY_DIR%\python.exe" (
    powershell -NoProfile -Command "Write-Host '[WARN] Bundled Python not found at thirdparty\\python\\python.exe; falling back to system Python.' -ForegroundColor Yellow" || echo [WARN] Bundled Python not found at thirdparty\python\python.exe; falling back to system Python.
  )
) else (
  echo [OK] Using bundled Python: %PY_DISPLAY%
  for %%H in ("%PY_EXE%") do set "PY_HOME=%%~dpH"
  set "PATH=!PY_HOME!;!PY_HOME!x64;%ORIG_PATH%"
  set "PYTHONHOME=!PY_HOME!"
  set "PYTHONPATH="
  set "PYTHONNOUSERSITE=1"
)

set "MCP_PORT_SOURCE=env"
if not defined MCP_PORT (
  set "MCP_PORT_SOURCE=default"
  set "MCP_PORT=8765"
)
if /I "%MCP_PORT_SOURCE%"=="default" (
  set "MCP_PORT_FOUND="
  call :pick_mcp_port 8765 8766 8767 8768 8769 8770 8771 8772 8773 8774 8775 8776 8777 8778 8779 8780 8781 8782 8783 8784 8785
  if not defined MCP_PORT_FOUND (
    powershell -NoProfile -Command "Write-Host '[ERROR] No free MCP port found; tried 8765-8785. Set MCP_PORT to another value.' -ForegroundColor Red" || echo [ERROR] No free MCP port found; tried 8765-8785. Set MCP_PORT to another value.
    pause
    exit /b 1
  )
) else (
  netstat -ano | findstr /R /C:":%MCP_PORT% .*LISTENING" >nul
  if not errorlevel 1 (
    powershell -NoProfile -Command "Write-Host '[ERROR] MCP port %MCP_PORT% already in use. Close existing MCP Agent or set MCP_PORT to another value.' -ForegroundColor Red" || echo [ERROR] MCP port %MCP_PORT% already in use. Close existing MCP Agent or set MCP_PORT to another value.
    pause
    exit /b 1
  )
)
echo [OK] MCP port: %MCP_PORT%

if exist "%ROOT_DIR%\thirdparty\renderdoc\renderdoc.pyd" (
  set "RENDERDOC_PYTHON_PATH=%ROOT_DIR%\thirdparty\renderdoc"
) else (
  if not defined RENDERDOC_PYTHON_PATH (
    set "RENDERDOC_PYTHON_PATH="
    for %%D in (
      "%ROOT_DIR%\rdc\build\bin"
      "%ROOT_DIR%\rdc\build\bin\Release"
      "%ROOT_DIR%\rdc\build\bin\RelWithDebInfo"
      "%ROOT_DIR%\rdc\build\Release"
      "%ROOT_DIR%\rdc\build\RelWithDebInfo"
    ) do (
      if not defined RENDERDOC_PYTHON_PATH if exist "%%~D\renderdoc.pyd" set "RENDERDOC_PYTHON_PATH=%%~D"
    )
    if not defined RENDERDOC_PYTHON_PATH (
      for /f "delims=" %%F in ('dir /b /s "%ROOT_DIR%\rdc\renderdoc.pyd" 2^>nul') do (
        if not defined RENDERDOC_PYTHON_PATH set "RENDERDOC_PYTHON_PATH=%%~dpF"
      )
    )
  )
)
if defined RENDERDOC_PYTHON_PATH (
  echo [OK] RENDERDOC_PYTHON_PATH=%RENDERDOC_PYTHON_PATH%
  set "PATH=%RENDERDOC_PYTHON_PATH%;%PATH%"
) else (
  powershell -NoProfile -Command "Write-Host '[WARN] RENDERDOC_PYTHON_PATH is not set and renderdoc.pyd was not found under thirdparty or rdc.' -ForegroundColor Yellow" || echo [WARN] RENDERDOC_PYTHON_PATH is not set and renderdoc.pyd was not found under thirdparty or rdc.
)

set "RD_PYDLL=unknown"
set "CUR_PYDLL=unknown"
set "ABI_STATUS=unknown"
if defined RENDERDOC_PYTHON_PATH if exist "%RENDERDOC_PYTHON_PATH%\renderdoc.pyd" (
  set "RD_PYD=%RENDERDOC_PYTHON_PATH%\renderdoc.pyd"
  powershell -NoProfile -Command "$p='%RD_PYD%'; if(Test-Path $p){$b=[IO.File]::ReadAllBytes($p); $s=[Text.Encoding]::ASCII.GetString($b); $m=[regex]::Match($s,'python\\d+\\.dll','IgnoreCase'); if($m.Success){$m.Value}}" > "%TMP_OUT%" 2>nul
  for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "RD_PYDLL=%%V"
  if /I "%RD_PYDLL%"=="unknown" (
    "%PY_EXE%" %PY_ARGS% -c "import os, re, pathlib; p=os.environ.get('RD_PYD'); data=pathlib.Path(p).read_bytes() if p else b''; m=re.findall(rb'python\\d+\\.dll', data.lower()); print(m[0].decode('ascii') if m else '')" > "%TMP_OUT%" 2>nul
    for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "RD_PYDLL=%%V"
  )
)
"%PY_EXE%" %PY_ARGS% -c "import sys; print(f'python{sys.version_info[0]}{sys.version_info[1]}.dll')" > "%TMP_OUT%" 2>nul
for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "CUR_PYDLL=%%V"
if not defined PY_MAJMIN if /I not "%CUR_PYDLL%"=="unknown" (
  set "PY_MAJMIN=%CUR_PYDLL:python=%"
  set "PY_MAJMIN=%PY_MAJMIN:.dll=%"
)
if not defined PY_MAJMIN if /I not "%RD_PYDLL%"=="unknown" (
  set "PY_MAJMIN=%RD_PYDLL:python=%"
  set "PY_MAJMIN=%PY_MAJMIN:.dll=%"
)
if /I not "%RD_PYDLL%"=="unknown" if /I not "%CUR_PYDLL%"=="unknown" (
  if /I "%RD_PYDLL%"=="%CUR_PYDLL%" (
    set "ABI_STATUS=match"
  ) else (
    set "ABI_STATUS=mismatch"
  )
)
echo [CHECK] RenderDoc Python ABI: binding=%RD_PYDLL%, runtime=%CUR_PYDLL% (%ABI_STATUS%)
if /I "%RD_PYDLL%"=="unknown" (
  powershell -NoProfile -Command "Write-Host '[WARN] RenderDoc ABI probe failed: could not read pythonXX.dll from renderdoc.pyd.' -ForegroundColor Yellow" || echo [WARN] RenderDoc ABI probe failed: could not read pythonXX.dll from renderdoc.pyd.
)
if /I "%ABI_STATUS%"=="mismatch" (
  powershell -NoProfile -Command "Write-Host '[WARN] RenderDoc bindings require %RD_PYDLL% but current Python is %CUR_PYDLL%.' -ForegroundColor Yellow" || echo [WARN] RenderDoc bindings require %RD_PYDLL% but current Python is %CUR_PYDLL%.
  if /I "%RD_PYDLL%"=="python36.dll" if /I "%PY_SOURCE%"=="system" (
    where py >nul 2>&1
    if not errorlevel 1 (
      py -3.6 -c "import sys" >nul 2>&1
      if not errorlevel 1 (
        set "PY_EXE=py"
        set "PY_ARGS=-3.6"
        set "PY_DISPLAY=!PY_EXE! !PY_ARGS!"
        "!PY_EXE!" !PY_ARGS! -c "import sys; print(f'python{sys.version_info[0]}{sys.version_info[1]}.dll')" > "%TMP_OUT%" 2>nul
        for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "CUR_PYDLL=%%V"
        echo [INFO] Switching Python runtime to match bindings: !PY_DISPLAY!
      )
    )
  )
  if /I not "!RD_PYDLL!"=="!CUR_PYDLL!" (
    powershell -NoProfile -Command "Write-Host '[ERROR] No matching Python runtime found for !RD_PYDLL!.' -ForegroundColor Red" || echo [ERROR] No matching Python runtime found for !RD_PYDLL!.
    echo [HINT] Install matching Python or rebuild RenderDoc with -DPython3_EXECUTABLE=...
    pause
    exit /b 1
  )
)

echo [CHECK] Python runtime: %PY_DISPLAY%

REM If we are using bundled Python, try to enable site-packages for embeddable distribution.
if /I "%PY_SOURCE%"=="local" (
  "%PY_EXE%" %PY_ARGS% -c "import sys; print(f'{sys.version_info[0]}{sys.version_info[1]}')" > "%TMP_OUT%" 2>nul
  if not errorlevel 1 (
    for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "PY_MAJMIN=%%V"
  )
  set "PY_ZIP_LABEL=python!PY_MAJMIN!.zip"
  set "PY_ZIP_FOUND="
  if defined PY_MAJMIN if exist "%PY_HOME%python!PY_MAJMIN!.zip" set "PY_ZIP_LABEL=python!PY_MAJMIN!.zip"
  if not exist "%PY_HOME%!PY_ZIP_LABEL!" (
    for /f "delims=" %%Z in ('dir /b "%PY_HOME%python*.zip" 2^>nul') do if not defined PY_ZIP_FOUND set "PY_ZIP_FOUND=%%Z"
    if defined PY_ZIP_FOUND set "PY_ZIP_LABEL=!PY_ZIP_FOUND!"
  )
  set "PY_ZIP=%PY_HOME%!PY_ZIP_LABEL!"
  if not exist "!PY_ZIP!" (
    powershell -NoProfile -Command "Write-Host '[WARN] Bundled Python is missing !PY_ZIP_LABEL! (stdlib). Expect import failures; use the embeddable package layout.' -ForegroundColor Yellow" || echo [WARN] Bundled Python missing !PY_ZIP_LABEL!.
  )
  set "PTH_FILE="
  if defined PY_MAJMIN if exist "%PY_HOME%python!PY_MAJMIN!._pth" set "PTH_FILE=%PY_HOME%python!PY_MAJMIN!._pth"
  if not defined PTH_FILE (
    for /f "delims=" %%P in ('dir /b "%PY_HOME%python*._pth" 2^>nul') do if not defined PTH_FILE set "PTH_FILE=%PY_HOME%%%P"
  )
  if not defined PTH_FILE set "PTH_FILE=%PY_HOME%python!PY_MAJMIN!._pth"
  if not exist "%PY_HOME%Lib\site-packages" mkdir "%PY_HOME%Lib\site-packages" >nul 2>&1
  if not exist "!PTH_FILE!" (
    powershell -NoProfile -Command "Set-Content -LiteralPath '!PTH_FILE!' -Value @('!PY_ZIP_LABEL!','.', '..\..', 'Lib\\site-packages','import site') -Encoding ascii" >nul 2>&1
  ) else (
    powershell -NoProfile -Command "$p='!PTH_FILE!'; $lines=Get-Content -LiteralPath $p -ErrorAction SilentlyContinue; if(-not $lines){$lines=@()}; $out=@(); $sawSite=$false; $sawSP=$false; $sawRoot=$false; foreach($l in $lines){ $t=$l.Trim(); if($t -ieq '#import site' -or $t -ieq 'import site'){ $out += 'import site'; $sawSite=$true } else { $out += $l } $n=$t -replace '/','\\'; if($n -ieq 'lib\\site-packages'){ $sawSP=$true } if($n -ieq '..\..'){ $sawRoot=$true } }; if(-not $sawRoot){ $out += '..\..' }; if(-not $sawSP){ $out += 'Lib\\site-packages' }; if(-not $sawSite){ $out += 'import site' }; Set-Content -LiteralPath $p -Value ($out -join \"`n\") -Encoding ascii" >nul 2>&1
  )
)

echo [CHECK] Ensuring Python dependencies...
set "NEED_DEPS="
set "NEED_WEBSOCKETS="
set "NEED_DATACLASSES="
"%PY_EXE%" %PY_ARGS% -c "import websockets" >nul 2>&1
if errorlevel 1 set "NEED_WEBSOCKETS=1"
if /I "!PY_MAJMIN!"=="36" (
  "%PY_EXE%" %PY_ARGS% -c "import dataclasses" >nul 2>&1
  if errorlevel 1 set "NEED_DATACLASSES=1"
)
if defined NEED_WEBSOCKETS set "NEED_DEPS=1"
if defined NEED_DATACLASSES set "NEED_DEPS=1"

if defined NEED_DEPS (
  set "PIP_DEPS="
  set "SYS_PIP_DEPS="
  if defined NEED_WEBSOCKETS (
    set "PIP_DEPS=!PIP_DEPS! websockets"
    if /I "!PY_MAJMIN!"=="36" (
      set "SYS_PIP_DEPS=!SYS_PIP_DEPS! websockets==9.1"
    ) else (
      set "SYS_PIP_DEPS=!SYS_PIP_DEPS! websockets==10.4"
    )
  )
  if defined NEED_DATACLASSES (
    set "PIP_DEPS=!PIP_DEPS! dataclasses==0.8"
    set "SYS_PIP_DEPS=!SYS_PIP_DEPS! dataclasses==0.8"
  )

  echo [INFO] Ensuring pip is available...
  set "HAVE_PIP="
  "%PY_EXE%" %PY_ARGS% -m pip --version >nul 2>&1
  if errorlevel 1 (
    "%PY_EXE%" %PY_ARGS% -m ensurepip --upgrade >nul 2>&1
  )
  "%PY_EXE%" %PY_ARGS% -m pip --version >nul 2>&1
  if not errorlevel 1 set "HAVE_PIP=1"
  if errorlevel 1 if /I "%PY_SOURCE%"=="local" (
    if not defined PY_MAJMIN (
      "%PY_EXE%" %PY_ARGS% -c "import sys; print(f'{sys.version_info[0]}{sys.version_info[1]}')" > "%TMP_OUT%" 2>nul
      for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "PY_MAJMIN=%%V"
    )
    powershell -NoProfile -Command "Write-Host '[WARN] pip missing; trying get-pip bootstrap for bundled Python.' -ForegroundColor Yellow" || echo [WARN] pip missing; trying get-pip bootstrap.
    if /I "!PY_MAJMIN!"=="36" (
      powershell -NoProfile -Command "$u='https://bootstrap.pypa.io/pip/3.6/get-pip.py'; $o=Join-Path $env:TEMP 'get-pip.py'; Invoke-WebRequest -Uri $u -OutFile $o; exit 0" >nul 2>&1
      if exist "%TEMP%\get-pip.py" (
        "%PY_EXE%" %PY_ARGS% "%TEMP%\get-pip.py" >nul 2>&1
        del /q "%TEMP%\get-pip.py" >nul 2>&1
      )
    )
  )
  "%PY_EXE%" %PY_ARGS% -m pip --version >nul 2>&1
  if not errorlevel 1 set "HAVE_PIP=1"
  set "SYS_PIP_OK="
  if errorlevel 1 (
    if /I "%PY_SOURCE%"=="local" (
      set "SYS_PIP_EXE="
      set "SYS_PIP_ARGS="
      set "PATH=%ORIG_PATH%"
      set "PYTHONHOME="
      set "PYTHONPATH="
      set "PYTHONNOUSERSITE="
      where py >nul 2>&1
      if not errorlevel 1 (
        set "SYS_PIP_EXE=py"
        set "SYS_PIP_ARGS=-3"
      ) else (
        for /f "delims=" %%P in ('where python 2^>nul') do (
          if not defined SYS_PIP_EXE (
            if /I not "%%~dpP"=="%LOCALAPPDATA%\Microsoft\WindowsApps\\" set "SYS_PIP_EXE=%%P"
          )
        )
      )
      if defined SYS_PIP_EXE (
        powershell -NoProfile -Command "Write-Host '[WARN] pip missing in bundled Python; installing dependencies with system Python into bundled site-packages.' -ForegroundColor Yellow" || echo [WARN] pip missing in bundled Python; using system Python to install dependencies.
        "!SYS_PIP_EXE!" !SYS_PIP_ARGS! -m pip install !SYS_PIP_DEPS! --target "%PY_HOME%Lib\\site-packages" >nul 2>&1
        if not errorlevel 1 set "SYS_PIP_OK=1"
      )
      set "PATH=%PY_HOME%;%PY_HOME%x64;%ORIG_PATH%"
      set "PYTHONHOME=%PY_HOME%"
      set "PYTHONPATH="
      set "PYTHONNOUSERSITE=1"
    ) else (
      powershell -NoProfile -Command "Write-Host '[ERROR] pip is not available for the selected Python runtime. For embeddable Python, run ensurepip or install pip manually.' -ForegroundColor Red" || echo [ERROR] pip is not available for the selected Python runtime.
      pause
      exit /b 1
    )
  )
  set "DEPS_INSTALL_FAILED="
  if /I "%PY_SOURCE%"=="local" (
    if defined HAVE_PIP (
      echo [INFO] Installing dependencies - bundled python scope...
      "%PY_EXE%" %PY_ARGS% -m pip install !PIP_DEPS!
      if errorlevel 1 set "DEPS_INSTALL_FAILED=1"
    ) else if defined SYS_PIP_OK (
      echo [INFO] Dependencies installed with system Python into bundled site-packages.
    ) else (
      powershell -NoProfile -Command "Write-Host '[ERROR] pip is not available for bundled Python and system pip fallback failed.' -ForegroundColor Red" || echo [ERROR] pip is not available for bundled Python and system pip fallback failed.
      echo [HINT] Try: python -m pip install !SYS_PIP_DEPS! --target "%PY_HOME%Lib\\site-packages"
      pause
      exit /b 1
    )
  ) else (
    echo [INFO] Installing dependencies - user scope...
    "%PY_EXE%" %PY_ARGS% -m pip install --user !PIP_DEPS!
    if errorlevel 1 set "DEPS_INSTALL_FAILED=1"
  )
  if defined DEPS_INSTALL_FAILED (
    if /I "%PY_SOURCE%"=="local" (
      powershell -NoProfile -Command "Write-Host '[ERROR] Failed to install dependencies. Please run: !PY_DISPLAY! -m pip install !PIP_DEPS!' -ForegroundColor Red" || echo [ERROR] Failed to install dependencies. Please run: !PY_DISPLAY! -m pip install !PIP_DEPS!
    ) else (
      powershell -NoProfile -Command "Write-Host '[ERROR] Failed to install dependencies. Please run: !PY_DISPLAY! -m pip install --user !PIP_DEPS!' -ForegroundColor Red" || echo [ERROR] Failed to install dependencies. Please run: !PY_DISPLAY! -m pip install --user !PIP_DEPS!
    )
    pause
    exit /b 1
  )
  set "DEPS_IMPORT_FAILED="
  if defined NEED_WEBSOCKETS (
    "%PY_EXE%" %PY_ARGS% -c "import websockets" >nul 2>&1
    if errorlevel 1 (
      powershell -NoProfile -Command "Write-Host '[ERROR] websockets still not importable after installation attempts.' -ForegroundColor Red" || echo [ERROR] websockets still not importable after installation attempts.
      set "DEPS_IMPORT_FAILED=1"
    )
  )
  if defined NEED_DATACLASSES (
    "%PY_EXE%" %PY_ARGS% -c "import dataclasses" >nul 2>&1
    if errorlevel 1 (
      powershell -NoProfile -Command "Write-Host '[ERROR] dataclasses still not importable after installation attempts.' -ForegroundColor Red" || echo [ERROR] dataclasses still not importable after installation attempts.
      set "DEPS_IMPORT_FAILED=1"
    )
  )
  if defined DEPS_IMPORT_FAILED (
    pause
    exit /b 1
  )
)

echo [CHECK] RenderDoc bindings...
set "RD_IMPORT_ERR="
"%PY_EXE%" %PY_ARGS% -c "import os, sys; p=os.environ.get('RENDERDOC_PYTHON_PATH'); sys.path.append(p) if p else None; import renderdoc" >nul 2>"%TMP_ERR%"
if errorlevel 1 (
  for /f "usebackq delims=" %%L in ("%TMP_ERR%") do if not defined RD_IMPORT_ERR set "RD_IMPORT_ERR=%%L"
  if defined RENDERDOC_PYTHON_PATH (
    powershell -NoProfile -Command "Write-Host '[WARN] RenderDoc bindings import failed with RENDERDOC_PYTHON_PATH=%RENDERDOC_PYTHON_PATH%.' -ForegroundColor Yellow" || echo [WARN] RenderDoc bindings import failed with RENDERDOC_PYTHON_PATH=%RENDERDOC_PYTHON_PATH%.
    powershell -NoProfile -Command "Write-Host '[WARN] Import error: %RD_IMPORT_ERR%' -ForegroundColor Yellow" || echo [WARN] Import error: %RD_IMPORT_ERR%
  ) else (
    powershell -NoProfile -Command "Write-Host '[WARN] RenderDoc bindings not found. Set RENDERDOC_PYTHON_PATH to directory containing renderdoc.pyd.' -ForegroundColor Yellow" || echo [WARN] RenderDoc bindings not found. Set RENDERDOC_PYTHON_PATH to directory containing renderdoc.pyd.
    if not exist "%ROOT_DIR%\thirdparty\renderdoc\renderdoc.pyd" (
      echo [INFO] Repo thirdparty path does not contain renderdoc.pyd: thirdparty\renderdoc
    )
  )
)

echo [INFO] Starting MCP Agent...
"%PY_EXE%" %PY_ARGS% -m runtime.agent
if errorlevel 1 (
  powershell -NoProfile -Command "Write-Host '[ERROR] MCP Agent exited with error. Check RenderDoc Python bindings (RENDERDOC_PYTHON_PATH).' -ForegroundColor Red" || echo [ERROR] MCP Agent exited with error. Check RenderDoc Python bindings (RENDERDOC_PYTHON_PATH).
  pause
  exit /b 1
)

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
set "MCP_PORT=%1"
goto :eof
