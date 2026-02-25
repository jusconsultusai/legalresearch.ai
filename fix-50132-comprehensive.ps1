# Comprehensive fix for all deprecated HTML presentation attributes in 50132.html
$filePath = "d:\JusConsultus.AI\data\legal-database\References\Benchbooks\50132.html"

$content = Get-Content $filePath -Raw -Encoding UTF8

# ===== 1. Convert <CENTER> and <center> tags to <div class="tc"> =====
$content = $content -replace '<CENTER>', '<div class="tc">'
$content = $content -replace '</CENTER>', '</div>'
$content = $content -replace '<center>', '<div class="tc">'
$content = $content -replace '</center>', '</div>'

# ===== 2. Convert div align attributes to CSS classes =====
# align="LEFT" is default, just remove it
$content = $content -replace '<div\s+align="LEFT"\s*>', '<div>'
# align="JUSTIFY" -> class="j"
$content = $content -replace '<div\s+align="JUSTIFY"\s*>', '<div class="j">'
# align="CENTER" -> class="tc"
$content = $content -replace '<div\s+align="CENTER"\s*>', '<div class="tc">'

# ===== 3. Remove valign="TOP" from all elements =====
$content = $content -replace '\s+valign="TOP"', ''

# ===== 4. Clean table attributes =====
# Remove Â ="" junk attribute
$content = $content -replace '\s+Â\s*=""', ''
# Remove border="0"
$content = $content -replace '\s+border="0"', ''
# Convert border="1" -> class="bordered"
$content = $content -replace '<table\s+border="1"', '<table class="bordered"'
# Convert border="2" -> class="bordered-thick"
$content = $content -replace '<table\s+border="2"', '<table class="bordered-thick"'
# Remove cellpadding="0" and cellspacing="0"
$content = $content -replace '\s+cellpadding="0"', ''
$content = $content -replace '\s+cellspacing="0"', ''

# ===== 5. Remove width="100%" from tables =====
$content = $content -replace '(<table[^>]*)\s+width="100%"', '$1'

# ===== 6. Convert width attributes on td elements to CSS classes =====
# Find all unique width values on td elements
$widthValues = @('5%','6%','7%','9%','11%','13%','20%','21%','26%','38%','48%','60%','74%','75%','85%','88%','89%','95%','100%')
foreach ($w in $widthValues) {
    $num = $w -replace '%',''
    # Pattern: <td ... width="X%" ...> - need to move width to class
    # Simple case: just remove width attribute from td (CSS will handle via class if needed)
    $content = $content -replace "(<td[^>]*)\s+width=`"$w`"", "`$1"
}

# ===== 7. Fix hr attributes =====
# Remove noshade, size, align, width from hr elements
$content = $content -replace '\s+noshade="noshade"', ''
$content = $content -replace '\s+noshade', ''
$content = $content -replace '\s+size="1"', ''
$content = $content -replace '(<hr[^>]*)\s+align="LEFT"', '$1'
$content = $content -replace '(<hr[^>]*)\s+width="60%"', '$1 class="hr-short"'

# ===== 8. Clean up any remaining width attributes on other elements =====
# Remove width from td (any remaining percentages)
$content = $content -replace '(<td[^>]*)\s+width="\d+%"', '$1'

# ===== 9. Remove colspan/rowspan keep, but strip empty attribute artifacts =====
# Clean up any double spaces from attribute removal
$content = $content -replace '(<\w+)\s{2,}', '$1 '

# ===== 10. Update CSS block with comprehensive styles =====
$newCSS = @"
<style>
body {
    margin: 5px 50px 40px 50px;
    color: #000000;
    font-family: 'Times New Roman', Times, serif;
    font-size: 110%;
    line-height: 20px;
}
h2.case-header {
    background-color: #cccccc;
    padding-top: 10px;
    padding-bottom: 10px;
}
table {
    width: 100%;
    border-collapse: collapse;
}
table.bordered {
    border: 1px solid #000;
}
table.bordered td {
    border: 1px solid #000;
}
table.bordered-thick {
    border: 2px solid #000;
}
table.bordered-thick td {
    border: 2px solid #000;
}
td, th {
    vertical-align: top;
    padding: 2px 4px;
}
.tc {
    text-align: center;
}
.tl {
    text-align: left;
}
.j {
    text-align: justify;
}
.indent {
    margin-left: 40px;
}
td.tc {
    text-align: center;
}
sup.footnote-ref {
    color: rgb(255, 0, 0);
}
hr {
    border: none;
    border-top: 1px solid #000;
}
hr.hr-short {
    width: 60%;
    margin-left: 0;
}
</style>
"@

$content = $content -replace '(?s)<style>.*?</style>', $newCSS

# Write back
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "Done! Comprehensive fix applied to 50132.html"

# Count remaining problematic attributes
$inlineStyles = ([regex]::Matches($content, 'style\s*=\s*[''"]')).Count
$alignAttrs = ([regex]::Matches($content, '\balign\s*=\s*[''"]')).Count
$valignAttrs = ([regex]::Matches($content, '\bvalign\s*=\s*[''"]')).Count
$widthAttrs = ([regex]::Matches($content, '\bwidth\s*=\s*[''"]')).Count
$borderAttrs = ([regex]::Matches($content, '\bborder\s*=\s*[''"]')).Count
$cellpaddingAttrs = ([regex]::Matches($content, '\bcellpadding\s*=\s*[''"]')).Count
$cellspacingAttrs = ([regex]::Matches($content, '\bcellspacing\s*=\s*[''"]')).Count
$centerTags = ([regex]::Matches($content, '</?[Cc][Ee][Nn][Tt][Ee][Rr]>')).Count
$noshadeAttrs = ([regex]::Matches($content, '\bnoshade')).Count

Write-Host "Remaining: inline=$inlineStyles, align=$alignAttrs, valign=$valignAttrs, width=$widthAttrs, border=$borderAttrs, cellpadding=$cellpaddingAttrs, cellspacing=$cellspacingAttrs, center=$centerTags, noshade=$noshadeAttrs"
