@echo off
setlocal

set "STARTER_DIR=%~dp0"
set "PROJECT_ROOT=%STARTER_DIR%.."

cd /d "%PROJECT_ROOT%"
if errorlevel 1 (
  echo [ERROR] Could not switch to the project root.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%STARTER_DIR%Start.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Aegis setup exited with code %EXIT_CODE%.
  pause
)

if "%EXIT_CODE%"=="0" (
  echo.
  echo Aegis setup finished. Press any key to close this window.
  pause >nul
)

exit /b %EXIT_CODE%
