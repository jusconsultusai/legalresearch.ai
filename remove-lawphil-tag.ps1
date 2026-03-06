# Remove Lawphil attribution tags from all HTML files
# Removes: <a class=id>The Lawphil Project - Arellano Law Foundation</a>
# Also removes common variations with quotes: <a class="id">...</a>

$basePath = "d:\JusConsultus.AI\data\legal-database"
$files = Get-ChildItem -Path $basePath -Recurse -Include *.html,*.htm -File
$totalFiles = $files.Count
$modified = 0
$errors = 0
$current = 0

# Patterns to remove (covers variations)
$patterns = @(
    '<a class=id>The Lawphil Project - Arellano Law Foundation</a>',
    '<a class="id">The Lawphil Project - Arellano Law Foundation</a>',
    "<a class='id'>The Lawphil Project - Arellano Law Foundation</a>"
)

Write-Host "Processing $totalFiles files..." -ForegroundColor Cyan

foreach ($file in $files) {
    $current++
    if ($current % 5000 -eq 0) {
        Write-Host "  Progress: $current / $totalFiles (Modified: $modified, Errors: $errors)" -ForegroundColor Yellow
    }
    
    try {
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $originalContent = $content
        
        foreach ($pattern in $patterns) {
            if ($content.Contains($pattern)) {
                # Remove the tag and any surrounding blank lines left behind
                $content = $content.Replace($pattern, '')
            }
        }
        
        # Also handle regex variations (different whitespace, newlines around the tag)
        if ($content -match '<a\s+class\s*=\s*"?id"?\s*>\s*The Lawphil Project\s*-\s*Arellano Law Foundation\s*</a>') {
            $content = $content -replace '<a\s+class\s*=\s*"?id"?\s*>\s*The Lawphil Project\s*-\s*Arellano Law Foundation\s*</a>', ''
        }
        
        # Clean up resulting empty lines (3+ consecutive newlines -> 2)
        $content = $content -replace '(\r?\n){3,}', "`n`n"
        
        if ($content -ne $originalContent) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            $modified++
        }
    }
    catch {
        $errors++
        Write-Host "  ERROR: $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== COMPLETE ===" -ForegroundColor Green
Write-Host "Total files scanned: $totalFiles"
Write-Host "Files modified: $modified"
Write-Host "Errors: $errors"
