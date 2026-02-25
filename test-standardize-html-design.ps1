# PowerShell TEST script to standardize HTML design on sample files
# This script tests the design standardization on a few sample files

Write-Host "Starting HTML design standardization TEST..." -ForegroundColor Cyan

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

# Test files - selecting a few specific files we've already looked at
$testFiles = @(
    "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\2023\October 2023\G.R. No. 195837.html",
    "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\1996\October 1996\G.R. No. 123643.html",
    "d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\2025\April 2025\A.C. No. 14062.html"
)

$modifiedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($filePath in $testFiles) {
    Write-Host "`nProcessing: $filePath" -ForegroundColor Yellow
    
    if (-not (Test-Path $filePath)) {
        Write-Host "  File not found, skipping..." -ForegroundColor Red
        $errorCount++
        continue
    }
    
    try {
        # Read the file content
        $content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)
        
        Write-Host "  Original length: $($content.Length) characters" -ForegroundColor Gray
        
        # Check if file already has the standard style
        if ($content -match "margin:\s*5px\s+50px\s+40px\s+50px" -and $content -match "font-family:\s*times new roman") {
            Write-Host "  Status: Already has standard styling - SKIPPED" -ForegroundColor Green
            $skippedCount++
            continue
        }
        
        $modified = $false
        $newContent = $content
        
        # Case 1: File has <head> tag but no style
        if ($content -match "(?i)<head>") {
            Write-Host "  Detected: File has <head> tag" -ForegroundColor Gray
            
            # Check if there's already a <style> tag
            if ($content -notmatch "(?i)<style>") {
                Write-Host "  Action: Adding style to existing <head>" -ForegroundColor Gray
                
                # Find the position after <head> tag or after the last meta tag in head
                if ($content -match "(?i)(<head>.*?)(</head>)") {
                    # Insert style before </head>
                    $newContent = $content -replace "(?i)(</head>)", "`r`n$standardStyle`r`n</head>"
                    $modified = $true
                } elseif ($content -match "(?i)<head>") {
                    # No closing </head> tag, insert after <head> and meta tags
                    # Find the end of meta tags
                    $lines = $content -split "`r?`n"
                    $headLineIndex = -1
                    $lastMetaLineIndex = -1
                    
                    for ($i = 0; $i -lt $lines.Count; $i++) {
                        if ($lines[$i] -match "(?i)<head>") {
                            $headLineIndex = $i
                        }
                        if ($headLineIndex -ge 0 -and $lines[$i] -match "(?i)<meta") {
                            $lastMetaLineIndex = $i
                        }
                        if ($headLineIndex -ge 0 -and $lines[$i] -match "(?i)</head>") {
                            break
                        }
                    }
                    
                    if ($lastMetaLineIndex -ge 0) {
                        # Insert after last meta tag
                        $lines = $lines[0..$lastMetaLineIndex] + $standardStyle.Split("`n") + $lines[($lastMetaLineIndex + 1)..($lines.Count - 1)]
                        $newContent = $lines -join "`r`n"
                        $modified = $true
                    } elseif ($headLineIndex -ge 0) {
                        # Insert after <head> tag
                        $lines = $lines[0..$headLineIndex] + $standardStyle.Split("`n") + $lines[($headLineIndex + 1)..($lines.Count - 1)]
                        $newContent = $lines -join "`r`n"
                        $modified = $true
                    }
                }
            } else {
                Write-Host "  Action: Replacing existing <style> with standard style" -ForegroundColor Gray
                # Replace existing style with standard style
                $newContent = $content -replace "(?si)<style>.*?</style>", $standardStyle
                $modified = $true
            }
        }
        # Case 2: File has <html> but no <head> tag
        elseif ($content -match "(?i)<html>") {
            Write-Host "  Detected: File has <html> but no <head>" -ForegroundColor Gray
            Write-Host "  Action: Adding <head> with style after <html>" -ForegroundColor Gray
            
            # Insert after <html> tag
            $newContent = $content -replace "(?i)(<html>)", "`$1`r`n<head>`r`n$standardStyle`r`n</head>"
            $modified = $true
        }
        # Case 3: File starts with content (no <html> or <head>)
        else {
            Write-Host "  Detected: File has no proper HTML structure" -ForegroundColor Gray
            Write-Host "  Action: Adding complete HTML structure with style" -ForegroundColor Gray
            
            # Insert HTML structure at the beginning
            $htmlHeader = "<html>`r`n<head>`r`n$standardStyle`r`n</head>`r`n<body>`r`n"
            $htmlFooter = "`r`n</body>`r`n</html>"
            $newContent = $htmlHeader + $content + $htmlFooter
            $modified = $true
        }
        
        # Write the modified content back to the file
        if ($modified) {
            [System.IO.File]::WriteAllText($filePath, $newContent, [System.Text.Encoding]::UTF8)
            Write-Host "  Result: MODIFIED - New length: $($newContent.Length) characters" -ForegroundColor Green
            $modifiedCount++
        } else {
            Write-Host "  Result: SKIPPED - No changes needed" -ForegroundColor Yellow
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
