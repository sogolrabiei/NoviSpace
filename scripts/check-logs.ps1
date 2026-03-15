# NoviSpace Backend Log Analyzer
# Pulls recent logs and filters for errors and important events

Write-Host "=== NoviSpace Backend Log Analysis ===" -ForegroundColor Cyan
Write-Host ""

# Pull last 500 log entries
Write-Host "Fetching logs..." -ForegroundColor Yellow
$env:PATH = "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin;" + $env:PATH

$logs = gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=novispace-backend" --limit=500 --format=json --project=novispace --freshness=30m | ConvertFrom-Json

Write-Host "Total log entries: $($logs.Count)" -ForegroundColor Green
Write-Host ""

# Extract text logs
$textLogs = $logs | Where-Object { $_.textPayload } | Select-Object -ExpandProperty textPayload

# Filter for different categories
Write-Host "=== ERRORS ===" -ForegroundColor Red
$errors = $textLogs | Where-Object { $_ -match "Error|ERROR|error" }
if ($errors) {
    $errors | Select-Object -First 20 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
} else {
    Write-Host "No errors found" -ForegroundColor Green
}
Write-Host ""

Write-Host "=== GEMINI SESSION EVENTS ===" -ForegroundColor Magenta
$geminiEvents = $textLogs | Where-Object { $_ -match "\[Gemini\]" }
if ($geminiEvents) {
    $geminiEvents | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "No Gemini events found"
}
Write-Host ""

Write-Host "=== WEBSOCKET EVENTS ===" -ForegroundColor Cyan
$wsEvents = $textLogs | Where-Object { $_ -match "\[WS\]" }
if ($wsEvents) {
    $wsEvents | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "No WebSocket events found"
}
Write-Host ""

Write-Host "=== SESSION CREATION ===" -ForegroundColor Yellow
$sessionCreation = $textLogs | Where-Object { $_ -match "Attempting to create|Session created|session started" }
if ($sessionCreation) {
    $sessionCreation | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
} else {
    Write-Host "No session creation logs found"
}
Write-Host ""

Write-Host "=== WARNINGS ===" -ForegroundColor DarkYellow
$warnings = $textLogs | Where-Object { $_ -match "warn|WARN|Cannot send" }
if ($warnings) {
    $warnings | Select-Object -First 20 | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
} else {
    Write-Host "No warnings found"
}
Write-Host ""

# Count different message types
$audioSent = ($textLogs | Where-Object { $_ -match "Sending audio chunk" }).Count
$videoSent = ($textLogs | Where-Object { $_ -match "Sending video frame" }).Count
$audioReceived = ($textLogs | Where-Object { $_ -match "Received audio response" }).Count

Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Audio chunks sent to Gemini: $audioSent"
Write-Host "Video frames sent to Gemini: $videoSent"
Write-Host "Audio responses from Gemini: $audioReceived"
Write-Host ""

if ($audioSent -gt 0 -and $audioReceived -eq 0) {
    Write-Host "WARNING: Audio/video sent but NO responses from Gemini!" -ForegroundColor Red
    Write-Host "This suggests a Gemini API or session issue." -ForegroundColor Red
}
