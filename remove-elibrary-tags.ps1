# Script to remove E-Library meta tags and titles from HTML files

$fileCount = 0
$modifiedCount = 0

# Get all HTML files in the legal-database directory
$htmlFiles = Get-ChildItem -Path "d:\JusConsultus.AI\data\legal-database" -Filter "*.html" -Recurse

foreach ($file in $htmlFiles) {
    $fileCount++
    
    # Read as lines for line-by-line processing
    $lines = Get-Content -Path $file.FullName
    $newLines = @()
    $modified = $false
    
    foreach ($line in $lines) {
        $skip = $false
        
        # Trim the line for easier matching
        $trimmedLine = $line.Trim()
        
        # Skip Content-Type meta tag lines
        if ($trimmedLine -match '^<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"\s*/>') {
            $modified = $true
            $skip = $true
        }
        # Skip E-Library title lines
        elseif ($trimmedLine -eq '<title>E-Library - Information At Your Fingertips: Printer Friendly</title>') {
            $modified = $true
            $skip = $true
        }
        # Skip orphaned standalone <head> lines
        elseif ($trimmedLine -eq '<head>') {
            $modified = $true
            $skip = $true
        }
        # Skip orphaned </head> lines
        elseif ($trimmedLine -eq '</head>') {
            $modified = $true
            $skip = $true
        }
        
        if (-not $skip) {
            $newLines += $line
        }
    }
    
    # Save if modified
    if ($modified) {
        $newContent = $newLines -join "`r`n"
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
        $modifiedCount++
        Write-Host "Modified: $($file.FullName)"
    }
}

Write-Host "`nProcessed $fileCount files"
Write-Host "Modified $modifiedCount files"
