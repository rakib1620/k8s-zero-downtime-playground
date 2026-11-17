param (
    [string]$Url = "http://localhost:8080/api/info",
    [double]$IntervalSeconds = 0.4
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Kubernetes Live Traffic Tester (Testing Downtime / Zero-Downtime)" -ForegroundColor Cyan
Write-Host " Target URL: $Url" -ForegroundColor Yellow
Write-Host " Press Ctrl+C to Stop" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Cyan

$successCount = 0
$failCount = 0

while ($true) {
    $time = (Get-Date).ToString("HH:mm:ss.fff")
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 2 -ErrorAction Stop
        $successCount++
        
        $verColor = "Green"
        if ($response.version -match "v1") { $verColor = "Cyan" }
        elseif ($response.version -match "broken") { $verColor = "Red" }
        elseif ($response.version -match "Recreate") { $verColor = "Magenta" }

        Write-Host "[$time] " -NoNewline -ForegroundColor DarkGray
        Write-Host "[200 OK] " -NoNewline -ForegroundColor Green
        Write-Host "Ver: $($response.version) " -NoNewline -ForegroundColor $verColor
        Write-Host "| Pod: " -NoNewline -ForegroundColor DarkGray
        Write-Host "$($response.podName) " -NoNewline -ForegroundColor White
        Write-Host "(Total OK: $successCount, Drop: $failCount)" -ForegroundColor DarkGray
    }
    catch {
        $failCount++
        Write-Host "[$time] " -NoNewline -ForegroundColor DarkGray
        Write-Host "[DOWNTIME DROP] " -NoNewline -ForegroundColor Red
        Write-Host "Cannot reach service! (Error: $_.Exception.Message) (Total Drop: $failCount)" -ForegroundColor Red
    }
    Start-Sleep -Seconds $IntervalSeconds
}
