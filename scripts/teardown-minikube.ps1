Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProfileName = if ($env:MINIKUBE_PROFILE) { $env:MINIKUBE_PROFILE } else { "minikube" }

& (Join-Path $PSScriptRoot "stop-port-forward-minikube.ps1")

Write-Host "Deleting Kubernetes resources..." -ForegroundColor Yellow
kubectl delete -f (Join-Path (Split-Path -Parent $PSScriptRoot) "k8s\minikube-all-in-one.yaml") --ignore-not-found

Write-Host "Minikube workloads removed. Cluster profile '$ProfileName' is still running." -ForegroundColor Green
Write-Host "To delete the cluster: minikube delete -p $ProfileName" -ForegroundColor DarkGray
