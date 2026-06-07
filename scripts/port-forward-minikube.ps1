Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProfileName = if ($env:MINIKUBE_PROFILE) { $env:MINIKUBE_PROFILE } else { "minikube" }
Write-Host "Checking Minikube profile '$ProfileName'..." -ForegroundColor Cyan
minikube status -p $ProfileName | Out-Null

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root ".port-forward"
$forwardPidJson = Join-Path $runtimeDir "minikube-port-forwards.json"
$logDir = Join-Path $runtimeDir "logs"

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$forwards = @(
    @{ Service = "gateway"; LocalPort = 5152; RemotePort = 8080 },
    @{ Service = "angular-frontend"; LocalPort = 4200; RemotePort = 8080 },
    @{ Service = "user-service"; LocalPort = 5121; RemotePort = 8080 },
    @{ Service = "product-service"; LocalPort = 5225; RemotePort = 8080 },
    @{ Service = "cart-service"; LocalPort = 5078; RemotePort = 8080 },
    @{ Service = "order-service"; LocalPort = 5240; RemotePort = 8080 },
    @{ Service = "payment-service"; LocalPort = 5031; RemotePort = 8080 },
    @{ Service = "inventory-service"; LocalPort = 5212; RemotePort = 8080 },
    @{ Service = "shipping-service"; LocalPort = 5219; RemotePort = 8080 },
    @{ Service = "history-service"; LocalPort = 5029; RemotePort = 8080 },
    @{ Service = "email-service"; LocalPort = 5164; RemotePort = 8080 }
)

$records = @()
foreach ($f in $forwards) {
    $portInUse = Get-NetTCPConnection -LocalPort $f.LocalPort -State Listen -ErrorAction SilentlyContinue
    if ($null -ne $portInUse) {
        Write-Host ("Skipping {0}: localhost:{1} already in use." -f $f.Service, $f.LocalPort) -ForegroundColor Yellow
        if ($f.Service -eq "gateway" -or $f.Service -eq "angular-frontend") {
            Write-Host "  Run .\scripts\stop-port-forward-minikube.ps1 then retry." -ForegroundColor Red
        }
        continue
    }

    $stdout = Join-Path $logDir "$($f.Service)-stdout.log"
    $stderr = Join-Path $logDir "$($f.Service)-stderr.log"

    Write-Host "port-forward svc/$($f.Service) localhost:$($f.LocalPort) -> $($f.RemotePort)" -ForegroundColor Yellow
    $proc = Start-Process `
        -FilePath "kubectl" `
        -ArgumentList @("port-forward", "-n", "online-store", "svc/$($f.Service)", "$($f.LocalPort):$($f.RemotePort)") `
        -NoNewWindow `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru

    $records += [pscustomobject]@{
        Service = $f.Service
        LocalPort = $f.LocalPort
        RemotePort = $f.RemotePort
        Pid = $proc.Id
    }
}

$records | ConvertTo-Json | Set-Content -Path $forwardPidJson -Encoding UTF8

Write-Host ""
Write-Host ("Started {0} port-forward process(es)." -f $records.Count) -ForegroundColor Green
Write-Host "  Angular UI:  http://localhost:4200" -ForegroundColor Cyan
Write-Host "  Gateway API: http://localhost:5152/health" -ForegroundColor Cyan
Write-Host "  PID file:    $forwardPidJson" -ForegroundColor DarkGray
