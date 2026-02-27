#!/usr/bin/env pwsh
# start-all.ps1 — Start all JusConsultus.AI services
# Usage: .\start-all.ps1

Set-Location $PSScriptRoot

Write-Host "`n=== JusConsultus.AI — Starting All Services ===" -ForegroundColor Cyan

# ─── 1. Add Docker to PATH ────────────────────────────────────────────────────
$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path $dockerBin) {
    $env:PATH += ";$dockerBin"
    Write-Host "[1/4] Docker found at $dockerBin" -ForegroundColor Green
} else {
    Write-Host "[1/4] WARNING: Docker not found at $dockerBin — skipping ONLYOFFICE startup" -ForegroundColor Yellow
    $skipDocker = $true
}

# ─── 2. Start Docker Desktop if daemon is not running ─────────────────────────
if (-not $skipDocker) {
    $dockerRunning = $false
    try {
        docker ps 2>&1 | Out-Null
        $dockerRunning = ($LASTEXITCODE -eq 0)
    } catch {}

    if (-not $dockerRunning) {
        Write-Host "[2/4] Docker daemon not running — starting Docker Desktop..." -ForegroundColor Yellow
        Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        Write-Host "      Waiting 30s for Docker Desktop to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    } else {
        Write-Host "[2/4] Docker daemon already running" -ForegroundColor Green
    }

    # ─── 3. Start ONLYOFFICE Document Server via docker-compose ─────────────
    Write-Host "[3/4] Starting ONLYOFFICE Document Server..." -ForegroundColor Cyan
    docker-compose up -d --remove-orphans 2>&1 | Write-Host

    # Wait for ONLYOFFICE health check
    $maxWait = 60
    $waited = 0
    Write-Host "      Waiting for ONLYOFFICE to become healthy..." -ForegroundColor Yellow
    while ($waited -lt $maxWait) {
        $health = docker inspect jusconsultus-onlyoffice --format "{{.State.Health.Status}}" 2>&1
        if ($health -eq "healthy") {
            Write-Host "      ONLYOFFICE is healthy at http://localhost:8000" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 5
        $waited += 5
        Write-Host "      Still waiting... ($waited/$maxWait s, status: $health)" -ForegroundColor DarkYellow
    }
    if ($waited -ge $maxWait) {
        Write-Host "      WARNING: ONLYOFFICE did not become healthy within $maxWait seconds — it may still be starting." -ForegroundColor Yellow
    }
} else {
    Write-Host "[2/4] Skipped (no Docker)" -ForegroundColor Gray
    Write-Host "[3/4] Skipped (no Docker)" -ForegroundColor Gray
}

# ─── 4. Start pm2 services (Next.js + DeepSearcher + Caddy) ──────────────────
Write-Host "[4/4] Starting pm2 services..." -ForegroundColor Cyan
& d:\JusConsultus.AI\tools\deepsearcher\.venv\Scripts\Activate.ps1 2>$null
pm2 start ecosystem.config.js 2>&1 | Write-Host
Start-Sleep -Seconds 8
pm2 list

Write-Host "`n=== All services started ===" -ForegroundColor Green
Write-Host "  Next.js:      http://localhost:3000" -ForegroundColor White
Write-Host "  ONLYOFFICE:   http://localhost:8000" -ForegroundColor White
Write-Host "  DeepSearcher: http://localhost:8010" -ForegroundColor White
Write-Host "  Live site:    https://jusconsultus.online`n" -ForegroundColor White
