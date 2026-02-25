# Verify Copyright Updates
# Checks sample files for JusConsultus AI copyright

$testFiles = @(
    "data\legal-database\Executive Issuances\Executive Orders\eo_1_1901.html",
    "data\legal-database\Executive Issuances\Administrative Orders\ao_1_1946.html",
    "data\legal-database\Laws\Republic Acts\spp_10-009_2010.html",
    "data\legal-database\International Laws\construc.html",
    "data\legal-database\Executive Issuances\Memorandum Orders\mo_221_1971.html"
)

Write-Host "Verifying Copyright Updates...`n" -ForegroundColor Cyan

$allCorrect = $true

foreach ($filePath in $testFiles) {
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw
        $fileName = Split-Path $filePath -Leaf
        
        $hasCopyright = $content.Contains('JusConsultus AI')
        $hasMeta = $content -match '<meta name="copyright"[^>]*JusConsultus AI'
        $hasComment = $content.Contains('This legal database is maintained by JusConsultus AI')
        
        if ($hasCopyright -and $hasMeta -and $hasComment) {
            Write-Host "✓ $fileName" -ForegroundColor Green
            Write-Host "  - Copyright meta: Yes" -ForegroundColor Green
            Write-Host "  - Copyright comment: Yes" -ForegroundColor Green
        }
        else {
            Write-Host "✗ $fileName" -ForegroundColor Red
            Write-Host "  - Copyright meta: $(if ($hasMeta) {'Yes'} else {'No'})" -ForegroundColor $(if ($hasMeta) {'Green'} else {'Red'})
            Write-Host "  - Copyright comment: $(if ($hasComment) {'Yes'} else {'No'})" -ForegroundColor $(if ($hasComment) {'Green'} else {'Red'})
            $allCorrect = $false
        }
        Write-Host ""
    }
}

if ($allCorrect) {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "✓ ALL TEST FILES PASSED" -ForegroundColor Green
    Write-Host "Copyright successfully updated to JusConsultus AI" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Yellow
}
else {
    Write-Host "⚠ Some files need review" -ForegroundColor Yellow
}
