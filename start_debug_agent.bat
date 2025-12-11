@echo off
REM Convenience launcher at repo root.
REM This simply delegates to scripts\start_debug_agent.bat so that
REM users can double-click this file directly.

cd /d "%~dp0"
call scripts\start_debug_agent.bat

