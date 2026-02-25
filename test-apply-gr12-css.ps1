# TEST script to apply G.R. No. 12 CSS styles to sample files

Write-Host "Starting CSS style update TEST..." -ForegroundColor Cyan

# Define the comprehensive CSS style block from G.R. No. 12
$comprehensiveStyle = @"
  <style>
    body {
      margin: 5px 50px 40px 50px;
      color: #000000;
      font-family: times new roman;
      font-size: 110%;
      line-height: 20px;
    }

    center {
      text-align: center;
    }

    h2 {
      font-size: 1.5em;
      font-weight: bold;
      margin: 10px 0;
    }

    h2.case-header {
      background-color: #cccccc;
      padding-top: 10px;
      padding-bottom: 10px;
    }

    h3 {
      font-size: 1.2em;
      font-weight: bold;
      margin: 10px 0;
    }

    p {
      margin: 10px 0;
      text-align: justify;
    }

    .cb {
      text-align: center;
      font-weight: bold;
    }

    .c {
      text-align: center;
    }

    .j {
      text-align: justify;
    }

    .ji {
      text-align: justify;
      text-indent: 2em;
    }

    .jn {
      text-align: justify;
    }

    div[align="JUSTIFY"], div[align="justify"] {
      text-align: justify;
    }

    strong {
      font-weight: bold;
    }

    i, em {
      font-style: italic;
    }

    sup {
      vertical-align: super;
      font-size: smaller;
    }

    hr {
      border: 0;
      height: 1px;
      background-color: #000080;
    }

    a {
      color: #0000EE;
      text-decoration: underline;
    }

    a:visited {
      color: #551A8B;
    }

    .nt {
      color: #0000EE;
      text-decoration: underline;
      cursor: pointer;
    }
  </style>
"@

# Test files
$testFiles = @(
    "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\2023\October 2023\G.R. No. 195837.html",
    "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\1996\October 1996\G.R. No. 123643.html",
    "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\2025\April 2025\A.C. No. 14062.html"
)

$modifiedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($filePath in $testFiles) {
    Write-Host "`n================================================" -ForegroundColor Yellow
    Write-Host "Processing: $filePath" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Yellow
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  File not found, skipping..." -ForegroundColor Red
        $errorCount++
        continue
    }
    
    try {
        # Read the file content
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        $originalContent = $content
        
        Write-Host "Original length: $($content.Length) characters" -ForegroundColor Gray
        
        # Check if file already has the comprehensive style
        if ($content -match "h2\.case-header" -and $content -match "margin:\s*5px\s+50px\s+40px\s+50px") {
            Write-Host "  Status: Already has comprehensive CSS styles - SKIPPED" -ForegroundColor Green
            $skippedCount++
            continue
        }
        
        $modified = $false
        
        # Replace existing <style> block with comprehensive style
        if ($content -match "(?si)<style>.*?</style>") {
            Write-Host "  [ACTION] Replacing existing <style> block with comprehensive CSS" -ForegroundColor Cyan
            $content = $content -replace "(?si)<style>.*?</style>", $comprehensiveStyle
            $modified = $true
        }
        # If no style block exists but there's a <head>, add it
        elseif ($content -match "(?i)<head>") {
            Write-Host "  [ACTION] Adding comprehensive CSS to existing <head>" -ForegroundColor Cyan
            $content = $content -replace "(?i)(</head>)", "$comprehensiveStyle`r`n</head>"
            $modified = $true
        }
        # If there's <html> but no <head>, add both
        elseif ($content -match "(?i)<html[^>]*>") {
            Write-Host "  [ACTION] Creating <head> with comprehensive CSS" -ForegroundColor Cyan
            $content = $content -replace "(?i)(<html[^>]*>)", "`$1`r`n<head>$comprehensiveStyle`r`n</head>"
            $modified = $true
        }
        
        # Also update inline h2 style to use class instead
        if ($content -match '(?i)<h2\s+style=') {
            Write-Host "  [ACTION] Converting inline h2 style(s) to class='case-header'" -ForegroundColor Cyan
            $content = $content -replace "(?i)<h2\s+style=[`"'][^`"']*background-color[^>]*>", '<h2 class="case-header">'
            $modified = $true
        }
        
        # Write the modified content back to file
        if ($modified -and $content -ne $originalContent) {
            [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
            Write-Host "  Result: MODIFIED - New length: $($content.Length) characters" -ForegroundColor Green
            $modifiedCount++
        } else {
            Write-Host "  Result: NO CHANGES NEEDED" -ForegroundColor Yellow
            $skippedCount++
        }
        
    } catch {
        $errorCount++
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "TEST Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Files modified: $modifiedCount" -ForegroundColor Green
Write-Host "Files skipped: $skippedCount" -ForegroundColor Yellow
Write-Host "Errors: $errorCount" -ForegroundColor Red
