@echo off
title Food Discovery Platform Dev Launcher
color 0A
echo ========================================================
echo   Launching Food Discovery Platform (Ulaanbaatar) 🇲🇳
echo ========================================================
echo.

:: 1. Start Docker Containers
echo [1/3] Starting Database (PostgreSQL + PostGIS) & Redis...
docker compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker failed to start! Please make sure Docker Desktop is open and green.
    pause
    exit /b %errorlevel%
)
echo Database & Redis are healthy!
echo.

:: 2. Detect Local IP Address
echo [2/3] Detecting your PC's local Wi-Fi IP address...
for /f "tokens=4" %%a in ('route print^|find " 0.0.0.0"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
echo Your current Local IP is: http://%LOCAL_IP%:3000
echo (Verify API_BASE_URL in mobile/App.tsx uses this IP)
echo.

:: 3. Launch Backend and Mobile in separate windows
echo [3/3] Launching Backend API and Expo Mobile servers in separate windows...
start "Backend API (Port 3000)" cmd /k "cd /d %~dp0backend && npx tsx watch server.ts"
start "Mobile App (Expo)" cmd /k "cd /d %~dp0mobile && npx expo start"

echo.
echo ========================================================
echo   All services started successfully!
echo   - Backend: http://localhost:3000/health
echo   - Mobile: Scan the QR code in the Expo window with Expo Go
echo ========================================================
echo.
pause