@echo off
title GlobalSpeak Live

echo.
echo  ==========================================
echo    GlobalSpeak Live - Starting...
echo  ==========================================
echo.

:: Kill any existing processes on our ports
echo [1/3] Clearing ports 3001 and 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 "') do taskkill /F /PID %%a >nul 2>&1

:: Start backend
echo [2/3] Starting backend (port 3001)...
start "GlobalSpeak Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

:: Wait for backend to come up
timeout /t 3 /nobreak >nul

:: Start frontend
echo [3/3] Starting frontend (port 8080)...
start "GlobalSpeak Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

:: Wait then open browser
timeout /t 4 /nobreak >nul
echo.
echo  ==========================================
echo    App running at http://localhost:8080
echo  ==========================================
echo.
start "" "http://localhost:8080"

echo  Both servers are running in separate windows.
echo  Close those windows (or run stop.bat) to shut down.
echo.
pause
