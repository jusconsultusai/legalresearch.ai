$checks = @(
  @{n="AO"; p="d:\JusConsultus.AI\data\legal-database\Executive Issuances\Administrative Orders\ao_1_1936.html"},
  @{n="EO"; p="d:\JusConsultus.AI\data\legal-database\Executive Issuances\Executive Orders\eo_1_1901.html"},
  @{n="Proc"; p="d:\JusConsultus.AI\data\legal-database\Executive Issuances\Presidential Proclamations\proc_1_1909.html"},
  @{n="PD"; p="d:\JusConsultus.AI\data\legal-database\Laws\Presidential Decree\pd_1_1972.html"},
  @{n="BP"; p="d:\JusConsultus.AI\data\legal-database\Laws\Batas Pambansa\bp_1_1978.html"},
  @{n="RA-omni"; p="d:\JusConsultus.AI\data\legal-database\Laws\Republic Acts\omnibus_labor_1989.html"},
  @{n="SC-GR"; p="d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\2001\G.R. No. 145401.html"},
  @{n="SC-AC"; p="d:\JusConsultus.AI\data\legal-database\Supreme Court\Decisions & Signed Resolutions\2001\A.C. No. 3066.html"},
  @{n="SC-Idx"; p="d:\JusConsultus.AI\data\legal-database\Supreme Court\SC Case Index\April_2021.html"}
)
foreach ($c in $checks) {
  if (Test-Path $c.p) {
    $f = Get-Content $c.p -Raw
    $m = [regex]::Match($f, 'jusconsultus:title" content="([^"]+)"')
    $t = [regex]::Match($f, 'jusconsultus:type" content="([^"]+)"')
    $titleVal = if ($m.Groups[1].Value.Length -gt 120) { $m.Groups[1].Value.Substring(0,120)+"..." } else { $m.Groups[1].Value }
    Write-Host "$($c.n): TYPE=$($t.Groups[1].Value) | TITLE=$titleVal"
  } else {
    Write-Host "$($c.n): FILE NOT FOUND"
  }
}
