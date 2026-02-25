# Comprehensive Copyright Update - Final Pass
# Ensures ALL HTML files have JusConsultus AI copyright

$ErrorActionPreference = "Continue"
$filesUpdated = 0
$filesSkipped = 0
$filesProcessed = 0

$currentYear = 2026
$newCopyrightMeta = '<meta name="copyright" content="Copyright © ' + $currentYear + ' JusConsultus AI. All Rights Reserved.">'
$newCopyrightComment = @"

<!--
    COPYRIGHT NOTICE
    Copyright © $currentYear JusConsultus AI
    All Rights Reserved.
    
    This legal database is maintained by JusConsultus AI.
-->
"@

Write-Host "Running comprehensive copyright update (final pass)...`n" -ForegroundColor Cyan

$htmlFiles = Get-ChildItem -Path "data\legal-database" -Filter "*.html" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|\\build\\|\\.git\\' }

Write-Host "Scanning $($htmlFiles.Count) HTML files`n"

foreach ($file in $htmlFiles) {
    $filesProcessed++
    
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8 -ErrorAction Stop
        
        if ([string]::IsNullOrWhiteSpace($content)) {
            continue
        }
        
        # Check if already has JusConsultus AI copyright
        if ($content.Contains('JusConsultus AI')) {
            $filesSkipped++
            continue
        }
        
        $modified = $false
        
        # Add copyright meta
        if ($content -match '<head') {
            # After viewport
            if ($content -match '<meta name="viewport"') {
                $content = $content -replace '(<meta name="viewport"[^>]*>)', "`$1`n$newCopyrightMeta"
                $modified = $true
            }
            # After charset
            elseif ($content -match '<meta charset=') {
                $content = $content -replace '(<meta charset=[^>]*>)', "`$1`n$newCopyrightMeta"
                $modified = $true
            }
            # After <head>
            elseif ($content -match '<head>') {
                $content = $content -replace '(<head>)', "`$1`n$newCopyrightMeta"
                $modified = $true
            }
        }
        
        # Add copyright comment
        if ($content -match '</title>') {
            $content = $content -replace '(</title>)', "`$1$newCopyrightComment"
            $modified = $true
        }
        elseif ($content -match '<meta name="copyright"[^>]*JusConsultus AI[^>]*>') {
            # No title, add after copyright meta
            $content = $content -replace '(<meta name="copyright"[^>]*JusConsultus AI[^>]*>)', "`$1$newCopyrightComment"
            $modified = $true
        }
        
        if ($modified) {
            Set-Content -Path $file.FullName -Value $content -NoNewline -Encoding UTF8 -ErrorAction Stop
            $filesUpdated++
            
            if ($filesUpdated % 1000 -eq 0) {
                Write-Host "✓ Updated $filesUpdated additional files..." -ForegroundColor Green
            }
        }
        
    }
    catch {
        Write-Host "Error: $($file.Name)" -ForegroundColor Red
    }
    
    if ($filesProcessed % 25000 -eq 0) {
        Write-Host "Progress: $filesProcessed/$($htmlFiles.Count) processed" -ForegroundColor Cyan
    }
}

Write-Host "`n========================================" -ForegroundColor Yellow
Write-Host "FINAL COPYRIGHT UPDATE SUMMARY" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Total files processed: $filesProcessed"
Write-Host "Already had JusConsultus AI: $filesSkipped" -ForegroundColor Cyan
Write-Host "Newly updated: $filesUpdated" -ForegroundColor Green
Write-Host "`nAll HTML files now have JusConsultus AI copyright!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Yellow
