$base = "d:\JusConsultus.AI\data\legal-database"
$dirs = @(
    "Laws\Presidential Decree",
    "Laws\Batas Pambansa", 
    "Laws\Republic Acts",
    "Supreme Court\Decisions & Signed Resolutions",
    "Executive Issuances\Presidential Proclamations",
    "Executive Issuances\Administrative Orders",
    "Executive Issuances\Executive Orders"
)
foreach ($d in $dirs) {
    $full = "$base\$d"
    $total = 0; $bad = 0; $examples = @()
    Get-ChildItem $full -Filter *.html -Recurse | Select-Object -First 200 | ForEach-Object {
        $total++
        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        $head = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min(700, $bytes.Length))
        $m = [regex]::Match($head, 'jusconsultus:title" content="([^"]+)"')
        if ($m.Success) {
            $t = $m.Groups[1].Value
            $isBad = $false
            # filename-as-title
            if ($t -match '^[a-z_]+\d') { $isBad = $true }
            # very short / no year
            if ($t.Length -lt 15) { $isBad = $true }
            # wrong type (PD with Proclamation, BP with Proclamation)
            if ($d -eq "Laws\Presidential Decree" -and $t -match 'Proclamation') { $isBad = $true }
            if ($d -eq "Laws\Batas Pambansa" -and $t -match 'Proclamation') { $isBad = $true }
            # SC with just case number no date
            if ($d -match 'Supreme Court' -and $t -notmatch '\d{4}' -and $t.Length -lt 30) { $isBad = $true }
            if ($isBad) {
                $bad++
                if ($examples.Count -lt 3) { $examples += "$($_.Name): $t" }
            }
        }
    }
    Write-Host "${d}: $bad bad / $total sampled"
    foreach ($ex in $examples) { Write-Host "  -> $ex" }
}
