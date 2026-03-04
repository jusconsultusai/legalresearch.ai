<#
.SYNOPSIS
    Removes ALL <img> tags from every HTML/HTM file in the legal-database folder.
    Runs as a fast single-pass regex replacement.
#>

param(
    [string]$RootDir = "d:\JusConsultus.AI\data\legal-database",
    [int]$MaxThreads = 8,
    [int]$BatchSize = 1000
)

$ErrorActionPreference = 'Continue'

$CleanScript = {
    param([string]$FilePath)
    try {
        $text = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
        # Remove <img ...> and <img ... /> tags (self-closing or not)
        $cleaned = $text -replace '(?si)<img[^>]*/?\s*>', ''
        # Also remove <a> wrappers that only contained an image (now empty)
        $cleaned = $cleaned -replace '(?si)<a[^>]*>\s*</a>', ''
        if ($cleaned -ne $text) {
            [System.IO.File]::WriteAllText($FilePath, $cleaned, [System.Text.Encoding]::UTF8)
            return "CHANGED"
        }
        return "NOCHANGE"
    } catch {
        return "ERROR: $($_.Exception.Message)"
    }
}

Write-Host "Scanning for HTML/HTM files in: $RootDir" -ForegroundColor Cyan
$allFiles = Get-ChildItem -Path $RootDir -Recurse -Include "*.html","*.htm" -File
$total = $allFiles.Count
Write-Host "Found $total files." -ForegroundColor Green

$sw = [System.Diagnostics.Stopwatch]::StartNew()
$pool = [runspacefactory]::CreateRunspacePool(1, $MaxThreads)
$pool.Open()

$changed = 0; $unchanged = 0; $errors = 0; $processed = 0

for ($i = 0; $i -lt $total; $i += $BatchSize) {
    $end = [Math]::Min($i + $BatchSize, $total)
    $batch = $allFiles[$i..($end - 1)]
    $jobs = [System.Collections.Generic.List[object]]::new()

    foreach ($f in $batch) {
        $ps = [powershell]::Create().AddScript($CleanScript).AddArgument($f.FullName)
        $ps.RunspacePool = $pool
        $h = $ps.BeginInvoke()
        $jobs.Add(@{ PS = $ps; H = $h })
    }

    foreach ($j in $jobs) {
        $r = $j.PS.EndInvoke($j.H)
        $s = if ($r -and $r.Count -gt 0) { $r[0] } else { "UNKNOWN" }
        if ($s -eq "CHANGED") { $changed++ }
        elseif ($s -eq "NOCHANGE") { $unchanged++ }
        else { $errors++ }
        $j.PS.Dispose()
        $processed++
    }

    $pct = [Math]::Round(($processed / $total) * 100, 1)
    Write-Host "`r  $processed/$total ($pct%) | Changed=$changed Unchanged=$unchanged Err=$errors | $($sw.Elapsed.ToString('hh\:mm\:ss'))" -NoNewline -ForegroundColor Gray
}

$pool.Close(); $pool.Dispose(); $sw.Stop()

Write-Host ""
Write-Host "Done! Changed=$changed  Unchanged=$unchanged  Errors=$errors  Time=$($sw.Elapsed.ToString('hh\:mm\:ss'))" -ForegroundColor Green
