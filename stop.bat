@echo off
title GlobalSpeak Live - Stopping

echo.
echo  Stopping GlobalSpeak Live servers...
echo.

:: Kill processes on port 3001 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do (
    echo  Stopping backend (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 8080 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 "') do (
    echo  Stopping frontend (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Close the named terminal windows
taskkill /FI "WINDOWTITLE eq GlobalSpeak Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq GlobalSpeak Frontend*" /F >nul 2>&1

echo.
echo  All servers stopped.
echo.
pause
