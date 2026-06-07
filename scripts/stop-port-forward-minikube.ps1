Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$forwardPidJson = Join-Path $root ".port-forward\minikube-port-forwards.json"

if (-not (Test-Path $forwardPidJson)) {
    Write-Host "No port-forward PID file found at $forwardPidJson" -ForegroundColor Yellow
    exit 0
}

$records = Get-Content $forwardPidJson -Raw | ConvertFrom-Json
if ($records -isnot [array]) {
    $records = @($records)
}

foreach ($record in $records) {
    $pidValue = [int]$record.Pid
    if (Get-Process -Id $pidValue -ErrorAction SilentlyContinue) {
        Write-Host "Stopping port-forward PID $pidValue ($($record.Service))..." -ForegroundColor Yellow
        Stop-Process -Id $pidValue -Force
    }
}

Remove-Item $forwardPidJson -Force -ErrorAction SilentlyContinue
Write-Host "Port-forwards stopped." -ForegroundColor Green
