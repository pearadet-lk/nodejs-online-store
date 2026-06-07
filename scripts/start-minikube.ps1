Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProfileName = if ($env:MINIKUBE_PROFILE) { $env:MINIKUBE_PROFILE } else { "minikube" }
$Driver = if ($env:MINIKUBE_DRIVER) { $env:MINIKUBE_DRIVER } else { "docker" }

Write-Host "Starting Minikube profile '$ProfileName' (driver: $Driver)..." -ForegroundColor Cyan
Write-Host "This uses Minikube's own cluster - NOT Docker Desktop Kubernetes." -ForegroundColor Yellow
Write-Host "In Docker Desktop: Settings -> Kubernetes -> leave 'Enable Kubernetes' OFF." -ForegroundColor Yellow
Write-Host ""

$prevEap = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
$currentContext = kubectl config current-context 2>$null
$ErrorActionPreference = $prevEap
if ($currentContext -eq "docker-desktop") {
    Write-Host "WARNING: kubectl context is docker-desktop. This script targets Minikube instead." -ForegroundColor Red
}

minikube start `
    --profile $ProfileName `
    --driver $Driver `
    --cpus 4 `
    --memory 8192 `
    --kubernetes-version=v1.30.0

if ($LASTEXITCODE -ne 0) {
    throw "minikube start failed (exit code $LASTEXITCODE). See messages above; try: minikube delete -p $ProfileName"
}

kubectl config use-context $ProfileName | Out-Null

Write-Host ""
Write-Host "Minikube is ready." -ForegroundColor Green
Write-Host "  Context: $(kubectl config current-context)" -ForegroundColor Green
Write-Host "  Next:    .\scripts\deploy-minikube.ps1" -ForegroundColor Green
