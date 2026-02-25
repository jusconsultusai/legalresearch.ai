# Script to remove E-Library meta tags and titles from HTML files

$fileCount = 0
$modifiedCount = 0

# Get all HTML files in the legal-database directory
Write-Host "Finding HTML files..."
$htmlFiles = Get-ChildItem -Path "d:\JusConsultus.AI\data\legal-database" -Filter "*.html" -Recurse -File

Write-Host "Processing $($htmlFiles.Count) files..."

foreach ($file in $htmlFiles) {
    $fileCount++
    
    try {
        # Read content
        $content = [System.IO.File]::ReadAllText($file.FullName)
        $originalContent = $content
        
        # Remove patterns
        # Pattern 1: Meta Content-Type line (with optional tabs/spaces)
        $content = $content -replace '[\t ]*<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"\s*/>\s*[\r\n]+', ''
        
        # Pattern 2: E-Library title line (with optional tabs/spaces)
        $content = $content -replace '[\t ]*<title>E-Library - Information At Your Fingertips: Printer Friendly</title>\s*[\r\n]+', ''
        
        # Pattern 3: Standalone <head> tag
        $content = $content -replace '[\t ]*<head>\s*[\r\n]+', ''
        
        # Pattern 4: Standalone </head> tag  
        $content = $content -replace '[\t ]*</head>\s*[\r\n]+', ''
        
        # Save if changed
        if ($content -ne $originalContent) {
            [System.IO.File]::WriteAllText($file.FullName, $content)
            $modifiedCount++
            if ($modifiedCount % 100 -eq 0) {
                Write-Host "Modified $modifiedCount files so far..."
            }
        }
    }
    catch {
        Write-Host "Error processing $($file.FullName): $_" -ForegroundColor Red
    }
}

Write-Host "`nProcessed $fileCount files"
Write-Host "Modified $modifiedCount files"
