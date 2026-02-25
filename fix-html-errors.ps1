# PowerShell script to fix HTML accessibility and validation errors
# This script fixes: missing alt text, missing titles, lang attributes, charset format

$scriptStartTime = Get-Date
Write-Host "Starting HTML error fixes..." -ForegroundColor Cyan
Write-Host "Start Time: $scriptStartTime" -ForegroundColor Cyan

# Define the base path
$basePath = "d:\JusConsultus.AI\data\legal-database"

# Counters
$fileCount = 0
$modifiedCount = 0
$skippedCount = 0
$errorCount = 0

# Statistics for different fixes
$altTextAdded = 0
$titleAttributeAdded = 0
$langAttributeAdded = 0
$charsetFixed = 0
$titleElementAdded = 0

# Get all HTML files recursively
$htmlFiles = Get-ChildItem -Path $basePath -Filter "*.html" -Recurse -File

$totalFiles = $htmlFiles.Count
Write-Host "Found $totalFiles HTML files to process..." -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    $fileCount++
    
    # Progress indicator every 1000 files
    if ($fileCount % 1000 -eq 0) {
        $percentComplete = [math]::Round(($fileCount / $totalFiles) * 100, 2)
        Write-Host "Processing file $fileCount of $totalFiles ($percentComplete%)... (Modified: $modifiedCount, Errors: $errorCount)" -ForegroundColor Green
    }
    
    try {
        # Read the file content
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $originalContent = $content
        $modified = $false
        
        # Fix 1: Add lang attribute to <html> tag if missing
        if ($content -match '(?i)<html>' -and $content -notmatch '(?i)<html[^>]+lang=') {
            $content = $content -replace '(?i)<html>', '<html lang="en">'
            $modified = $true
            $langAttributeAdded++
        }
        
        # Fix 2: Update old charset meta to new format
        if ($content -match '(?i)<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?>') {
            $content = $content -replace '(?i)<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?>', '<meta charset="utf-8" />'
            $modified = $true
            $charsetFixed++
        }
        
        # Fix 3: Add alt text to images without alt attribute
        # Match <img> tags without alt attribute (handles tags without quotes on attributes)
        $imgPattern = '(?i)<img(?:(?!alt[\s]*=)[^>])*>'
        $imgMatches = [regex]::Matches($content, $imgPattern)
        if ($imgMatches.Count -gt 0) {
            $replacements = @{}
            foreach ($match in $imgMatches) {
                $imgTag = $match.Value
                
                # Skip if already has alt
                if ($imgTag -match '(?i)alt\s*=') {
                    continue
                }
                
                # Determine appropriate alt text based on src
                $altText = ""
                if ($imgTag -match 'lawphil') {
                    $altText = 'LawPhil Logo'
                } elseif ($imgTag -match 'congress') {
                    $altText = 'Congress Logo'
                } elseif ($imgTag -match 'back\.gif') {
                    $altText = 'Back Button'
                } elseif ($imgTag -match 'top\.gif') {
                    $altText = 'Back to Top'
                } elseif ($imgTag -match '010\.gif') {
                    $altText = 'Decorative Image'
                } elseif ($imgTag -match 'logo') {
                    $altText = 'Logo'
                } elseif ($imgTag -match 'banner') {
                    $altText = 'Banner'
                } else {
                    $altText = 'Image'
                }
                
                # Add alt attribute before the closing >
                $newImgTag = $imgTag -replace '>$', " alt=`"$altText`">"
                
                # Store replacement to avoid duplicate replacements
                if (-not $replacements.ContainsKey($imgTag)) {
                    $replacements[$imgTag] = $newImgTag
                }
            }
            
            # Apply all replacements
            foreach ($key in $replacements.Keys) {
                $content = $content.Replace($key, $replacements[$key])
                $modified = $true
                $altTextAdded++
            }
        }
        
        # Fix 4: Add title attribute to links containing only images (no text content)
        # Match <a> tags that contain only <img> and no text
        $linkPattern = '(?i)<a\s+([^>]*)>(\s*<img[^>]*>\s*)</a>'
        $linkMatches = [regex]::Matches($content, $linkPattern)
        if ($linkMatches.Count -gt 0) {
            $linkReplacements = @{}
            foreach ($match in $linkMatches) {
                $linkTag = $match.Value
                $attributes = $match.Groups[1].Value
                
                # Skip if already has title attribute
                if ($attributes -match '(?i)title\s*=') {
                    continue
                }
                
                $titleText = ""
                
                # Determine title based on href or image content
                if ($linkTag -match 'back\.gif' -or $attributes -match 'history\.back') {
                    $titleText = 'Go Back'
                } elseif ($linkTag -match 'top\.gif' -or $attributes -match '#top') {
                    $titleText = 'Back to Top'
                } else {
                    $titleText = 'Link'
                }
                
                # Add title attribute to the opening tag
                $newLinkTag = $linkTag -replace '(?i)(<a\s+)([^>]*)(>)', "`$1`$2 title=`"$titleText`"`$3"
                
                # Store replacement
                if (-not $linkReplacements.ContainsKey($linkTag)) {
                    $linkReplacements[$linkTag] = $newLinkTag
                }
            }
            
            # Apply all replacements
            foreach ($key in $linkReplacements.Keys) {
                $content = $content.Replace($key, $linkReplacements[$key])
                $modified = $true
                $titleAttributeAdded++
            }
        }
        
        # Fix 5: Add <title> element if missing
        if ($content -match '(?i)<html' -and $content -notmatch '(?i)<title[^>]*>') {
            # Try to extract document title from content
            $docTitle = "Legal Document"
            
            # Try to find G.R. No., A.M. No., Republic Act, etc.
            if ($content -match '(?i)(G\.R\.\s+No\.\s+[\d\-]+)') {
                $docTitle = $matches[1]
            } elseif ($content -match '(?i)(A\.M\.\s+No\.\s+[\w\d\-]+)') {
                $docTitle = $matches[1]
            } elseif ($content -match '(?i)(A\.C\.\s+No\.\s+[\d\-]+)') {
                $docTitle = $matches[1]
            } elseif ($content -match '(?i)(Republic Act No\.\s+\d+)') {
                $docTitle = $matches[1]
            } elseif ($content -match '(?i)(Presidential Decree No\.\s+\d+)') {
                $docTitle = $matches[1]
            } elseif ($content -match '(?i)(Executive Order No\.\s+\d+)') {
                $docTitle = $matches[1]
            } elseif ($file.Name -match '^([^\.]+)') {
                # Use filename without extension as fallback
                $docTitle = $matches[1] -replace '_', ' '
            }
            
            # Insert title after <head> or create head section
            if ($content -match '(?i)<head>') {
                $content = $content -replace '(?i)(<head>)', "`$1`r`n<title>$docTitle</title>"
                $modified = $true
                $titleElementAdded++
            } elseif ($content -match '(?i)<html[^>]*>') {
                $content = $content -replace '(?i)(<html[^>]*>)', "`$1`r`n<head>`r`n<title>$docTitle</title>`r`n</head>"
                $modified = $true
                $titleElementAdded++
            }
        }
        
        # Write the modified content back to the file
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
Write-Host "HTML Error Fix Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Total files processed: $fileCount" -ForegroundColor Green
Write-Host "Files modified: $modifiedCount" -ForegroundColor Green
Write-Host "Files skipped: $skippedCount" -ForegroundColor Yellow
Write-Host "Errors encountered: $errorCount" -ForegroundColor Red
Write-Host "" -ForegroundColor White
Write-Host "Fix Statistics:" -ForegroundColor Yellow
Write-Host "  - Alt text added to images: $altTextAdded" -ForegroundColor Green
Write-Host "  - Title attributes added to links: $titleAttributeAdded" -ForegroundColor Green
Write-Host "  - Lang attributes added: $langAttributeAdded" -ForegroundColor Green
Write-Host "  - Charset meta tags fixed: $charsetFixed" -ForegroundColor Green
Write-Host "  - Title elements added: $titleElementAdded" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Duration: $($duration.ToString())" -ForegroundColor Cyan
Write-Host "End Time: $scriptEndTime" -ForegroundColor Cyan
