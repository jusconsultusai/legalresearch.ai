# Script to add JusConsultus AI metadata tags to all HTML files

$fileCount = 0
$modifiedCount = 0
$skippedCount = 0
$errorCount = 0
$errorLog = @()

# Title patterns to search for (more comprehensive)
$patterns = @(
    @{ Regex = 'G\.R\.\s+Nos?\.?\s+\d+(?:-\d+)?(?:\s*(?:&|and)\s*\d+(?:-\d+)?)*'; Name = 'Supreme Court Decision' },
    @{ Regex = 'A\.M\.\s+Nos?\.?\s+[\d\-A-Z]+'; Name = 'Administrative Matter' },
    @{ Regex = 'A\.C\.\s+Nos?\.?\s+\d+'; Name = 'Administrative Case' },
    @{ Regex = 'PROCLAMATION\s+NOS?\.?\s+\d+(?:\s+SERIES\s+OF\s+\d{4})?'; Name = 'Proclamation' },
    @{ Regex = 'Proclamation\s+Nos?\.?\s+\d+(?:\s+s\.\s+\d{4})?'; Name = 'Proclamation' },
    @{ Regex = 'ADMINISTRATIVE\s+ORDER\s+NOS?\.?\s+\d+(?:\s+SERIES\s+OF\s+\d{4})?'; Name = 'Administrative Order' },
    @{ Regex = 'Administrative\s+Order\s+Nos?\.?\s+\d+(?:\s+s\.\s+\d{4})?'; Name = 'Administrative Order' },
    @{ Regex = 'EXECUTIVE\s+ORDER\s+NOS?\.?\s+\d+(?:\s+SERIES\s+OF\s+\d{4})?'; Name = 'Executive Order' },
    @{ Regex = 'Executive\s+Order\s+Nos?\.?\s+\d+(?:\s+s\.\s+\d{4})?'; Name = 'Executive Order' },
    @{ Regex = 'GENERAL\s+ORDER\s+NOS?\.?\s+\d+'; Name = 'General Order' },
    @{ Regex = 'General\s+Order\s+Nos?\.?\s+\d+'; Name = 'General Order' },
    @{ Regex = 'JOINT\s+MEMORANDUM\s+CIRCULAR\s+NOS?\.?\s+\d+'; Name = 'Joint Memorandum Circular' },
    @{ Regex = 'Joint\s+Memorandum\s+Circular\s+Nos?\.?\s+\d+'; Name = 'Joint Memorandum Circular' },
    @{ Regex = 'MEMORANDUM\s+CIRCULAR\s+NOS?\.?\s+\d+(?:\s+SERIES\s+OF\s+\d{4})?'; Name = 'Memorandum Circular' },
    @{ Regex = 'Memorandum\s+Circular\s+Nos?\.?\s+\d+(?:\s+s\.\s+\d{4})?'; Name = 'Memorandum Circular' },
    @{ Regex = 'MEMORANDUM\s+ORDER\s+NOS?\.?\s+\d+(?:\s+SERIES\s+OF\s+\d{4})?'; Name = 'Memorandum Order' },
    @{ Regex = 'Memorandum\s+Order\s+Nos?\.?\s+\d+(?:\s+s\.\s+\d{4})?'; Name = 'Memorandum Order' },
    @{ Regex = 'DEPARTMENT\s+ORDER\s+NOS?\.?\s+\d+(?:\s+SERIES\s+OF\s+\d{4})?'; Name = 'Department Order' },
    @{ Regex = 'Department\s+Order\s+Nos?\.?\s+\d+(?:\s+s\.\s+\d{4})?'; Name = 'Department Order' },
    @{ Regex = 'INVESTMENT\s+PRIORITIES\s+PLAN\s+(?:FOR\s+)?\d{4}(?:-\d{4})?'; Name = 'Investment Priorities Plan' },
    @{ Regex = 'REPUBLIC\s+ACT\s+NOS?\.?\s+\d+'; Name = 'Republic Act' },
    @{ Regex = 'Republic\s+Act\s+Nos?\.?\s+\d+'; Name = 'Republic Act' },
    @{ Regex = 'R\.A\.\s+Nos?\.?\s+\d+'; Name = 'Republic Act' },
    @{ Regex = 'PRESIDENTIAL\s+DECREE\s+NOS?\.?\s+\d+'; Name = 'Presidential Decree' },
    @{ Regex = 'Presidential\s+Decree\s+Nos?\.?\s+\d+'; Name = 'Presidential Decree' },
    @{ Regex = 'P\.D\.\s+Nos?\.?\s+\d+'; Name = 'Presidential Decree' },
    @{ Regex = 'COMMONWEALTH\s+ACT\s+NOS?\.?\s+\d+'; Name = 'Commonwealth Act' },
    @{ Regex = 'Commonwealth\s+Act\s+Nos?\.?\s+\d+'; Name = 'Commonwealth Act' },
    @{ Regex = 'BATAS\s+PAMBANSA\s+BLG\.?\s+\d+'; Name = 'Batas Pambansa' },
    @{ Regex = 'Batas\s+Pambansa\s+Blg\.?\s+\d+'; Name = 'Batas Pambansa' },
    @{ Regex = 'B\.P\.\s+BLG\.?\s+\d+'; Name = 'Batas Pambansa' },
    @{ Regex = 'ACT\s+NOS?\.?\s+\d+'; Name = 'Act' },
    @{ Regex = 'Act\s+Nos?\.?\s+\d+'; Name = 'Act' },
    @{ Regex = 'ANNEX\s+[A-Z\d]+(?:-[A-Z])?'; Name = 'Annex' }
)

# Get all HTML files in the legal-database directory
Write-Host "Finding HTML files..."
$htmlFiles = Get-ChildItem -Path "d:\JusConsultus.AI\data\legal-database" -Filter "*.html" -Recurse -File

Write-Host "Processing $($htmlFiles.Count) files...`n"

foreach ($file in $htmlFiles) {
    $fileCount++
    
    if ($fileCount % 1000 -eq 0) {
        Write-Host "Processing file $fileCount... (Modified: $modifiedCount, Skipped: $skippedCount, Errors: $errorCount)"
    }
    
    try {
        # Read content with error handling for encoding
        $content = $null
        try {
            $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
        }
        catch {
            # Try with default encoding
            $content = [System.IO.File]::ReadAllText($file.FullName)
        }
        
        if ([string]::IsNullOrEmpty($content)) {
            $skippedCount++
            continue
        }
        
        # Skip if already has JusConsultus metadata
        if ($content -match '<meta\s+name="jusconsultus:') {
            $skippedCount++
            continue
        }
        
        # Find the title from content
        $documentTitle = ""
        $documentType = ""
        
        # First try to match patterns in the content
        foreach ($pattern in $patterns) {
            if ($content -match $pattern.Regex) {
                $documentTitle = $matches[0]
                $documentType = $pattern.Name
                break
            }
        }
        
        # Skip if no title found
        if ([string]::IsNullOrEmpty($documentTitle)) {
            $skippedCount++
            continue
        }
        
        # Clean up the title
        $documentTitle = $documentTitle -replace '\s+', ' '
        $documentTitle = $documentTitle.Trim()
        $documentTitle = [System.Security.SecurityElement]::Escape($documentTitle)
        
        # Get relative path from legal-database folder
        $relativePath = $file.FullName.Replace("d:\JusConsultus.AI\data\legal-database\", "").Replace("\", "/")
        
        # Determine category from path
        $category = "Legal Document"
        if ($relativePath -match '^Supreme Court/') { $category = "Supreme Court" }
        elseif ($relativePath -match '^Laws/Republic Acts/') { $category = "Republic Acts" }
        elseif ($relativePath -match '^Laws/Presidential Decree/') { $category = "Presidential Decrees" }
        elseif ($relativePath -match '^Laws/Commonwealth Acts/') { $category = "Commonwealth Acts" }
        elseif ($relativePath -match '^Laws/Batas Pambansa/') { $category = "Batas Pambansa" }
        elseif ($relativePath -match '^Laws/Acts/') { $category = "Acts" }
        elseif ($relativePath -match '^Laws/Rules of Court/') { $category = "Rules of Court" }
        elseif ($relativePath -match '^Laws/') { $category = "Laws" }
        elseif ($relativePath -match '^Treaties/Bilateral/') { $category = "Bilateral Treaties" }
        elseif ($relativePath -match '^Treaties/Regional/') { $category = "Regional Treaties" }
        elseif ($relativePath -match '^Treaties/') { $category = "Treaties" }
        elseif ($relativePath -match '^Executive Issuances/Administrative Orders/') { $category = "Administrative Orders" }
        elseif ($relativePath -match '^Executive Issuances/Executive Orders/') { $category = "Executive Orders" }
        elseif ($relativePath -match '^Executive Issuances/Proclamations/') { $category = "Proclamations" }
        elseif ($relativePath -match '^Executive Issuances/') { $category = "Executive Issuances" }
        elseif ($relativePath -match '^References/') { $category = "References" }
        
        # Get current date
        $currentDate = Get-Date -Format "yyyy-MM-dd"
        
        # Create metadata tags
        $metadata = "    <meta name=`"jusconsultus:title`" content=`"$documentTitle`" />`r`n"
        $metadata += "    <meta name=`"jusconsultus:type`" content=`"$documentType`" />`r`n"
        $metadata += "    <meta name=`"jusconsultus:category`" content=`"$category`" />`r`n"
        $metadata += "    <meta name=`"jusconsultus:source`" content=`"Philippine Legal Database`" />`r`n"
        $metadata += "    <meta name=`"jusconsultus:indexed`" content=`"$currentDate`" />"
        
        # Find where to insert metadata
        $modified = $false
        if ($content -match '<head[^>]*>') {
            # Insert after <head>
            $content = $content -replace '(<head[^>]*>)', "`$1`r`n$metadata"
            $modified = $true
        }
        elseif ($content -match '<html[^>]*>') {
            # Insert after <html> with new <head>
            $content = $content -replace '(<html[^>]*>)', "`$1`r`n<head>`r`n$metadata`r`n</head>"
            $modified = $true
        }
        elseif ($content -match '<body[^>]*>') {
            # Insert before <body>
            $content = "<head>`r`n$metadata`r`n</head>`r`n" + $content
            $modified = $true
        }
        else {
            # Insert at the very beginning
            $content = "<head>`r`n$metadata`r`n</head>`r`n" + $content
            $modified = $true
        }
        
        if ($modified) {
            # Save the file
            try {
                [System.IO.File]::WriteAllText($file.FullName, $content, [System.Text.Encoding]::UTF8)
                $modifiedCount++
                
                if ($modifiedCount % 500 -eq 0) {
                    Write-Host "  -> Modified $modifiedCount files..."
                }
            }
            catch {
                $errorCount++
                $errorLog += "Error saving $($file.FullName): $_"
            }
        }
        
    }
    catch {
        $errorCount++
        $errorLog += "Error processing $($file.FullName): $_"
        
        if ($errorCount % 100 -eq 0) {
            Write-Host "Errors: $errorCount" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== Summary ==="
Write-Host "Total files processed: $fileCount"
Write-Host "Files modified: $modifiedCount"
Write-Host "Files skipped: $skippedCount"
Write-Host "Errors encountered: $errorCount"

if ($errorLog.Count -gt 0 -and $errorLog.Count -le 20) {
    Write-Host "`nError Log:"
    $errorLog | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}
elseif ($errorLog.Count -gt 20) {
    Write-Host "`nShowing first 20 errors:"
    $errorLog | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}
