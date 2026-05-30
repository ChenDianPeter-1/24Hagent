@echo off
REM Wrapper for PS 5.1 -File exit code propagation bug.
REM PS 5.1 -File may return 0 even when the script calls exit N.
REM -Command with & { ...; exit $LASTEXITCODE } correctly relays the exit code.
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& { & '%~dp0check_quality_readiness.ps1' %*; exit $LASTEXITCODE }"
exit /b %ERRORLEVEL%
