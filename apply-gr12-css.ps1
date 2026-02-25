# PowerShell script to apply G.R. No. 12 CSS styles to all Supreme Court Decisions
# This script updates the CSS styling to match the comprehensive format

$scriptStartTime = Get-Date
Write-Host "Starting CSS style update from G.R. No. 12..." -ForegroundColor Cyan
Write-Host "Start Time: $scriptStartTime" -ForegroundColor Cyan

# Define the base path
$basePath = "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions"

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

# Counters
$fileCount = 0
$modifiedCount = 0
$skippedCount = 0
$errorCount = 0

# Get all HTML files recursively
$htmlFiles = Get-ChildItem -Path $basePath -Filter "*.html" -Recurse -File

$totalFiles = $htmlFiles.Count
Write-Host "Found $totalFiles HTML files to process..." -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    $fileCount++
    
    # Progress indicator every 1000 files
    if ($fileCount % 1000 -eq 0) {
        $percentComplete = [math]::Round(($fileCount / $totalFiles) * 100, 2)
        Write-Host "Processing file $fileCount of $totalFiles ($percentComplete%)... (Modified: $modifiedCount, Skipped: $skippedCount, Errors: $errorCount)" -ForegroundColor Green
    }
    
    try {
        # Read the file content
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $originalContent = $content
        $modified = $false
        
        # Check if file already has the comprehensive style
        if ($content -match "h2\.case-header" -and $content -match "margin:\s*5px\s+50px\s+40px\s+50px") {
            $skippedCount++
            continue
        }
        
        # Replace existing <style> block with comprehensive style
        if ($content -match "(?si)<style>.*?</style>") {
            $content = $content -replace "(?si)<style>.*?</style>", $comprehensiveStyle
            $modified = $true
        }
        # If no style block exists but there's a <head>, add it
        elseif ($content -match "(?i)<head>") {
            $content = $content -replace "(?i)(</head>)", "$comprehensiveStyle`r`n</head>"
            $modified = $true
        }
        # If there's <html> but no <head>, add both
        elseif ($content -match "(?i)<html[^>]*>") {
            $content = $content -replace "(?i)(<html[^>]*>)", "`$1`r`n<head>$comprehensiveStyle`r`n</head>"
            $modified = $true
        }
        
        # Also update inline h2 style to use class instead
        if ($content -match '(?i)<h2\s+style=') {
            $content = $content -replace "(?i)<h2\s+style=[`"'][^`"']*background-color[^>]*>", '<h2 class="case-header">'
            $modified = $true
        }
        
        # Write the modified content back to file
        if ($modified -and $content -ne $originalContent) {
            [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
            $modifiedCount++
            
            # Progress indicator every 500 modifications
            if ($modifiedCount % 500 -eq 0) {
                Write-Host "  -> Modified $modifiedCount files so far..." -ForegroundColor Cyan
            }
        } else {
            $skippedCount++
        }
        
    } catch {
        $errorCount++
        Write-Host "Error processing file: $($file.FullName)" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Final summary
$scriptEndTime = Get-Date
$duration = $scriptEndTime - $scriptStartTime

Write-Host "`n" -NoNewline
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "CSS Style Update Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Total files processed: $fileCount" -ForegroundColor Green
Write-Host "Files modified: $modifiedCount" -ForegroundColor Green
Write-Host "Files skipped (already have comprehensive styles): $skippedCount" -ForegroundColor Yellow
Write-Host "Errors encountered: $errorCount" -ForegroundColor Red
Write-Host "" -ForegroundColor White
Write-Host "Duration: $($duration.ToString())" -ForegroundColor Cyan
Write-Host "End Time: $scriptEndTime" -ForegroundColor Cyan
