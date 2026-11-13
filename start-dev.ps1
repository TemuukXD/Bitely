# Bitely — Ulaanbaatar Food Discovery Platform Startup Script (PowerShell)
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host "  Bitely: Ulaanbaatar Food Discovery, Review & Social Platform 🇲🇳" -ForegroundColor Yellow
Write-Host "====================================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# 1. Start Docker
Write-Host "`n[1/4] Starting PostgreSQL + PostGIS and Redis..." -ForegroundColor Green
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker failed to start. Make sure Docker Desktop is running." -ForegroundColor Red
    exit 1
}

# 2. Auto-detect Local IPv4 and write mobile/.env
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress
if (-not $LocalIP) { $LocalIP = "localhost" }

$envContent = "EXPO_PUBLIC_API_URL=http://${LocalIP}:3000`n"
Set-Content -Path "$root\mobile\.env" -Value $envContent -Encoding UTF8
Write-Host "`n[2/4] Auto-configured mobile/.env -> EXPO_PUBLIC_API_URL=http://${LocalIP}:3000" -ForegroundColor Magenta

# 3. Install dependencies if missing
Write-Host "`n[3/4] Verifying dependencies..." -ForegroundColor Green
if (-not (Test-Path "$root\backend\node_modules")) {
    Write-Host "Installing backend packages..." -ForegroundColor Yellow
    Push-Location "$root\backend"; npm install; Pop-Location
}
if (-not (Test-Path "$root\mobile\node_modules")) {
    Write-Host "Installing mobile packages..." -ForegroundColor Yellow
    Push-Location "$root\mobile"; npm install; Pop-Location
}

# 4. Spawn Backend & Mobile servers
Write-Host "`n[4/4] Launching Backend & Mobile servers in separate windows..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; Write-Host '--- BITELY BACKEND API (Port 3000) ---' -ForegroundColor Green; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\mobile'; Write-Host '--- BITELY EXPO MOBILE APP ---' -ForegroundColor Yellow; npx expo start -c"

Write-Host "`nAll services started! Scan the QR code in the Expo window with Expo Go." -ForegroundColor Cyan
