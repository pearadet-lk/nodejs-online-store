Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "stop-port-forward-minikube.ps1")
Start-Sleep -Seconds 2
& (Join-Path $PSScriptRoot "port-forward-minikube.ps1")
