# Kubernetes (Minikube)

Deploy the Node.js microservices stack and **Angular 22** frontend to a **Minikube** cluster.

See the main [README](../README.md#urls-at-a-glance) for a comparison of **local dev**, **Docker Compose**, and **Minikube** URLs. Frontend stack details (Angular 22, TypeScript 6, Node requirements) are in [Tech stack](../README.md#tech-stack).

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Minikube** + **kubectl** | Cluster context must be `minikube` (not `docker-desktop`) |
| **Docker** | Image builds via `minikube docker-env` |
| **Node.js** (local dev only) | **22.22.3+**, **24.15.0+**, or **26+** if you run `pnpm dev:frontend` on the host instead of the in-cluster UI |

The in-cluster Angular image is built with [`Dockerfile.angular`](../Dockerfile.angular) using **Node 24 Alpine**, which satisfies Angular 22 build requirements inside Docker.

## What gets deployed

| Workload | Image | In-cluster port |
|----------|-------|-----------------|
| gateway | `online-store-node/gateway:local` | 8080 |
| user-service | `online-store-node/user-service:local` | 8080 |
| product-service | `online-store-node/product-service:local` | 8080 |
| cart-service | `online-store-node/cart-service:local` | 8080 |
| order-service | `online-store-node/order-service:local` | 8080 |
| payment-service | `online-store-node/payment-service:local` | 8080 |
| inventory-service | `online-store-node/inventory-service:local` | 8080 |
| shipping-service | `online-store-node/shipping-service:local` | 8080 |
| history-service | `online-store-node/history-service:local` | 8080 |
| email-service | `online-store-node/email-service:local` | 8080 |
| angular-frontend | `online-store-node/angular:local` (Angular 22 + nginx) | 8080 |

Namespace: `online-store`

ConfigMap `app-config` sets JWT settings and internal service URLs (`http://<service>:8080`).

## Primary URLs (host)

**Requires port-forward.** Without it, these localhost URLs do not work.

| What | URL |
|------|-----|
| Angular 22 UI | http://localhost:4200 |
| Gateway API | http://localhost:5152 |
| Gateway health | http://localhost:5152/health |

## Port-forward map

All mappings are applied by [`scripts/port-forward-minikube.ps1`](../scripts/port-forward-minikube.ps1):

| K8s service | Localhost port | In-cluster port | Example URL |
|-------------|----------------|-----------------|-------------|
| `angular-frontend` | **4200** | 8080 | http://localhost:4200 |
| `gateway` | **5152** | 8080 | http://localhost:5152/health |
| `user-service` | 5121 | 8080 | http://localhost:5121/health |
| `product-service` | 5225 | 8080 | http://localhost:5225/health |
| `cart-service` | 5078 | 8080 | http://localhost:5078/health |
| `order-service` | 5240 | 8080 | http://localhost:5240/health |
| `payment-service` | 5031 | 8080 | http://localhost:5031/health |
| `inventory-service` | 5212 | 8080 | http://localhost:5212/health |
| `shipping-service` | 5219 | 8080 | http://localhost:5219/health |
| `history-service` | 5029 | 8080 | http://localhost:5029/health |
| `email-service` | 5164 | 8080 | http://localhost:5164/health |

## Port-forward lifecycle

| Action | Command |
|--------|---------|
| Deploy + forward | `pnpm minikube:deploy` |
| Forward only | `pnpm minikube:port-forward` |
| Stop | `..\scripts\stop-port-forward-minikube.ps1` |
| Restart | `..\scripts\restart-port-forward-minikube.ps1` |
| PID file | `.port-forward/minikube-port-forwards.json` |
| Logs | `.port-forward/logs/` |

Minimal manual forward (UI + API):

```powershell
kubectl port-forward -n online-store svc/gateway 5152:8080
kubectl port-forward -n online-store svc/angular-frontend 4200:8080
```

## Build images

From repo root (after `minikube docker-env`):

```powershell
docker build -f Dockerfile --build-arg SERVICE_DIR=src/Services/Gateway -t online-store-node/gateway:local .
docker build -f Dockerfile.angular -t online-store-node/angular:local .
```

`Dockerfile.angular` compiles the Angular **22** app (`src/frontend/angular`) with Node **24** and serves static files via nginx ([`nginx-angular.conf`](nginx-angular.conf)). The UI proxies `/api` to the in-cluster gateway service.

Or use `pnpm minikube:deploy` to build all images and apply manifests.

**Hybrid option:** run `pnpm dev:frontend` locally (host Node **22.22.3+** or **24.15.0+**) and port-forward only the gateway (`5152:8080`) if you skip the in-cluster Angular pod.

## Troubleshooting

- **localhost:4200 or :5152 connection refused** — port-forward not running. Run `pnpm minikube:port-forward` or redeploy with `pnpm minikube:deploy`.
- **UI loads but login/API fails** — gateway forward (5152) missing or failed. Check `.port-forward/logs/gateway-stderr.log`.
- **Angular image build fails** — ensure `pnpm-lock.yaml` is committed and up to date; the Docker build runs `pnpm install --frozen-lockfile` then `ng build` for Angular 22.
- **Local `pnpm dev:frontend` fails with Node version error** — upgrade host Node to **22.22.3+** or **24.15.0+** (see main [README prerequisites](../README.md#prerequisites)).

## Not Docker Desktop Kubernetes

This flow uses `minikube start` and kubectl context **`minikube`**. Do not enable Kubernetes inside Docker Desktop; that creates a separate `docker-desktop` context.

