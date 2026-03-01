#!/usr/bin/env pwsh
# start-onlyoffice.ps1 — Launch & monitor the ONLYOFFICE Document Server Docker container
# Called by PM2 ecosystem.config.js as the "onlyoffice" app.
# Keeps the process alive so PM2 shows the service as "online".

param()

Set-StrictMode -Off
$ErrorActionPreference = "Continue"

$dockerBin   = "C:\Program Files\Docker\Docker\resources\bin"
$composeFile = "D:\JusConsultus.AI\docker-compose.yml"
$container   = "jusconsultus-onlyoffice"

# ── 1. Add Docker to PATH ─────────────────────────────────────────────────────
if (Test-Path $dockerBin) {
    $env:PATH += ";$dockerBin"
    Write-Host "[OnlyOffice] Docker CLI found at $dockerBin"
} else {
    Write-Host "[OnlyOffice] WARNING: Docker not found at $dockerBin — aborting." -ForegroundColor Yellow
    exit 1
}

# ── 2. Ensure Docker daemon is running (start Docker Desktop if needed) ───────
function Test-DockerRunning {
    try { docker ps 2>&1 | Out-Null; return ($LASTEXITCODE -eq 0) }
    catch { return $false }
}

if (-not (Test-DockerRunning)) {
    Write-Host "[OnlyOffice] Docker daemon not running — launching Docker Desktop..."
    $dockerDesktop = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktop) {
        Start-Process $dockerDesktop
    }
    $waited = 0
    while ($waited -lt 60) {
        Start-Sleep 5
        $waited += 5
        if (Test-DockerRunning) {
            Write-Host "[OnlyOffice] Docker daemon ready after ${waited}s"
            break
        }
        Write-Host "[OnlyOffice] Waiting for Docker daemon... (${waited}/60 s)"
    }
    if (-not (Test-DockerRunning)) {
        Write-Host "[OnlyOffice] ERROR: Docker daemon did not start in time — aborting." -ForegroundColor Red
        exit 1
    }
}

# ── 3. Start the container via docker-compose ─────────────────────────────────
Write-Host "[OnlyOffice] Running docker-compose up..."
Set-Location "D:\JusConsultus.AI"
docker-compose -f $composeFile up -d --remove-orphans 2>&1 | Write-Host

# ── 4. Wait for ONLYOFFICE to become healthy ──────────────────────────────────
$maxWait = 120
$waited  = 0
Write-Host "[OnlyOffice] Waiting for container to become healthy (max ${maxWait}s)..."
while ($waited -lt $maxWait) {
    $health = docker inspect $container --format "{{.State.Health.Status}}" 2>&1
    if ($health -eq "healthy") {
        Write-Host "[OnlyOffice] Container is healthy — Document Server ready at http://localhost:8000"
        break
    }
    Start-Sleep 5
    $waited += 5
    Write-Host "[OnlyOffice] Waiting... (${waited}/${maxWait} s, status: $health)"
}
if ($waited -ge $maxWait) {
    Write-Host "[OnlyOffice] WARNING: Container did not become healthy within ${maxWait}s — it may still be starting."
}

# ── 5. Keep process alive — monitor container and restart if it stops ─────────
Write-Host "[OnlyOffice] Entering monitor loop (checks every 30 s)..."
while ($true) {
    Start-Sleep 30
    $status = docker inspect $container --format "{{.State.Status}}" 2>&1
    if ($LASTEXITCODE -ne 0 -or ($status -ne "running")) {
        Write-Host "[OnlyOffice] Container not running (status: $status) — attempting restart..."
        docker-compose -f $composeFile up -d 2>&1 | Write-Host
    }
}
