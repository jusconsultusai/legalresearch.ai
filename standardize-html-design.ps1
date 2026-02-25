# PowerShell script to standardize the design of HTML files in Decisions & Signed Resolutions folder
# This script adds the consistent styling from 43519.html to all HTML files

$scriptStartTime = Get-Date
Write-Host "Starting HTML design standardization..." -ForegroundColor Cyan
Write-Host "Start Time: $scriptStartTime" -ForegroundColor Cyan

# Define the base path
$basePath = "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions"

# Define the standard style block to be inserted
$standardStyle = @"
<style>body

	{

	 margin: 5px 50px 40px 50px;

	 color: #000000;

	  font-family:times new roman;

	 font-size: 110%;

	 line-height: 20px;

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
        
        # Check if file already has the standard style
        if ($content -match "margin:\s*5px\s+50px\s+40px\s+50px" -and $content -match "font-family:\s*times new roman") {
            $skippedCount++
            continue
        }
        
        $modified = $false
        $newContent = $content
        
        # Case 1: File has <head> tag but no style
        if ($content -match "(?i)<head>") {
            # Check if there's already a <style> tag
            if ($content -notmatch "(?i)<style>") {
                # Find the position after <head> tag or after the last meta tag in head
                if ($content -match "(?i)(<head>.*?)(</head>)") {
                    # Insert style before </head>
                    $newContent = $content -replace "(?i)(</head>)", "`r`n$standardStyle`r`n</head>"
                    $modified = $true
                } elseif ($content -match "(?i)<head>") {
                    # No closing </head> tag, insert after <head> and meta tags
                    $headPattern = "(?i)(<head>(?:.*?<meta[^>]*>)*.*?)(\r?\n)"
                    if ($content -match $headPattern) {
                        $newContent = $content -replace $headPattern, "`$1`r`n$standardStyle`r`n`$2"
                        $modified = $true
                    }
                }
            } else {
                # Replace existing style with standard style
                $newContent = $content -replace "(?si)<style>.*?</style>", $standardStyle
                $modified = $true
            }
        }
        # Case 2: File has no <head> tag at all
        elseif ($content -match "(?i)<html>") {
            # Insert after <html> tag
            $newContent = $content -replace "(?i)(<html>)", "`$1`r`n<head>`r`n$standardStyle`r`n</head>"
            $modified = $true
        }
        # Case 3: File starts with content (no <html> or <head>)
        else {
            # Insert HTML structure at the beginning
            $htmlHeader = "<html>`r`n<head>`r`n$standardStyle`r`n</head>`r`n<body>`r`n"
            $htmlFooter = "`r`n</body>`r`n</html>"
            $newContent = $htmlHeader + $content + $htmlFooter
            $modified = $true
        }
        
        # Write the modified content back to the file
        if ($modified) {
            [System.IO.File]::WriteAllText($file.FullName, $newContent, [System.Text.Encoding]::UTF8)
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
Write-Host "HTML Design Standardization Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Total files processed: $fileCount" -ForegroundColor Green
Write-Host "Files modified: $modifiedCount" -ForegroundColor Green
Write-Host "Files skipped (already standardized): $skippedCount" -ForegroundColor Yellow
Write-Host "Errors encountered: $errorCount" -ForegroundColor Red
Write-Host "Duration: $($duration.ToString())" -ForegroundColor Cyan
Write-Host "End Time: $scriptEndTime" -ForegroundColor Cyan
