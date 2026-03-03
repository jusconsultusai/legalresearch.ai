#!/usr/bin/env pwsh
# restart-services.ps1 — Kill everything, then start PM2 cleanly
Set-Location $PSScriptRoot

Write-Host "`n=== Step 1: Kill PM2 daemon ===" -ForegroundColor Yellow
npx pm2 kill 2>$null
Start-Sleep -Seconds 2

Write-Host "=== Step 2: Kill stale processes ===" -ForegroundColor Yellow
Get-Process -Name "caddy" -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue | Stop-Process -Force
# Kill node processes that aren't our current shell
Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Id -ne $PID } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "=== Step 3: Port check ===" -ForegroundColor Yellow
$ports = @(2019, 3000, 8000, 8010)
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "  Port $p IN USE by PID(s): $($conn.OwningProcess -join ',')" -ForegroundColor Red
        $conn.OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
        Write-Host "  -> Killed" -ForegroundColor Yellow
    } else {
        Write-Host "  Port $p FREE" -ForegroundColor Green
    }
}
Start-Sleep -Seconds 2

Write-Host "=== Step 4: Ensure logs dir ===" -ForegroundColor Yellow
if (!(Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" -Force | Out-Null }

Write-Host "=== Step 5: Clear old PM2 logs ===" -ForegroundColor Yellow
Get-ChildItem logs\*.log -ErrorAction SilentlyContinue | ForEach-Object { Set-Content $_.FullName "" }

Write-Host "=== Step 6: Start PM2 ===" -ForegroundColor Yellow
npx pm2 start d:\JusConsultus.AI\ecosystem.config.js

Write-Host "`n=== Step 7: Wait 15s, then status ===" -ForegroundColor Yellow
Start-Sleep -Seconds 15
npx pm2 list

Write-Host "`n=== Step 8: Service health checks ===" -ForegroundColor Yellow
# Check Next.js
try {
    $r = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Next.js (3000): OK (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "  Next.js (3000): FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Check Caddy admin
try {
    $r = Invoke-WebRequest -Uri "http://localhost:2019/config/" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "  Caddy admin (2019): OK" -ForegroundColor Green
} catch {
    Write-Host "  Caddy admin (2019): FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== DONE ===" -ForegroundColor Cyan
