# Test script on a single file
$testFile = "d:\JusConsultus.AI\data\legal-database\References\Benchbooks\50132.html"

Write-Host "Reading file..."
$content = Get-Content -Path $testFile -Raw -Encoding UTF8

Write-Host "Original content length: $($content.Length)"
Write-Host "Checking for patterns..."

if ($content -match 'Content-Type') {
    Write-Host "Found Content-Type"
}
if ($content -match 'E-Library') {
    Write-Host "Found E-Library"
}

Write-Host "`nApplying replacements..."

# Remove meta Content-Type
$newContent = $content -replace '\s*<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"\s*/>\s*\r?\n', ''

# Remove E-Library title  
$newContent = $newContent -replace '\s*<title>E-Library - Information At Your Fingertips: Printer Friendly</title>\s*\r?\n', ''

# Remove standalone <head> and </head>
$newContent = $newContent -replace '\s*<head>\s*\r?\n', ''
$newContent = $newContent -replace '\s*</head>\s*\r?\n', ''

Write-Host "New content length: $($newContent.Length)"

if ($content -ne $newContent) {
    Write-Host "Content changed! Saving..."
    Set-Content -Path $testFile -Value $newContent -NoNewline -Encoding UTF8
    Write-Host "Saved successfully"
} else {
    Write-Host "No changes made"
}
