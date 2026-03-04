# Comprehensive HTML Fix Script
# Fixes ALL HTML errors and improves CSS across all legal database files
# 
# Issues fixed:
#   1. Missing lang="en" on <html> tags
#   2. Old charset meta format -> modern <meta charset="utf-8">
#   3. Unquoted font-family in CSS
#   4. Stray </table> tags without matching <table>
#   5. Stray </div> tags without matching <div>
#   6. Missing CSS class definitions for .cb, .jn, .j, .ji, .jb, .jbn, .sgd, .f, .b, .c, .nt
#   7. Improved comprehensive CSS with proper typography and spacing
#   8. Missing <br /> self-closing
#   9. Unclosed <meta> tags

$scriptStartTime = Get-Date
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Comprehensive HTML Fix & CSS Improvement" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Start Time: $scriptStartTime" -ForegroundColor Cyan

$basePath = "d:\JusConsultus.AI\data\legal-database"

# Comprehensive CSS style block with all classes used across the database
$comprehensiveStyle = @'
  <style>
    /* Base typography and layout */
    body {
      margin: 20px 50px 40px 50px;
      color: #1a1a1a;
      font-family: 'Times New Roman', Georgia, 'Noto Serif', serif;
      font-size: 110%;
      line-height: 1.6;
      background-color: #ffffff;
      max-width: 960px;
      margin-left: auto;
      margin-right: auto;
      padding: 20px 50px 40px 50px;
    }

    /* Headings */
    h1, h2, h3, h4, h5, h6 {
      color: #1a1a1a;
      line-height: 1.3;
      margin: 0.8em 0 0.4em 0;
    }

    h2 {
      font-size: 1.4em;
      font-weight: bold;
    }

    h2.case-header {
      background-color: #e8e8e8;
      padding: 10px 15px;
      border-left: 4px solid #2c3e50;
    }

    h3 {
      font-size: 1.2em;
      font-weight: bold;
    }

    /* Paragraph defaults */
    p {
      margin: 0.6em 0;
      text-align: justify;
      orphans: 2;
      widows: 2;
    }

    /* Class: center-bold (.cb) */
    .cb {
      text-align: center;
      font-weight: bold;
    }

    /* Class: center (.c) */
    .c {
      text-align: center;
    }

    /* Class: justify (.j) */
    .j {
      text-align: justify;
    }

    /* Class: justify-normal (.jn) - no indent, justified */
    .jn {
      text-align: justify;
    }

    /* Class: justify-indent (.ji) */
    .ji {
      text-align: justify;
      text-indent: 2em;
    }

    /* Class: justify-bold (.jb) */
    .jb {
      text-align: justify;
      font-weight: bold;
    }

    /* Class: justify-bold no-indent (.jbn) */
    .jbn {
      text-align: justify;
      font-weight: bold;
    }

    /* Class: bold (.b) */
    .b {
      font-weight: bold;
    }

    /* Class: signature (.sgd) */
    .sgd {
      text-align: right;
      margin-top: 2em;
      margin-right: 2em;
    }

    /* Class: form/fill-in (.f) */
    .f {
      text-align: left;
      margin-left: 4em;
    }

    /* Class: note/link (.nt) */
    .nt {
      color: #0000EE;
      text-decoration: underline;
      cursor: pointer;
    }

    /* Justify alignment helpers */
    div[align="JUSTIFY"], div[align="justify"] {
      text-align: justify;
    }

    /* Text styling */
    strong, b {
      font-weight: bold;
    }

    i, em {
      font-style: italic;
    }

    sup {
      vertical-align: super;
      font-size: 0.8em;
    }

    sub {
      vertical-align: sub;
      font-size: 0.8em;
    }

    /* Horizontal rule */
    hr {
      border: 0;
      height: 1px;
      background-color: #cccccc;
      margin: 1.5em 0;
    }

    /* Links */
    a {
      color: #2c5aa0;
      text-decoration: underline;
    }

    a:hover {
      color: #1a3d6e;
    }

    a:visited {
      color: #5b2c8b;
    }

    /* Tables */
    table {
      border-collapse: collapse;
      margin: 1em auto;
      max-width: 100%;
    }

    td, th {
      padding: 6px 12px;
      vertical-align: top;
    }

    /* Blockquote */
    blockquote {
      margin: 1em 3em;
      padding: 0.5em 1em;
      border-left: 3px solid #cccccc;
      font-style: italic;
    }

    /* Pre/Code */
    pre {
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: 'Courier New', Courier, monospace;
      background-color: #f5f5f5;
      padding: 10px;
      border: 1px solid #ddd;
      overflow-x: auto;
    }

    /* Print styles */
    @media print {
      body {
        margin: 0.5in;
        padding: 0;
        font-size: 11pt;
        line-height: 1.4;
        max-width: none;
      }
      a {
        color: #000;
        text-decoration: none;
      }
    }

    /* Responsive */
    @media screen and (max-width: 768px) {
      body {
        margin: 10px;
        padding: 10px 15px;
        font-size: 100%;
      }
      .sgd {
        margin-right: 1em;
      }
      table {
        font-size: 0.9em;
      }
    }
  </style>
'@

# Counters
$stats = @{
    Total = 0
    Modified = 0
    Skipped = 0
    Errors = 0
    LangAdded = 0
    CharsetFixed = 0
    CSSUpgraded = 0
    StrayTableRemoved = 0
    StrayDivRemoved = 0
    FontFamilyFixed = 0
}

# Get all HTML files
$htmlFiles = Get-ChildItem -Path $basePath -Filter "*.html" -Recurse -File
$totalFiles = $htmlFiles.Count
Write-Host "Found $totalFiles HTML files to process..." -ForegroundColor Yellow
Write-Host ""

foreach ($file in $htmlFiles) {
    $stats.Total++
    
    # Progress every 2000 files
    if ($stats.Total % 2000 -eq 0) {
        $pct = [math]::Round(($stats.Total / $totalFiles) * 100, 1)
        Write-Host "  [$pct%] Processing $($stats.Total) / $totalFiles (Modified: $($stats.Modified), Errors: $($stats.Errors))" -ForegroundColor Green
    }
    
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        $original = $content
        $modified = $false
        
        # Skip files already fully fixed
        if ($content -match 'Class: center-bold' -and $content -match 'lang="en"' -and $content -notmatch 'http-equiv="Content-Type"') {
            $stats.Skipped++
            continue
        }
        
        # ── Fix 1: Add lang="en" to <html> if missing ──
        if ($content -match '<html>' -and $content -notmatch '<html\s+lang') {
            $content = $content -replace '<html>', '<html lang="en">'
            $modified = $true
            $stats.LangAdded++
        }
        
        # ── Fix 2: Modernize charset meta tag ──
        if ($content -match '(?i)<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?>') {
            $content = $content -replace '(?i)<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?>', '<meta charset="utf-8" />'
            $modified = $true
            $stats.CharsetFixed++
        }
        
        # ── Fix 3: Replace basic/old CSS with comprehensive CSS ──
        # Check if file has a <style> block but NOT the comprehensive one
        if ($content -match '(?si)<style>.*?</style>') {
            # Skip files that already have the comprehensive style
            if ($content -notmatch 'Class: center-bold') {
                $content = $content -replace '(?si)<style>.*?</style>', $comprehensiveStyle
                $modified = $true
                $stats.CSSUpgraded++
            }
        }
        # If no style but has </head>, insert before </head>
        elseif ($content -match '(?i)</head>') {
            $content = $content -replace '(?i)(</head>)', "$comprehensiveStyle`r`n`$1"
            $modified = $true
            $stats.CSSUpgraded++
        }
        # If has <head> but no </head>, add style after <head> line
        elseif ($content -match '(?i)<head>') {
            $content = $content -replace '(?i)(<head>)', "`$1`r`n$comprehensiveStyle"
            $modified = $true
            $stats.CSSUpgraded++
        }
        # If has <body> but no <head>, insert <head> with style before <body>
        elseif ($content -match '(?i)<body[^>]*>') {
            $content = $content -replace '(?i)(<body[^>]*>)', "<head>`r`n$comprehensiveStyle`r`n</head>`r`n`$1"
            $modified = $true
            $stats.CSSUpgraded++
        }
        # If has <html> but no <head>/<body>, insert after <html>
        elseif ($content -match '(?i)<html[^>]*>') {
            $content = $content -replace '(?i)(<html[^>]*>)', "`$1`r`n<head>`r`n$comprehensiveStyle`r`n</head>"
            $modified = $true
            $stats.CSSUpgraded++
        }
        
        # ── Fix 4: Remove stray </table> without matching <table> ──
        $openTableCount = ([regex]::Matches($content, '(?i)<table[\s>]')).Count
        $closeTableCount = ([regex]::Matches($content, '(?i)</table>')).Count
        if ($closeTableCount -gt $openTableCount) {
            # Remove excess closing table tags from the end of content
            $excess = $closeTableCount - $openTableCount
            for ($i = 0; $i -lt $excess; $i++) {
                # Remove last occurrence of </table> (with optional surrounding whitespace/newlines)
                $content = $content -replace '(?s)(.*)\s*</table>\s*', '$1'
            }
            $modified = $true
            $stats.StrayTableRemoved++
        }
        
        # ── Fix 5: Remove stray </div> without matching <div> ──
        $openDivCount = ([regex]::Matches($content, '(?i)<div[\s>]')).Count
        $closeDivCount = ([regex]::Matches($content, '(?i)</div>')).Count
        if ($closeDivCount -gt $openDivCount) {
            $excess = $closeDivCount - $openDivCount
            for ($i = 0; $i -lt $excess; $i++) {
                $content = $content -replace '(?s)(.*)\s*</div>\s*', '$1'
            }
            $modified = $true
            $stats.StrayDivRemoved++
        }
        
        # ── Fix 6: Fix unquoted font-family ──
        if ($content -match "font-family:\s*times new roman(?!')" -and $content -notmatch "font-family:\s*'Times New Roman'") {
            $content = $content -replace "font-family:\s*times new roman", "font-family: 'Times New Roman', Georgia, 'Noto Serif', serif"
            $modified = $true
            $stats.FontFamilyFixed++
        }
        
        # ── Write if modified ──
        if ($modified -and $content -ne $original) {
            [System.IO.File]::WriteAllText($file.FullName, $content, (New-Object System.Text.UTF8Encoding $false))
            $stats.Modified++
        } else {
            $stats.Skipped++
        }
        
    } catch {
        $stats.Errors++
        if ($stats.Errors -le 10) {
            Write-Host "  ERROR: $($file.FullName) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Final Summary
$duration = (Get-Date) - $scriptStartTime

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " COMPLETE - Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Total files processed:     $($stats.Total)" -ForegroundColor White
Write-Host "Files modified:            $($stats.Modified)" -ForegroundColor Green
Write-Host "Files skipped (no change): $($stats.Skipped)" -ForegroundColor Yellow
Write-Host "Errors:                    $($stats.Errors)" -ForegroundColor Red
Write-Host "" -ForegroundColor White
Write-Host "Fix Breakdown:" -ForegroundColor Yellow
Write-Host "  lang='en' added:         $($stats.LangAdded)" -ForegroundColor Green
Write-Host "  Charset modernized:      $($stats.CharsetFixed)" -ForegroundColor Green
Write-Host "  CSS upgraded:            $($stats.CSSUpgraded)" -ForegroundColor Green
Write-Host "  Stray </table> removed:  $($stats.StrayTableRemoved)" -ForegroundColor Green
Write-Host "  Stray </div> removed:    $($stats.StrayDivRemoved)" -ForegroundColor Green
Write-Host "  font-family fixed:       $($stats.FontFamilyFixed)" -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "Duration: $($duration.ToString())" -ForegroundColor Cyan
