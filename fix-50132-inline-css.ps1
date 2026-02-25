# Fix inline CSS styles in 50132.html by converting them to CSS classes
$filePath = "d:\JusConsultus.AI\data\legal-database\References\Benchbooks\50132.html"

$content = Get-Content $filePath -Raw -Encoding UTF8

# 1. Fix old charset meta format
$content = $content -replace '<meta\s+http-equiv="Content-Type"\s+content="text/html;\s*charset=UTF-8"\s*/?\s*>', '<meta charset="utf-8">'

# 2. Replace H2 inline background-color style with class
$content = $content -replace "<H2\s+style='background-color:#cccccc;padding-top:10px;padding-bottom:10px;'>", '<H2 class="case-header">'

# 3. Replace <span style="font-weight: bold;"> with <strong> and close tags
# We need to carefully replace only the bold spans - match opening tag and replace
$content = $content -replace '<span style="font-weight: bold;">', '<strong>'
# Now replace the closing </span> that corresponded to bold spans
# Since we've converted bold spans to <strong>, we need to fix the closing tags
# This is tricky - we'll use a regex to find <strong>...</span> patterns and replace </span> with </strong>
# But a simpler approach: count and replace. Let's do iterative replacement.
# Replace <strong>...(content without nested spans)...</span> with <strong>...</strong>
while ($content -match '<strong>([^<]*)</span>') {
    $content = $content -replace '<strong>([^<]*)</span>', '<strong>$1</strong>'
}
# Also handle cases where strong contains other inline tags like <br>
while ($content -match '<strong>((?:(?!</strong>).)*?)</span>') {
    $content = $content -replace '<strong>((?:(?!</strong>).)*?)</span>', '<strong>$1</strong>'
}

# 4. Replace <br style="font-weight: bold;"> with <br>
$content = $content -replace '<br\s+style="font-weight: bold;">', '<br>'

# 5. Replace <sup style="color: rgb(255, 0, 0);"> with <sup class="footnote-ref">
$content = $content -replace '<sup style="color: rgb\(255, 0, 0\);">', '<sup class="footnote-ref">'

# 6. Replace <span style="font-style: italic;"> with <em> and close
$content = $content -replace '<span style="font-style: italic;">', '<em>'
while ($content -match '<em>((?:(?!</em>).)*?)</span>') {
    $content = $content -replace '<em>((?:(?!</em>).)*?)</span>', '<em>$1</em>'
}

# 7. Replace <div style="margin-left: 40px;"> with <div class="indent">
$content = $content -replace '<div style="margin-left: 40px;">', '<div class="indent">'

# 8. Replace <div style="text-align: center;"> with <div class="tc">
$content = $content -replace '<div style="text-align: center;">', '<div class="tc">'

# 9. Replace <div style="text-align: left;"> with <div class="tl">
$content = $content -replace '<div style="text-align: left;">', '<div class="tl">'

# 10. Replace td style="text-align: center;" with td class="tc"
$content = $content -replace '<td\s+style="text-align: center;">', '<td class="tc">'

# 11. Update the <style> block to add new CSS classes
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
.tc {
    text-align: center;
}
.tl {
    text-align: left;
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
</style>
"@

# Replace existing style block
$content = $content -replace '(?s)<style>.*?</style>', $newCSS

# Write back
Set-Content -Path $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "Done! Fixed inline CSS in 50132.html"

# Count remaining inline styles
$remaining = ([regex]::Matches($content, 'style\s*=\s*[''"]')).Count
Write-Host "Remaining inline style attributes: $remaining"
