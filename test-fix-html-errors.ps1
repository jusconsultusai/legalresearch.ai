# TEST script to fix HTML errors on sample files

Write-Host "Starting HTML error fix TEST..." -ForegroundColor Cyan

# Test files with known errors
$testFiles = @(
    "d:\JusConsultus.AI\data\legal-database\Laws\Republic Acts\ra_1_1946.html",
    "d:\JusConsultus.AI\data\legal-database\Treaties\Bilateral\9453.html",
    "d:\JusConsultus.AI\data\legal-database\References\Benchbooks\50132.html"
)

$modifiedCount = 0
$errorCount = 0
$altTextAdded = 0
$titleAttributeAdded = 0
$langAttributeAdded = 0
$charsetFixed = 0
$titleElementAdded = 0

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
        $modified = $false
        
        Write-Host "Original length: $($content.Length) characters" -ForegroundColor Gray
        
        # Fix 1: Add lang attribute to <html> tag if missing
        if ($content -match '(?i)<html>' -and $content -notmatch '(?i)<html[^>]+lang=') {
            Write-Host "  [FIX] Adding lang attribute to <html> tag" -ForegroundColor Cyan
            $content = $content -replace '(?i)<html>', '<html lang="en">'
            $modified = $true
            $langAttributeAdded++
        }
        
        # Fix 2: Update old charset meta to new format
        if ($content -match '(?i)<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?>') {
            Write-Host "  [FIX] Updating charset meta to new format" -ForegroundColor Cyan
            $content = $content -replace '(?i)<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?>', '<meta charset="utf-8" />'
            $modified = $true
            $charsetFixed++
        }
        
        # Fix 3: Add alt text to images without alt attribute
        $imgPattern = '(?i)<img(?:(?!alt[\s]*=)[^>])*>'
        $imgMatches = [regex]::Matches($content, $imgPattern)
        if ($imgMatches.Count -gt 0) {
            Write-Host "  [FIX] Adding alt text to $($imgMatches.Count) images (checking...)" -ForegroundColor Cyan
            
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
                    Write-Host "    - Will add alt='$altText' to: $($imgTag.Substring(0, [Math]::Min(60, $imgTag.Length)))..." -ForegroundColor Gray
                }
            }
            
            Write-Host "  [FIX] Actually adding alt text to $($replacements.Count) unique images" -ForegroundColor Cyan
            
            # Apply all replacements
            foreach ($key in $replacements.Keys) {
                $content = $content.Replace($key, $replacements[$key])
                $modified = $true
                $altTextAdded++
            }
        }
        
        # Fix 4: Add title attribute to links containing only images
        $linkPattern = '(?i)<a\s+([^>]*)>(\s*<img[^>]*>\s*)</a>'
        $linkMatches = [regex]::Matches($content, $linkPattern)
        if ($linkMatches.Count -gt 0) {
            Write-Host "  [FIX] Checking $($linkMatches.Count) image-only links for title attributes" -ForegroundColor Cyan
            
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
                    Write-Host "    - Will add title='$titleText'" -ForegroundColor Gray
                }
            }
            
            Write-Host "  [FIX] Actually adding title to $($linkReplacements.Count) links" -ForegroundColor Cyan
            
            # Apply all replacements
            foreach ($key in $linkReplacements.Keys) {
                $content = $content.Replace($key, $linkReplacements[$key])
                $modified = $true
                $titleAttributeAdded++
            }
        }
        
        # Fix 5: Add <title> element if missing
        if ($content -match '(?i)<html' -and $content -notmatch '(?i)<title[^>]*>') {
            Write-Host "  [FIX] Adding <title> element" -ForegroundColor Cyan
            
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
            } elseif ((Split-Path $filePath -Leaf) -match '^([^\.]+)') {
                # Use filename without extension as fallback
                $docTitle = $matches[1] -replace '_', ' '
            }
            
            Write-Host "    - Title: '$docTitle'" -ForegroundColor Gray
            
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
            [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
            Write-Host "Result: MODIFIED - New length: $($content.Length) characters" -ForegroundColor Green
            $modifiedCount++
        } else {
            Write-Host "Result: NO CHANGES NEEDED" -ForegroundColor Yellow
        }
        
    } catch {
        $errorCount++
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "TEST Complete" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Files modified: $modifiedCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor Red
Write-Host "" -ForegroundColor White
Write-Host "Fix Statistics:" -ForegroundColor Yellow
Write-Host "  - Alt text added to images: $altTextAdded" -ForegroundColor Green
Write-Host "  - Title attributes added to links: $titleAttributeAdded" -ForegroundColor Green
Write-Host "  - Lang attributes added: $langAttributeAdded" -ForegroundColor Green
Write-Host "  - Charset meta tags fixed: $charsetFixed" -ForegroundColor Green
Write-Host "  - Title elements added: $titleElementAdded" -ForegroundColor Green
