Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProfileName = if ($env:MINIKUBE_PROFILE) { $env:MINIKUBE_PROFILE } else { "minikube" }
$root = Split-Path -Parent $PSScriptRoot

Write-Host "Checking Minikube profile '$ProfileName'..." -ForegroundColor Cyan
minikube status -p $ProfileName | Out-Null

$ctx = kubectl config current-context
if ($ctx -ne $ProfileName) {
    Write-Host "Switching kubectl context to $ProfileName (was: $ctx)..." -ForegroundColor Yellow
    kubectl config use-context $ProfileName | Out-Null
}

if ($ctx -eq "docker-desktop") {
    throw "kubectl is using docker-desktop context. Run .\scripts\start-minikube.ps1 first (Minikube cluster, not Docker Desktop Kubernetes)."
}

Write-Host "Switching Docker CLI to Minikube Docker daemon..." -ForegroundColor Cyan
& minikube -p $ProfileName docker-env --shell powershell | Invoke-Expression

Push-Location $root
try {
    $services = @(
        @{ Image = "online-store-node/gateway:local"; Package = "@online-store/gateway"; Dir = "src/Services/Gateway" },
        @{ Image = "online-store-node/user-service:local"; Package = "@online-store/user-service"; Dir = "src/Services/UserService" },
        @{ Image = "online-store-node/product-service:local"; Package = "@online-store/product-service"; Dir = "src/Services/ProductService" },
        @{ Image = "online-store-node/cart-service:local"; Package = "@online-store/cart-service"; Dir = "src/Services/CartService" },
        @{ Image = "online-store-node/order-service:local"; Package = "@online-store/order-service"; Dir = "src/Services/OrderService" },
        @{ Image = "online-store-node/payment-service:local"; Package = "@online-store/payment-service"; Dir = "src/Services/PaymentService" },
        @{ Image = "online-store-node/inventory-service:local"; Package = "@online-store/inventory-service"; Dir = "src/Services/InventoryService" },
        @{ Image = "online-store-node/shipping-service:local"; Package = "@online-store/shipping-service"; Dir = "src/Services/ShippingService" },
        @{ Image = "online-store-node/history-service:local"; Package = "@online-store/history-service"; Dir = "src/Services/HistoryService" },
        @{ Image = "online-store-node/email-service:local"; Package = "@online-store/email-service"; Dir = "src/Services/EmailService" }
    )

    foreach ($svc in $services) {
        Write-Host "Building $($svc.Image)..." -ForegroundColor Yellow
        docker build `
            -f Dockerfile `
            --build-arg SERVICE_PACKAGE=$($svc.Package) `
            --build-arg SERVICE_DIR=$($svc.Dir) `
            -t $svc.Image `
            .
        if ($LASTEXITCODE -ne 0) {
            throw "Docker build failed for $($svc.Image). Fix the build error above and re-run deploy."
        }
    }

    Write-Host "Building online-store-node/angular:local..." -ForegroundColor Yellow
    docker build -f Dockerfile.angular -t online-store-node/angular:local .
    if ($LASTEXITCODE -ne 0) {
        throw "Docker build failed for online-store-node/angular:local. Fix the build error above and re-run deploy."
    }

    Write-Host "Applying Kubernetes manifests..." -ForegroundColor Cyan
    kubectl apply -f k8s/minikube-all-in-one.yaml

    $deployments = @(
        "user-service",
        "product-service",
        "cart-service",
        "order-service",
        "payment-service",
        "inventory-service",
        "shipping-service",
        "history-service",
        "email-service",
        "gateway",
        "angular-frontend"
    )

    foreach ($deployment in $deployments) {
        Write-Host "Waiting for deployment/$deployment..." -ForegroundColor Yellow
        kubectl rollout status deployment/$deployment -n online-store --timeout=240s
    }

    Write-Host "Starting port-forwards..." -ForegroundColor Cyan
    & (Join-Path $PSScriptRoot "port-forward-minikube.ps1")

    Write-Host ""
    Write-Host "Minikube deployment completed." -ForegroundColor Green
    Write-Host "  Angular UI:  http://localhost:4200" -ForegroundColor Green
    Write-Host "  Gateway API: http://localhost:5152" -ForegroundColor Green
    Write-Host "  Demo login:  demo@example.com / demo-password" -ForegroundColor Green
}
finally {
    Pop-Location
}
