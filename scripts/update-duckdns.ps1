# DuckDNS IP Updater - runs periodically to update dynamic IP
$token = "a4c01642-7fe4-4172-92f7-1c7f4da3733e"
$domain = "jusconsultusai"
$logFile = "d:\JusConsultus.AI\logs\duckdns.log"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
try {
    $url = "https://www.duckdns.org/update?domains=$domain&token=$token&verbose=true"
    $result = Invoke-RestMethod $url -TimeoutSec 30
    Add-Content -Path $logFile -Value "$timestamp - $result"
} catch {
    Add-Content -Path $logFile -Value "$timestamp - ERROR: $_"
}
