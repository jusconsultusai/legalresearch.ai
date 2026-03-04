<#
.SYNOPSIS
    Strips all LawPhil branding, logos, scripts, watermarks, and navigation from
    every HTML/HTM file under data/legal-database and rewrites each file with a
    clean, standardised HTML structure matching the reference template.

.DESCRIPTION
    Target format (from "G.R. No. 12, August 8, 1901.html"):
      - <!DOCTYPE html><html><head> with charset, robots, jusconsultus metas, title, and standard CSS
      - <body> containing only the legal content
      - All LawPhil artefacts removed

.NOTES
    Run from the repo root:  .\clean-lawphil.ps1
    Uses parallel processing via runspaces for speed on 100k+ files.
#>

param(
    [string]$RootDir = "d:\JusConsultus.AI\data\legal-database",
    [int]$BatchSize = 500,
    [int]$MaxThreads = 8,
    [switch]$DryRun
)

$ErrorActionPreference = 'Continue'

# ── The cleaning function applied to each file ──────────────────────────────
$CleanFileScript = {
    param([string]$FilePath, [bool]$DryRun)

    try {
        # Read raw bytes → string (handles various encodings)
        $raw = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
        if (-not $raw -or $raw.Length -lt 30) { return "SKIP_EMPTY" }

        $content = $raw

        # ── 1. Extract jusconsultus meta values ────────────────────────────
        $jcTitle = ''; $jcType = ''; $jcIndexed = '2026-02-22'
        if ($content -match 'jusconsultus:title[''"]?\s*(content|value)\s*=\s*[''"]([^''"]+)[''"]' -or
            $content -match 'content\s*=\s*[''"]([^''"]+)[''"]\s*name\s*=\s*[''"]jusconsultus:title[''"]') {
            $jcTitle = $Matches[2] ?? $Matches[1]
        }
        # Alternate attribute order
        if (-not $jcTitle -and $content -match 'name\s*=\s*[''"]jusconsultus:title[''"]\s*content\s*=\s*[''"]([^''"]+)[''"]') {
            $jcTitle = $Matches[1]
        }
        if ($content -match 'jusconsultus:type[''"]?\s*content\s*=\s*[''"]([^''"]+)[''"]' -or
            $content -match 'content\s*=\s*[''"]([^''"]+)[''"]\s*name\s*=\s*[''"]jusconsultus:type[''"]') {
            $jcType = $Matches[1]
        }
        if (-not $jcType -and $content -match 'name\s*=\s*[''"]jusconsultus:type[''"]\s*content\s*=\s*[''"]([^''"]+)[''"]') {
            $jcType = $Matches[1]
        }
        if ($content -match 'jusconsultus:indexed[''"]?\s*content\s*=\s*[''"]([^''"]+)[''"]' -or
            $content -match 'content\s*=\s*[''"]([^''"]+)[''"]\s*name\s*=\s*[''"]jusconsultus:indexed[''"]') {
            $jcIndexed = $Matches[1]
        }
        if (-not $jcIndexed -or $jcIndexed -eq '2026-02-22') {
            if ($content -match 'name\s*=\s*[''"]jusconsultus:indexed[''"]\s*content\s*=\s*[''"]([^''"]+)[''"]') {
                $jcIndexed = $Matches[1]
            }
        }

        # Fallback title from <title> tag
        if (-not $jcTitle -and $content -match '<title[^>]*>([^<]+)</title>') {
            $t = $Matches[1].Trim()
            if ($t -and $t -ne 'Document' -and $t -ne 'Untitled') { $jcTitle = $t }
        }
        # Fallback title from filename
        if (-not $jcTitle) {
            $jcTitle = [System.IO.Path]::GetFileNameWithoutExtension($FilePath)
        }
        # Fallback type from path
        if (-not $jcType) {
            $pathLower = $FilePath.ToLower()
            if ($pathLower -match 'supreme court') { $jcType = 'Supreme Court Decision' }
            elseif ($pathLower -match 'executive orders') { $jcType = 'Executive Order' }
            elseif ($pathLower -match 'administrative orders') { $jcType = 'Administrative Order' }
            elseif ($pathLower -match 'memorandum circulars') { $jcType = 'Memorandum Circular' }
            elseif ($pathLower -match 'memorandum orders') { $jcType = 'Memorandum Order' }
            elseif ($pathLower -match 'general orders') { $jcType = 'General Order' }
            elseif ($pathLower -match 'republic.acts') { $jcType = 'Republic Act' }
            elseif ($pathLower -match 'acts') { $jcType = 'Act' }
            elseif ($pathLower -match 'batas.pambansa') { $jcType = 'Batas Pambansa' }
            elseif ($pathLower -match 'commonwealth') { $jcType = 'Commonwealth Act' }
            elseif ($pathLower -match 'presidential.decree') { $jcType = 'Presidential Decree' }
            elseif ($pathLower -match 'rules.of.court') { $jcType = 'Rules of Court' }
            elseif ($pathLower -match 'constitution') { $jcType = 'Constitution' }
            elseif ($pathLower -match 'treaties') { $jcType = 'Treaty' }
            elseif ($pathLower -match 'international') { $jcType = 'International Law' }
            else { $jcType = 'Legal Document' }
        }

        # ── 2. Extract the body / main content ────────────────────────────
        $body = $content

        # Remove everything before <body if present
        if ($body -match '(?si)<body[^>]*>(.*)$') {
            $body = $Matches[1]
        }
        # Remove </body> and everything after
        $body = $body -replace '(?si)</body>.*$', ''
        # Remove </html> remnants
        $body = $body -replace '(?si)</html>.*$', ''

        # ── 3. Strip LawPhil wrapper structure ────────────────────────────
        # Remove <center> wrapper
        $body = $body -replace '(?si)</?center\s*>', ''
        
        # Remove the main LawPhil layout table and its opening rows (logos, scripts, search, nav)
        # This pattern matches the outer table with LawPhil content down to the blockquote
        $body = $body -replace '(?si)<table[^>]*cellpadding\s*=\s*[''"]0[''"][^>]*cellspacing\s*=\s*[''"]0[''"][^>]*bgcolor\s*=\s*[''"]#ffffff[''"][^>]*>.*?<blockquote>', ''
        
        # Remove remaining navigation tr rows with scripts
        $body = $body -replace '(?si)<tr[^>]*>\s*<td[^>]*class\s*=\s*[''"]bar[''"][^>]*>.*?</td>\s*</tr>', ''
        
        # Remove logo/image rows
        $body = $body -replace '(?si)<tr[^>]*>\s*<td[^>]*>\s*<img[^>]*lawphil[^>]*>.*?</tr>', ''
        
        # Remove the opening <tr><td> that wraps blockquote content
        $body = $body -replace '(?si)<tr>\s*<td\s+colspan\s*=\s*[''"]2[''"]>\s*<br\s*/?>\s*<blockquote>', ''
        
        # Remove closing blockquote/td/tr
        $body = $body -replace '(?si)</blockquote>\s*</td>\s*</tr>', ''
        
        # Remove any remaining outer table close tags from LawPhil wrapper
        # Only remove if it looks like an outer wrapper (at end of content)
        $body = $body -replace '(?si)\s*</table>\s*</center>\s*$', ''
        
        # ── 4. Remove LawPhil artefacts ───────────────────────────────────
        # Remove ALL script tags and contents
        $body = $body -replace '(?si)<script[^>]*>.*?</script>', ''
        $body = $body -replace '(?si)<script[^>]*/?>', ''
        
        # Remove Google Custom Search elements
        $body = $body -replace '(?si)<gcse:[^>]*>.*?</gcse:[^>]*>', ''
        $body = $body -replace '(?si)<gcse:[^>]*/?>', ''
        
        # Remove ALL <cite> tags and their encoded watermark content
        $body = $body -replace '(?si)<cite[^>]*>.*?</cite>', ''
        
        # Remove <hr> tags
        $body = $body -replace '(?si)<hr[^>]*/?\s*>', ''
        
        # Remove LawPhil images (logos, backgrounds)
        $body = $body -replace '(?si)<img[^>]*lawphil[^>]*/?>', ''
        $body = $body -replace '(?si)<img[^>]*imgs/bckgnds[^>]*/?>', ''
        
        # Remove id="lwphl" from tables  
        $body = $body -replace '(?i)\s*id\s*=\s*[''"]lwphl[''"]', ''
        
        # Remove background attributes from any tag
        $body = $body -replace '(?i)\s*background\s*=\s*[''"][^''"]*[''"]', ''
        
        # Remove LawPhil-specific body attributes  
        $body = $body -replace '(?i)\s*topmargin\s*=\s*[''"]?\d+[''"]?', ''
        $body = $body -replace '(?i)\s*leftmargin\s*=\s*[''"]?\d+[''"]?', ''
        $body = $body -replace '(?i)\s*marginwidth\s*=\s*[''"]?\d+[''"]?', ''
        $body = $body -replace '(?i)\s*marginheight\s*=\s*[''"]?\d+[''"]?', ''
        
        # Remove old LawPhil meta tags that might be in body area
        $body = $body -replace '(?si)<meta[^>]*name\s*=\s*[''"]author[''"][^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*name\s*=\s*[''"]subject[''"][^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*name\s*=\s*[''"]description[''"][^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*name\s*=\s*[''"]keywords[''"][^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*http-equiv[^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*charset[^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*viewport[^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*copyright[^>]*/?>', ''
        $body = $body -replace '(?si)<meta[^>]*robots[^>]*/?>', ''
        
        # Remove any remaining jusconsultus meta tags (we'll re-add them in <head>)
        $body = $body -replace '(?si)<meta[^>]*jusconsultus:[^>]*/?>', ''
        
        # Remove old <head>...</head> blocks that may still be present  
        $body = $body -replace '(?si)<head[^>]*>.*?</head>', ''
        $body = $body -replace '(?si)</?head[^>]*>', ''
        
        # Remove old <style> blocks
        $body = $body -replace '(?si)<style[^>]*>.*?</style>', ''
        
        # Remove old <title> tags
        $body = $body -replace '(?si)<title[^>]*>.*?</title>', ''
        
        # Remove COPYRIGHT NOTICE comment blocks
        $body = $body -replace '(?si)<!--\s*COPYRIGHT\s+NOTICE.*?-->', ''
        
        # Remove <!DOCTYPE>, <html>, remaining structural tags
        $body = $body -replace '(?si)<!DOCTYPE[^>]*>', ''
        $body = $body -replace '(?si)</?html[^>]*>', ''
        $body = $body -replace '(?si)</?body[^>]*>', ''
        
        # Remove duplicate <h2> that was used as in-body title (from old format like <h2>Act No. 1</h2> before body)
        # Only remove the first bare h2 if it matches the title
        $escapedTitle = [regex]::Escape($jcTitle)
        $body = $body -replace "(?si)<h2>\s*$escapedTitle\s*</h2>", ''

        # ── 5. Clean up whitespace ────────────────────────────────────────
        # Collapse excessive blank lines (more than 2) to just 1
        $body = $body -replace '(\r?\n\s*){4,}', "`n`n"
        # Trim leading/trailing whitespace
        $body = $body.Trim()
        
        # If body is empty after cleaning, skip
        if (-not $body -or $body.Length -lt 10) { return "SKIP_NOCONTENT" }

        # ── 6. Rebuild the file ───────────────────────────────────────────
        $titleEscaped = [System.Web.HttpUtility]::HtmlEncode($jcTitle)
        $typeEscaped = [System.Web.HttpUtility]::HtmlEncode($jcType)

        $newHtml = @"
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name='robots' content='noindex,nofollow' />
  <meta name="jusconsultus:title" content="$titleEscaped" />
  <meta name="jusconsultus:type" content="$typeEscaped" />
  <meta name="jusconsultus:category" content="Legal Document" />
  <meta name="jusconsultus:source" content="Philippine Legal Database" />
  <meta name="jusconsultus:indexed" content="$jcIndexed" />
  <title>$titleEscaped</title>
  <style>
    body {
      margin: 5px 50px 40px 50px;
      color: #000000;
      font-family: times new roman;
      font-size: 110%;
      line-height: 20px;
    }
  </style>
</head>
<body>

$body

</body>
</html>
"@

        if ($DryRun) {
            return "DRYRUN"
        }

        [System.IO.File]::WriteAllText($FilePath, $newHtml, [System.Text.Encoding]::UTF8)
        return "OK"
    }
    catch {
        return "ERROR: $($_.Exception.Message)"
    }
}

# ── Load System.Web for HtmlEncode ──────────────────────────────────────────
Add-Type -AssemblyName System.Web

# ── Gather all HTML/HTM files ───────────────────────────────────────────────
Write-Host "Scanning for HTML/HTM files in: $RootDir" -ForegroundColor Cyan
$allFiles = Get-ChildItem -Path $RootDir -Recurse -Include "*.html","*.htm" -File
$totalFiles = $allFiles.Count
Write-Host "Found $totalFiles files to process." -ForegroundColor Green

if ($totalFiles -eq 0) {
    Write-Host "No files found. Exiting." -ForegroundColor Yellow
    exit 0
}

if ($DryRun) {
    Write-Host "*** DRY RUN MODE - no files will be modified ***" -ForegroundColor Yellow
}

# ── Process in batches using runspace pool for parallelism ──────────────────
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$processed = 0
$okCount = 0
$skipCount = 0
$errorCount = 0
$errorFiles = [System.Collections.Generic.List[string]]::new()

$runspacePool = [runspacefactory]::CreateRunspacePool(1, $MaxThreads)
$runspacePool.Open()

$batches = [System.Collections.Generic.List[object[]]]::new()
for ($i = 0; $i -lt $totalFiles; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize, $totalFiles)
    $batch = $allFiles[$i..($end - 1)]
    $batches.Add($batch)
}

Write-Host "Processing $totalFiles files in $($batches.Count) batches (batch=$BatchSize, threads=$MaxThreads)..." -ForegroundColor Cyan

foreach ($batchIndex in 0..($batches.Count - 1)) {
    $batch = $batches[$batchIndex]
    $jobs = [System.Collections.Generic.List[object]]::new()

    foreach ($file in $batch) {
        $ps = [powershell]::Create().AddScript($CleanFileScript).AddArgument($file.FullName).AddArgument($DryRun.IsPresent)
        $ps.RunspacePool = $runspacePool
        $handle = $ps.BeginInvoke()
        $jobs.Add(@{ PowerShell = $ps; Handle = $handle; File = $file.FullName })
    }

    foreach ($job in $jobs) {
        $result = $job.PowerShell.EndInvoke($job.Handle)
        $status = if ($result -and $result.Count -gt 0) { $result[0] } else { "UNKNOWN" }

        if ($status -eq "OK" -or $status -eq "DRYRUN") { $okCount++ }
        elseif ($status -like "SKIP*") { $skipCount++ }
        else {
            $errorCount++
            $errorFiles.Add("$($job.File): $status")
        }
        $job.PowerShell.Dispose()
        $processed++
    }

    $pct = [Math]::Round(($processed / $totalFiles) * 100, 1)
    $elapsed = $stopwatch.Elapsed.ToString("hh\:mm\:ss")
    Write-Host "`r  Batch $($batchIndex + 1)/$($batches.Count) done | $processed/$totalFiles ($pct%) | OK=$okCount Skip=$skipCount Err=$errorCount | $elapsed" -NoNewline -ForegroundColor Gray
}

$runspacePool.Close()
$runspacePool.Dispose()
$stopwatch.Stop()

Write-Host ""
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "  Total files:   $totalFiles" 
Write-Host "  Cleaned (OK):  $okCount" -ForegroundColor Green
Write-Host "  Skipped:       $skipCount" -ForegroundColor Yellow
Write-Host "  Errors:        $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { 'Red' } else { 'Green' })
Write-Host "  Elapsed:       $($stopwatch.Elapsed.ToString('hh\:mm\:ss'))"
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan

if ($errorFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Error files (first 20):" -ForegroundColor Red
    $errorFiles | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    if ($errorFiles.Count -gt 20) { Write-Host "  ... and $($errorFiles.Count - 20) more" -ForegroundColor Red }
}
