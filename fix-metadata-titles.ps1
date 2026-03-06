# fix-metadata-titles.ps1
# Scans all HTML files in the legal database and fixes:
# 1. <title> tag - sets to proper format based on document content
# 2. jusconsultus:title meta tag - sets to match <title>
# 3. jusconsultus:type meta tag - corrects document type based on folder/content
#
# Title Format (two lines joined by newline in meta, first line for display):
#   Line 1: DOCUMENT TYPE NO. X, Date
#   Line 2: SUBJECT/DESCRIPTION IN ALL CAPS (or mixed case for some types)

$basePath = "d:\JusConsultus.AI\data\legal-database"
$totalModified = 0
$totalErrors = 0
$totalScanned = 0

# Helper: Extract plain text from HTML (strip tags)
function Strip-Html($html) {
    $text = $html -replace '<(script|style|head)[^>]*>[\s\S]*?<\/\1>', ' '
    $text = $text -replace '<br\s*/?>', "`n"
    $text = $text -replace '<[^>]+>', ' '
    $text = $text -replace '&nbsp;?', ' '
    $text = $text -replace '&#8209;', '-'
    $text = $text -replace '&amp;', '&'
    $text = $text -replace '&lt;', '<'
    $text = $text -replace '&gt;', '>'
    $text = $text -replace '&quot;', '"'
    $text = $text -replace '&apos;', "'"
    $text = $text -replace '\s+', ' '
    return $text.Trim()
}

# Helper: Extract body text from HTML content
function Get-BodyText($content) {
    $bodyStart = $content.IndexOf('<body')
    if ($bodyStart -lt 0) { $bodyStart = 0 }
    $bodyContent = $content.Substring($bodyStart, [Math]::Min(3000, $content.Length - $bodyStart))
    return Strip-Html $bodyContent
}

# Helper: Find date patterns in text
function Find-Date($text) {
    # Pattern: Month Day, Year
    $datePatterns = @(
        '(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
        '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4}'
    )
    foreach ($pattern in $datePatterns) {
        if ($text -match $pattern) {
            return $Matches[0] -replace ',(\d)', ', $1'
        }
    }
    return $null
}

# Helper: Clean up extracted subject text
function Clean-Subject($text) {
    # Remove common prefixes and noise
    $text = $text -replace '^\s*Tags:.*$', '' -replace '(?m)^\s*Tags:.*$', ''
    $text = $text.Trim()
    # Limit length
    if ($text.Length -gt 300) { $text = $text.Substring(0, 300).Trim() }
    # Remove trailing incomplete words
    if ($text.Length -eq 300) {
        $lastSpace = $text.LastIndexOf(' ')
        if ($lastSpace -gt 200) { $text = $text.Substring(0, $lastSpace) }
    }
    return $text
}

# Helper: Extract subject line from body text for bracket-formatted docs
# Pattern: [ DOC TYPE NO. X, Date ] SUBJECT TEXT
function Extract-BracketSubject($bodyText) {
    if ($bodyText -match '\]\s*(.+?)(?:\s{2,}|$)') {
        $subject = $Matches[1].Trim()
        # Get text up to the first section/paragraph break
        if ($subject -match '^(.+?)(?:WHEREAS|Section|SEC\.|Be it enacted|By authority|CHAPTER|TITLE|ARTICLE|RULE\s)') {
            $subject = $Matches[1].Trim()
        }
        return Clean-Subject $subject
    }
    return $null
}

# Helper: Extract subject from centered bold text after document header
function Extract-CenteredSubject($content) {
    # Look for center-aligned text that contains the subject/description
    $patterns = @(
        '<p[^>]*align\s*=\s*"?center"?[^>]*>\s*<b>\s*(.+?)\s*</b>\s*</p>',
        '<p[^>]*class\s*=\s*"?cb"?[^>]*>\s*(.+?)\s*</p>',
        '<p[^>]*class\s*=\s*"?c"?[^>]*>\s*<b>\s*(.+?)\s*</b>\s*</p>'
    )
    
    $bodyStart = $content.IndexOf('<body')
    if ($bodyStart -lt 0) { $bodyStart = 0 }
    $bodySection = $content.Substring($bodyStart, [Math]::Min(4000, $content.Length - $bodyStart))
    
    foreach ($pattern in $patterns) {
        $matches = [regex]::Matches($bodySection, $pattern, 'IgnoreCase,Singleline')
        foreach ($m in $matches) {
            $text = Strip-Html $m.Groups[1].Value
            # Skip header text (MALACANAN, MANILA, etc.)
            if ($text -match '(?i)^(MALACA|MANILA|REPUBLIC|BY THE PRESIDENT|M\s+a\s+n\s+i\s+l\s+a|OFFICE OF|No\.\s*\d)') { continue }
            if ($text.Length -gt 15 -and $text.Length -lt 500) {
                return Clean-Subject $text
            }
        }
    }
    return $null
}

function Update-MetaTag($content, $metaName, $newValue) {
    # Escape for HTML attribute
    $escapedValue = $newValue -replace '&', '&amp;' -replace '"', '&quot;' -replace '<', '&lt;' -replace '>', '&gt;'
    
    # Try to replace existing meta tag (name first, then content)
    $pattern1 = "(<meta\s+name=[`"']$metaName[`"']\s+content=)[`"'][^`"']*[`"']"
    $pattern2 = "(<meta\s+content=)[`"'][^`"']*[`"'](\s+name=[`"']$metaName[`"'])"
    
    if ($content -match $pattern1) {
        $content = $content -replace $pattern1, "`${1}`"$escapedValue`""
    }
    elseif ($content -match $pattern2) {
        $content = $content -replace $pattern2, "`${1}`"$escapedValue`"`${2}"
    }
    else {
        # Meta tag doesn't exist - add it after <title> or before </head> or after <head>
        $metaTag = "`n  <meta name=`"$metaName`" content=`"$escapedValue`" />"
        if ($content -match '</title>') {
            $content = $content -replace '</title>', "</title>$metaTag"
        }
        elseif ($content -match '</head>') {
            $content = $content -replace '</head>', "$metaTag`n</head>"
        }
    }
    return $content
}

function Update-TitleTag($content, $newTitle) {
    $escapedTitle = $newTitle -replace '&', '&amp;'
    if ($content -match '<title>[^<]*</title>') {
        $content = $content -replace '<title>[^<]*</title>', "<title>$escapedTitle</title>"
    }
    return $content
}

# Ensure file has basic required head elements
function Ensure-HeadElements($content) {
    # Add DOCTYPE if missing
    if ($content -notmatch '<!DOCTYPE') {
        $content = "<!DOCTYPE html>`n$content"
    }
    # Add charset if missing
    if ($content -notmatch 'charset') {
        $content = $content -replace '(<head[^>]*>)', "`$1`n  <meta charset=`"utf-8`" />"
    }
    # Add robots if missing
    if ($content -notmatch 'robots') {
        if ($content -match '</title>') {
            $content = $content -replace '</title>', "</title>`n  <meta name='robots' content='noindex,nofollow' />"
        }
    }
    return $content
}

# ============================================================
# Process each directory type
# ============================================================

function Process-Files {
    param(
        [string]$directory,
        [string]$docTypeLabel,  # e.g. "Administrative Order"
        [string]$metaType,      # e.g. "Administrative Order"
        [scriptblock]$titleExtractor  # Custom function to extract title from content
    )
    
    if (-not (Test-Path $directory)) {
        Write-Host "  SKIP (not found): $directory" -ForegroundColor Yellow
        return
    }
    
    $files = Get-ChildItem -Path $directory -Filter *.html -File -Recurse
    $dirModified = 0
    $dirErrors = 0
    
    foreach ($file in $files) {
        $script:totalScanned++
        
        try {
            $content = [System.IO.File]::ReadAllText($file.FullName)
            $originalContent = $content
            $bodyText = Get-BodyText $content
            
            # Call the custom title extractor
            $newTitle = & $titleExtractor $content $bodyText $file
            
            # Post-process: remove duplicate lines in multi-line titles
            if ($newTitle -and $newTitle.Contains("`n")) {
                $lines = $newTitle -split "`n"
                $headerLine = $lines[0].Trim()
                $subjectLine = ($lines[1..($lines.Length-1)] -join "`n").Trim()
                # Skip subject if it duplicates or is contained in header
                if ($subjectLine -and ($subjectLine -eq $headerLine -or $headerLine.Contains($subjectLine) -or $subjectLine.Contains($headerLine))) {
                    $newTitle = $headerLine
                }
            }
            
            if ($newTitle -and $newTitle.Length -gt 5) {
                # Ensure basic head elements exist (DOCTYPE, charset, robots)
                $content = Ensure-HeadElements $content
                
                # Update <title> tag
                $content = Update-TitleTag $content $newTitle
                
                # Update/add jusconsultus:title meta tag
                $content = Update-MetaTag $content 'jusconsultus:title' $newTitle
                
                # Fix/add jusconsultus:type
                if ($metaType) {
                    $content = Update-MetaTag $content 'jusconsultus:type' $metaType
                }
                
                # Add other jusconsultus meta tags if missing
                if ($content -notmatch 'jusconsultus:category') {
                    $content = Update-MetaTag $content 'jusconsultus:category' 'Legal Document'
                }
                if ($content -notmatch 'jusconsultus:source') {
                    $content = Update-MetaTag $content 'jusconsultus:source' 'Philippine Legal Database'
                }
                if ($content -notmatch 'jusconsultus:indexed') {
                    $content = Update-MetaTag $content 'jusconsultus:indexed' '2026-02-22'
                }
                
                if ($content -ne $originalContent) {
                    [System.IO.File]::WriteAllText($file.FullName, $content)
                    $dirModified++
                    $script:totalModified++
                }
            }
        }
        catch {
            $dirErrors++
            $script:totalErrors++
            Write-Host "    ERROR: $($file.Name): $_" -ForegroundColor Red
        }
    }
    
    Write-Host "  $($files.Count) files, $dirModified modified, $dirErrors errors" -ForegroundColor Gray
}

# ============================================================
# Title extractors for each document type
# ============================================================

# Generic extractor for bracket-formatted docs: [ TYPE NO. X, Date ] SUBJECT
$bracketExtractor = {
    param($content, $bodyText, $file)
    
    # Look for bracket pattern: [ Document Type No. X, Date ]
    if ($bodyText -match '\[\s*(.+?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        # Extract subject (centered bold text after the bracket)
        $subject = Extract-CenteredSubject $content
        if (-not $subject) {
            $subject = Extract-BracketSubject $bodyText
        }
        
        $title = $headerLine
        if ($subject) {
            $title = "$headerLine`n$subject"
        }
        return $title
    }
    return $null
}

# Extractor for Administrative Orders
$aoExtractor = {
    param($content, $bodyText, $file)
    
    # Try bracket pattern first: [ ADMINISTRATIVE ORDER NO. 1, January 29, 1936 ]
    if ($bodyText -match '\[\s*(ADMINISTRATIVE ORDER NO\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Try direct pattern: ADMINISTRATIVE ORDER NO. X Date
    if ($bodyText -match '(ADMINISTRATIVE ORDER\s+NO\.\s*\d+[A-Za-z]?)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Try from body text directly
    if ($bodyText -match 'ADMINISTRATIVE ORDER\s+NO\.\s*(\d+[A-Za-z]?)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "ADMINISTRATIVE ORDER NO. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Executive Orders
$eoExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(Executive Order No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '((?:EXECUTIVE\s+ORDER|Executive\s+Order)\s+No\.?\s*\d+[A-Za-z]?)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(?:EXECUTIVE\s+ORDER|Executive\s+Order)\s+No\.?\s*(\d+[A-Za-z]?)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "Executive Order No. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for General Orders
$goExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(GENERAL ORDER NO\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(GENERAL ORDER\s+No\.?\s*\d+)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match 'GENERAL ORDER\s+No\.?\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "GENERAL ORDER NO. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Memorandum Circulars
$mcExtractor = {
    param($content, $bodyText, $file)
    
    # Check for Joint MC first
    if ($bodyText -match '\[\s*(Joint Memorandum Circular No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '\[\s*(Memorandum Circular No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '((?:Joint\s+)?Memorandum\s+Circular\s+No\.?\s*\d+[A-Za-z]?)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(?:Joint\s+)?Memorandum\s+Circular\s+No\.?\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $isJoint = $bodyText -match 'Joint\s+Memorandum'
        $prefix = if ($isJoint) { "Joint Memorandum Circular No." } else { "Memorandum Circular No." }
        $headerLine = "$prefix $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Memorandum Orders
$moExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(MEMORANDUM ORDER NO\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(MEMORANDUM ORDER\s+NO\.?\s*\d+[A-Za-z]?)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match 'MEMORANDUM ORDER\s+NO\.?\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "MEMORANDUM ORDER NO. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Also handle Investment Priorities Plan, etc. (non-standard MO files)
    if ($bodyText -match '(INVESTMENT PRIORITIES PLAN\s+\d{4})') {
        return $Matches[1]
    }
    
    return $null
}

# Extractor for National Administrative Register
$narExtractor = {
    param($content, $bodyText, $file)
    
    # These have varied formats - Department Order, Circular, etc.
    # Try bracket pattern
    if ($bodyText -match '\[\s*(.+?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        if ($headerLine.Length -gt 10 -and $headerLine.Length -lt 200) {
            $subject = Extract-CenteredSubject $content
            if ($subject) { return "$headerLine`n$subject" }
            return $headerLine
        }
    }
    
    # Try to find document type and number
    $narPatterns = @(
        '(Department Order\s+No\.?\s*\d+[A-Za-z-]*)',
        '(Department Circular\s+No\.?\s*\d+[A-Za-z-]*)',
        '(Administrative Order\s+No\.?\s*\d+[A-Za-z-]*)',
        '(Circular\s+No\.?\s*\d+[A-Za-z-]*)',
        '(Resolution\s+No\.?\s*\d+[A-Za-z-]*)'
    )
    
    foreach ($pat in $narPatterns) {
        if ($bodyText -match $pat) {
            $headerLine = $Matches[1]
            $date = Find-Date $bodyText
            if ($date) { $headerLine = "$headerLine, $date" }
            $subject = Extract-CenteredSubject $content
            if ($subject) { return "$headerLine`n$subject" }
            return $headerLine
        }
    }
    
    return $null
}

# Extractor for Presidential Proclamations
$procExtractor = {
    param($content, $bodyText, $file)
    
    # Bracket format (modern files): [ Proclamation No. 1, February 3, 2001 ]
    if ($bodyText -match '(?i)\[\s*(PROCLAMATION\s+NO\.?\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Older format: A PROCLAMATION. No. X (then body text)
    if ($bodyText -match 'A PROCLAMATION\.\s*No\.\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "Proclamation No. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        # Get subject from text after "No. X"
        if ($bodyText -match "No\.\s*$num\s+(.+?)(?:Whereas|NOW|In witness|Done at|Given)") {
            $subject = $Matches[1].Trim()
            if ($subject.Length -gt 10) {
                $subject = Clean-Subject $subject
                return "$headerLine`n$subject"
            }
        }
        return $headerLine
    }
    
    # Direct pattern: Proclamation No. X
    if ($bodyText -match '(?i)(Proclamation\s+No\.?\s*\d+)') {
        $headerLine = $Matches[1]
        $date = Find-Date $bodyText
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Acts
$actExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(Act No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '((?:Act|Acts)\s+No\.?\s*\d+)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(?:Act|Acts)\s+No\.?\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "Act No. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Batas Pambansa
$bpExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(BATAS PAMBANSA\s+(?:Blg|BLG)\.?\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(BATAS PAMBANSA\s+(?:Blg|BLG)\.?\s*\d+)') {
        $bpNum = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = $bpNum
        if ($date) { $headerLine = "$headerLine, $date" }
        
        # Get the subject - prioritize "AN ACT..." pattern for BP
        $subject = $null
        if ($bodyText -match '(AN ACT[^.]{10,300})') {
            $subject = Clean-Subject $Matches[0].Trim()
        }
        if (-not $subject) {
            $subject = Extract-CenteredSubject $content
        }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Commonwealth Acts
$caExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(Commonwealth Act No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(Commonwealth Act\s+No\.?\s*\d+)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match 'Commonwealth Act\s+No\.?\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "Commonwealth Act No. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Presidential Decrees
$pdExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(PRESIDENTIAL DECREE No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(PRESIDENTIAL DECREE\s+No\.?\s*\d+[A-Za-z]?)\s+,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Pattern without comma: PRESIDENTIAL DECREE No. 1 September 24, 1972
    if ($bodyText -match '(PRESIDENTIAL DECREE\s+No\.?\s*\d+[A-Za-z]?)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]) $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match 'PRESIDENTIAL DECREE\s+No\.?\s*(\d+[A-Za-z]?)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "PRESIDENTIAL DECREE No. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Republic Acts
$raExtractor = {
    param($content, $bodyText, $file)
    
    # Special case: OMNIBUS RULES
    if ($bodyText -match '\[\s*(OMNIBUS RULES[^]]*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        # Don't use bracket subject for OMNIBUS - it duplicates the header
        if ($subject -and $subject -notmatch 'OMNIBUS') { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '\[\s*(REPUBLIC ACT\s+No\.?\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match '(REPUBLIC ACT\s+No\.?\s*\d+)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if (-not $subject -and $bodyText -match 'AN ACT[^.]{10,300}') { $subject = $Matches[0].Trim() }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    if ($bodyText -match 'REPUBLIC ACT\s+No\.?\s*(\d+)') {
        $num = $Matches[1]
        $date = Find-Date $bodyText
        $headerLine = "REPUBLIC ACT No. $num"
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if (-not $subject -and $bodyText -match 'An? Act[^.]{10,300}') { $subject = $Matches[0].Trim() }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # IRR pattern
    if ($bodyText -match '((?:REVISED\s+)?(?:IRR|Implementing Rules)[^,]{5,100}),?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1].Trim()), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Administrative Order in RA folder
    if ($bodyText -match '\[\s*(Administrative Order No\.\s*\d+.*?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Philippine Constitutions
$constitutionExtractor = {
    param($content, $bodyText, $file)
    
    $name = $file.BaseName
    
    # Try to find the constitution name from content
    if ($bodyText -match '((?:19|20)\d{2}\s+CONSTITUTION[^.]{0,100})') {
        return $Matches[1].Trim()
    }
    
    if ($bodyText -match '(PHILIPPINE ORGANIC ACT OF \d{4})') {
        $headerLine = $Matches[1]
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Use filename as base
    if ($name -match '(\d{4})') {
        $year = $Matches[1]
        return "$year CONSTITUTION OF THE REPUBLIC OF THE PHILIPPINES"
    }
    
    return $name -replace '_', ' '
}

# Extractor for Rules of Court
$rulesExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(.+?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        if ($headerLine.Length -gt 10) {
            $subject = Extract-CenteredSubject $content
            if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
            if ($subject) { return "$headerLine`n$subject" }
            return $headerLine
        }
    }
    
    # A.M. No. pattern
    if ($bodyText -match '(A\.M\.\s+No\.\s+[\d-]+(?:-SC)?)\s*,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})') {
        $headerLine = "$($Matches[1]), $($Matches[2])"
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Use filename-based title
    $name = $file.BaseName -replace '_', ' '
    return $name
}

# Extractor for Letter of Instruction / Implementation
$letterExtractor = {
    param($content, $bodyText, $file)
    
    if ($bodyText -match '\[\s*(.+?)\s*\]') {
        $headerLine = $Matches[1].Trim()
        if ($headerLine.Length -gt 10) {
            $subject = Extract-CenteredSubject $content
            if (-not $subject) { $subject = Extract-BracketSubject $bodyText }
            if ($subject) { return "$headerLine`n$subject" }
            return $headerLine
        }
    }
    
    if ($bodyText -match '(letter of (?:instruction|implementation)\s+No\.?\s*\d+)') {
        $headerLine = $Matches[1]
        $date = Find-Date $bodyText
        if ($date) { $headerLine = "$headerLine, $date" }
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    return $null
}

# Extractor for Supreme Court Decisions
$scDecisionExtractor = {
    param($content, $bodyText, $file)
    
    $name = $file.BaseName
    
    # Comprehensive pattern matching for SC case numbers
    # Handles: G.R. No., A.C. No., A.M. No., B.M. No., Adm. Case No., Administrative Case No., etc.
    $casePatterns = @(
        '((?:G\.R\.|A\.C\.|A\.M\.|B\.M\.|OCA\s+IPI|UDK|P\.E\.T\.|A\.R\.|Adm\.?\s*Case|Administrative\s+Case|Administrative\s+Matter|Bar\s+Matter|Crim(?:inal)?\.?\s+Case)\s+Nos?\.?\s*(?:L-)?[\w\d-]+(?:\s*(?:\([\w\s]+\)|\&\s*[\w\d-]+))*)\s+,?\s*((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})'
    )
    
    foreach ($pat in $casePatterns) {
        if ($bodyText -match $pat) {
            $caseNo = $Matches[1].Trim() -replace '\s+', ' '
            $caseDate = $Matches[2].Trim()
            
            # Try to find parties - text between date and DECISION/RESOLUTION
            $escapedDate = [regex]::Escape($caseDate)
            $partiesText = ""
            if ($bodyText -match "$escapedDate\s+(.+?)(?:\s+(?:DECISION|RESOLUTION|R\s+E\s+S|SEPARATE|CONCURRING|DISSENTING|PER CURIAM|VITUG|PANGANIBAN|QUISUMBING|YNARES|CARPIO|PUNO|DAVIDE|BELLOSILLO|MENDOZA|SANDOVAL|AZCUNA|CORONA|TINGA|CHICO|NAZARIO|J\s*[\.:]))") {
                $partiesText = $Matches[1].Trim() -replace '\s+', ' '
                if ($partiesText.Length -gt 250) { $partiesText = $partiesText.Substring(0, 250) }
            }
            
            $title = "$caseNo, $caseDate"
            if ($partiesText -and $partiesText.Length -gt 10) {
                $title = "$title`n$partiesText"
            }
            return $title
        }
    }
    
    # Fallback: use filename as case number + find date from body
    $date = Find-Date $bodyText
    if ($date -and $name.Length -gt 5) {
        # Extract parties after the date in body text
        $partiesText = ""
        $escapedDate = [regex]::Escape($date)
        if ($bodyText -match "$escapedDate\s+(.+?)(?:\s+(?:DECISION|RESOLUTION|R\s+E\s+S|J\s*[\.:]))") {
            $partiesText = $Matches[1].Trim() -replace '\s+', ' '
            if ($partiesText.Length -gt 250) { $partiesText = $partiesText.Substring(0, 250) }
        }
        $title = "$name, $date"
        if ($partiesText -and $partiesText.Length -gt 10) {
            $title = "$title`n$partiesText"
        }
        return $title
    }
    
    # Last resort: use filename
    return $name
}

# Extractor for SC Case Index
$scCaseIndexExtractor = {
    param($content, $bodyText, $file)
    
    $name = $file.BaseName -replace '_', ' '
    # Already has good format like "April 2021"
    return "SC Case Index - $name"
}

# Extractor for International Laws
$intlLawExtractor = {
    param($content, $bodyText, $file)
    
    # ANNEX files
    if ($bodyText -match '(ANNEX\s+\d+[A-Z]?)') {
        $headerLine = $Matches[1]
        $subject = Extract-CenteredSubject $content
        if (-not $subject -and $bodyText -match "$([regex]::Escape($headerLine))\s+(.{10,200})") {
            $subject = $Matches[1].Trim() -replace '\s+', ' '
            if ($subject.Length -gt 200) { $subject = $subject.Substring(0, 200) }
        }
        if ($subject) { return "$headerLine`n$subject" }
        return $headerLine
    }
    
    # Convention/Declaration/Resolution patterns
    if ($bodyText -match '((?:Adopted|Endorsed|Approved)[^.]{10,300})') {
        $preamble = $Matches[1].Trim()
        $subject = Extract-CenteredSubject $content
        if ($subject) { return "$preamble`n$subject" }
        return $preamble
    }
    
    # Use first significant heading
    $subject = Extract-CenteredSubject $content
    if ($subject) { return $subject }
    
    # Fallback to first ~100 chars of body
    if ($bodyText.Length -gt 20) {
        $title = $bodyText.Substring(0, [Math]::Min(150, $bodyText.Length)).Trim()
        return $title
    }
    
    return $file.BaseName -replace '_', ' '
}

# Extractor for Treaties
$treatyExtractor = {
    param($content, $bodyText, $file)
    
    $subject = Extract-CenteredSubject $content
    if (-not $subject -and $bodyText.Length -gt 20) {
        # Get first significant text
        $subject = $bodyText.Substring(0, [Math]::Min(200, $bodyText.Length)).Trim()
    }
    if ($subject) { return $subject }
    return $file.BaseName -replace '_', ' '
}

# Extractor for References
$refExtractor = {
    param($content, $bodyText, $file)
    
    $subject = Extract-CenteredSubject $content
    if ($subject) { return $subject }
    
    if ($bodyText.Length -gt 20) {
        $title = $bodyText.Substring(0, [Math]::Min(200, $bodyText.Length)).Trim()
        return $title
    }
    
    return $file.BaseName -replace '_', ' '
}

# ============================================================
# Main execution
# ============================================================

Write-Host "=== Fix Metadata Titles ===" -ForegroundColor Green
Write-Host "Base path: $basePath" -ForegroundColor Gray
Write-Host ""

# Executive Issuances
Write-Host "Processing Administrative Orders..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\Administrative Orders" "Administrative Order" "Administrative Order" $aoExtractor

Write-Host "Processing Executive Orders..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\Executive Orders" "Executive Order" "Executive Order" $eoExtractor

Write-Host "Processing General Orders..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\General Orders" "General Order" "General Order" $goExtractor

Write-Host "Processing Memorandum Circulars..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\Memorandum Circulars" "Memorandum Circular" "Memorandum Circular" $mcExtractor

Write-Host "Processing Memorandum Orders..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\Memorandum Orders" "Memorandum Order" "Memorandum Order" $moExtractor

Write-Host "Processing National Administrative Register..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\National Administrative Register" "National Administrative Register" "National Administrative Register" $narExtractor

Write-Host "Processing Presidential Proclamations..." -ForegroundColor Cyan
Process-Files "$basePath\Executive Issuances\Presidential Proclamations" "Presidential Proclamation" "Presidential Proclamation" $procExtractor

# Laws
Write-Host "Processing Acts..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Acts" "Act" "Act" $actExtractor

Write-Host "Processing Batas Pambansa..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Batas Pambansa" "Batas Pambansa" "Batas Pambansa" $bpExtractor

Write-Host "Processing Commonwealth Acts..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Commonwealth Acts" "Commonwealth Act" "Commonwealth Act" $caExtractor

Write-Host "Processing Presidential Decrees..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Presidential Decree" "Presidential Decree" "Presidential Decree" $pdExtractor

Write-Host "Processing Republic Acts..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Republic Acts" "Republic Act" "Republic Act" $raExtractor

Write-Host "Processing Philippine Constitutions..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Philippine Constitutions" "Constitution" "Constitution" $constitutionExtractor

Write-Host "Processing Rules of Court..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Rules of Court" "Rules of Court" "Rules of Court" $rulesExtractor

Write-Host "Processing Letter of Implementation..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Letter of Implementation" "Letter of Implementation" "Letter of Implementation" $letterExtractor

Write-Host "Processing Letter of Instruction..." -ForegroundColor Cyan
Process-Files "$basePath\Laws\Letter of Instruction" "Letter of Instruction" "Letter of Instruction" $letterExtractor

# Supreme Court
Write-Host "Processing SC Decisions & Signed Resolutions..." -ForegroundColor Cyan
Process-Files "$basePath\Supreme Court\Decisions & Signed Resolutions" "SC Decision" "Supreme Court Decision" $scDecisionExtractor

Write-Host "Processing SC Case Index..." -ForegroundColor Cyan
Process-Files "$basePath\Supreme Court\SC Case Index" "SC Case Index" "SC Case Index" $scCaseIndexExtractor

# International Laws
Write-Host "Processing International Laws..." -ForegroundColor Cyan
Process-Files "$basePath\International Laws" "International Law" "International Law" $intlLawExtractor

# Treaties
Write-Host "Processing Treaties..." -ForegroundColor Cyan
$treatyDirs = Get-ChildItem -Path "$basePath\Treaties" -Directory -ErrorAction SilentlyContinue
foreach ($td in $treatyDirs) {
    Write-Host "  Treaties/$($td.Name)..." -ForegroundColor Gray
    Process-Files $td.FullName "Treaty" "Treaty" $treatyExtractor
}

# References
Write-Host "Processing References..." -ForegroundColor Cyan
$refDirs = Get-ChildItem -Path "$basePath\References" -Directory -ErrorAction SilentlyContinue
foreach ($rd in $refDirs) {
    Write-Host "  References/$($rd.Name)..." -ForegroundColor Gray
    Process-Files $rd.FullName "Reference" "Reference" $refExtractor
}

Write-Host ""
Write-Host "=== COMPLETE ===" -ForegroundColor Green
Write-Host "Total files scanned: $totalScanned"
Write-Host "Total files modified: $totalModified"
Write-Host "Total errors: $totalErrors"
