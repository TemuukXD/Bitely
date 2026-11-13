@echo off
title Bitely — Ulaanbaatar Food Discovery Dev Launcher
color 0A
echo ====================================================================
echo   Bitely: Ulaanbaatar Food Discovery, Review ^& Social Platform 🇲🇳
echo ====================================================================
echo.

:: 1. Start Docker Containers
echo [1/4] Starting Database (PostgreSQL 16 + PostGIS 3.4) ^& Redis...
docker compose up -d
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Docker failed to start! Please make sure Docker Desktop is open and green.
    pause
    exit /b %errorlevel%
)
echo Database ^& Redis containers are up!
echo.

:: 2. Detect Local IP Address and auto-configure mobile/.env
echo [2/4] Detecting your PC's local Wi-Fi IP address...
set LOCAL_IP=localhost
for /f "tokens=4" %%a in ('route print^|find " 0.0.0.0"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
echo EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3000> "%~dp0mobile\.env"
echo Auto-configured mobile\.env with EXPO_PUBLIC_API_URL=http://%LOCAL_IP%:3000
echo.

:: 3. Install dependencies if node_modules are missing
echo [3/4] Checking backend and mobile dependencies...
if not exist "%~dp0backend\node_modules" (
    echo Installing backend dependencies...
    pushd "%~dp0backend" && call npm install && popd
)
if not exist "%~dp0mobile\node_modules" (
    echo Installing mobile dependencies...
    pushd "%~dp0mobile" && call npm install && popd
)

:: 4. Launch Backend and Mobile in separate windows
echo [4/4] Launching Backend API and Expo Mobile servers in separate windows...
start "Bitely Backend API (Port 3000)" cmd /k "cd /d "%~dp0backend" && npm run dev"
start "Bitely Mobile App (Expo)" cmd /k "cd /d "%~dp0mobile" && npx expo start -c"

echo.
echo ====================================================================
echo   All services started!
echo   - Backend Health: http://localhost:3000/health
echo   - Discover API:   http://localhost:3000/api/v1/venues/discover
echo   - Mobile App:     Scan the QR code in the Expo window with Expo Go
echo ====================================================================
echo.
pause
