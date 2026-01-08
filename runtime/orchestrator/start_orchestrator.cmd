@echo off
setlocal

for %%I in ("%~dp0.") do set "HERE=%%~fI"
cd /d "%HERE%"

node server.js
