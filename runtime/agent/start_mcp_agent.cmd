@echo off
setlocal

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
  echo [ERROR] python not found!
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
  set "PATH=%PY_HOME%;%PY_HOME%x64;%PATH%"
  set "PYTHONHOME=%PY_HOME%"
  set "PYTHONPATH="
  set "PYTHONNOUSERSITE=1"
)

if not defined MCP_PORT set "MCP_PORT=8765"
netstat -ano | findstr /R /C:":%MCP_PORT% .*LISTENING" >nul
if not errorlevel 1 (
  echo [ERROR] MCP port %MCP_PORT% already in use. Close existing MCP Agent or set MCP_PORT to another value.
  pause
  exit /b 1
)

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
        set "PY_DISPLAY=%PY_EXE% %PY_ARGS%"
        "%PY_EXE%" %PY_ARGS% -c "import sys; print(f'python{sys.version_info[0]}{sys.version_info[1]}.dll')" > "%TMP_OUT%" 2>nul
        for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "CUR_PYDLL=%%V"
        echo [INFO] Switching Python runtime to match bindings: %PY_DISPLAY%
      )
    )
  )
  if /I not "%RD_PYDLL%"=="%CUR_PYDLL%" (
    echo [ERROR] No matching Python runtime found for %RD_PYDLL%.
    echo [HINT] Install matching Python or rebuild RenderDoc with -DPython3_EXECUTABLE=...
    pause
    exit /b 1
  )
)

echo [CHECK] Python runtime: %PY_DISPLAY%

REM If we are using bundled Python, try to enable site-packages for embeddable distribution.
if /I "%PY_SOURCE%"=="local" (
  if not defined PY_MAJMIN (
    "%PY_EXE%" %PY_ARGS% -c "import sys; print(f'{sys.version_info[0]}{sys.version_info[1]}')" > "%TMP_OUT%" 2>nul
    for /f "usebackq delims=" %%V in ("%TMP_OUT%") do set "PY_MAJMIN=%%V"
  )
  set "PY_ZIP=%PY_HOME%python%PY_MAJMIN%.zip"
  if not exist "%PY_ZIP%" (
    powershell -NoProfile -Command "Write-Host '[WARN] Bundled Python is missing python%PY_MAJMIN%.zip (stdlib). Expect import failures; use the embeddable package layout.' -ForegroundColor Yellow" || echo [WARN] Bundled Python missing python%PY_MAJMIN%.zip.
  )
  set "PTH_FILE=%PY_HOME%python%PY_MAJMIN%._pth"
  if not exist "%PY_HOME%Lib\site-packages" mkdir "%PY_HOME%Lib\site-packages" >nul 2>&1
  if not exist "%PTH_FILE%" (
    powershell -NoProfile -Command "Set-Content -LiteralPath '%PTH_FILE%' -Value @('python%PY_MAJMIN%.zip','.', 'Lib\\site-packages','import site') -Encoding ascii" >nul 2>&1
  ) else (
    powershell -NoProfile -Command "$p='%PTH_FILE%'; $lines=Get-Content -LiteralPath $p -ErrorAction SilentlyContinue; if(-not $lines){$lines=@()}; $out=@(); $sawSite=$false; $sawSP=$false; foreach($l in $lines){ $t=$l.Trim(); if($t -ieq '#import site' -or $t -ieq 'import site'){ $out += 'import site'; $sawSite=$true } else { $out += $l } if(($t -replace '/','\\') -ieq 'lib\\site-packages'){ $sawSP=$true } }; if(-not $sawSP){ $out += 'Lib\\site-packages' }; if(-not $sawSite){ $out += 'import site' }; Set-Content -LiteralPath $p -Value ($out -join \"`n\") -Encoding ascii" >nul 2>&1
  )
)

echo [CHECK] Ensuring websockets dependency...
"%PY_EXE%" %PY_ARGS% -c "import websockets" >nul 2>&1
if errorlevel 1 (
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
    if /I "%PY_MAJMIN%"=="36" (
      powershell -NoProfile -Command "$u='https://bootstrap.pypa.io/pip/3.6/get-pip.py'; $o=Join-Path $env:TEMP 'get-pip.py'; Invoke-WebRequest -Uri $u -OutFile $o; exit 0" >nul 2>&1
      if exist "%TEMP%\get-pip.py" (
        "%PY_EXE%" %PY_ARGS% "%TEMP%\get-pip.py" >nul 2>&1
        del /q "%TEMP%\get-pip.py" >nul 2>&1
      )
    )
  )
  "%PY_EXE%" %PY_ARGS% -m pip --version >nul 2>&1
  if not errorlevel 1 set "HAVE_PIP=1"
  if errorlevel 1 (
    if /I "%PY_SOURCE%"=="local" (
      set "SYS_PIP="
      where python >nul 2>&1
      if not errorlevel 1 set "SYS_PIP=python"
      if not defined SYS_PIP (
        where py >nul 2>&1
        if not errorlevel 1 set "SYS_PIP=py -3"
      )
      if defined SYS_PIP (
        powershell -NoProfile -Command "Write-Host '[WARN] pip missing in bundled Python; installing websockets with system Python into bundled site-packages.' -ForegroundColor Yellow" || echo [WARN] pip missing in bundled Python; using system Python to install websockets.
        %SYS_PIP% -m pip install "websockets==10.4" --target "%PY_HOME%Lib\\site-packages" >nul 2>&1
      )
    ) else (
      powershell -NoProfile -Command "Write-Host '[ERROR] pip is not available for the selected Python runtime. For embeddable Python, run ensurepip or install pip manually.' -ForegroundColor Yellow" || echo [ERROR] pip is not available for the selected Python runtime.
      pause
      exit /b 1
    )
  )
  if /I "%PY_SOURCE%"=="local" if defined HAVE_PIP (
    echo [INFO] Installing websockets - bundled python scope...
    "%PY_EXE%" %PY_ARGS% -m pip install websockets
  ) else (
    echo [INFO] Installing websockets - user scope...
    "%PY_EXE%" %PY_ARGS% -m pip install --user websockets
  )
  if errorlevel 1 (
    if /I "%PY_SOURCE%"=="local" (
      echo [ERROR] Failed to install websockets. Please run: %PY_DISPLAY% -m pip install websockets
    ) else (
      echo [ERROR] Failed to install websockets. Please run: %PY_DISPLAY% -m pip install --user websockets
    )
    pause
    exit /b 1
  )
  "%PY_EXE%" %PY_ARGS% -c "import websockets" >nul 2>&1
  if errorlevel 1 (
    powershell -NoProfile -Command "Write-Host '[ERROR] websockets still not importable after installation attempts.' -ForegroundColor Yellow" || echo [ERROR] websockets still not importable after installation attempts.
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
  echo [ERROR] MCP Agent exited with error. Check RenderDoc Python bindings (RENDERDOC_PYTHON_PATH).
  pause
  exit /b 1
)

exit /b 0
