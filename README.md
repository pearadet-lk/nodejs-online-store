# Node.js Online Store

Full-stack monorepo mirroring the [online-store](https://github.com) reference architecture: **Angular 22** frontend, **10 Node.js microservices** (Gateway + 9 domain services), **pnpm workspaces**, and **Turborepo**.

## Architecture

| Service | Package | Port | Role |
|---------|---------|------|------|
| Gateway | `@online-store/gateway` | **5152** | JWT, `/api/*` proxy, `POST /api/checkout` BFF |
| UserService | `@online-store/user-service` | 5121 | Auth (login, register, refresh, logout) |
| ProductService | `@online-store/product-service` | 5225 | Catalog + admin products |
| CartService | `@online-store/cart-service` | 5078 | User carts |
| OrderService | `@online-store/order-service` | 5240 | Orders |
| PaymentService | `@online-store/payment-service` | 5031 | Payments (mock) |
| InventoryService | `@online-store/inventory-service` | 5212 | Stock reserve/commit |
| ShippingService | `@online-store/shipping-service` | 5219 | Shipments |
| HistoryService | `@online-store/history-service` | 5029 | Order history events |
| EmailService | `@online-store/email-service` | 5164 | Email status (stub) |
| Frontend | `@online-store/angular` | **4200** | Angular 22 SPA (proxies `/api` → gateway) |

Shared DTOs live in `@online-store/contracts`.

## Tech stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Angular | **22** (`@angular/core` ^22.0.0) |
| Frontend language | TypeScript | **6.0** (`~6.0.3`) |
| Frontend runtime | zone.js | ~0.16.0 |
| Backend | Node.js + Fastify | Node **22.22.3+** (see [Prerequisites](#prerequisites)) |
| Monorepo | pnpm workspaces + Turborepo | pnpm 9+ |
| Container UI image | nginx + `Dockerfile.angular` | Node **24** Alpine build stage |

The Angular app lives in [`src/frontend/angular`](src/frontend/angular). Dev server proxies `/api` to the gateway on port **5152** via [`proxy.conf.json`](src/frontend/angular/proxy.conf.json).

## URLs at a glance

### Local development (pnpm)

Run `pnpm dev:backend` + `pnpm dev:frontend` (or `pnpm dev`). Services listen directly on your machine — **no port-forward needed**.

| What | URL | How to start |
|------|-----|--------------|
| Angular UI | http://localhost:4200 | `pnpm dev:frontend` (proxies `/api` → gateway) |
| Gateway API | http://localhost:5152 | `pnpm dev:backend` |
| Gateway health | http://localhost:5152/health | smoke test |
| UserService | http://localhost:5121/health | included in `pnpm dev:backend` |
| ProductService | http://localhost:5225/health | included in `pnpm dev:backend` |
| CartService | http://localhost:5078/health | included in `pnpm dev:backend` |
| OrderService | http://localhost:5240/health | included in `pnpm dev:backend` |
| PaymentService | http://localhost:5031/health | included in `pnpm dev:backend` |
| InventoryService | http://localhost:5212/health | included in `pnpm dev:backend` |
| ShippingService | http://localhost:5219/health | included in `pnpm dev:backend` |
| HistoryService | http://localhost:5029/health | included in `pnpm dev:backend` |
| EmailService | http://localhost:5164/health | included in `pnpm dev:backend` |

Quick checks:

```powershell
curl http://localhost:5152/health
curl -Method POST http://localhost:5152/api/users/login `
  -ContentType "application/json" `
  -Body '{"email":"demo@example.com","password":"demo-password"}'
```

### Docker Compose (PostgreSQL only)

[`docker-compose.yml`](docker-compose.yml) runs **Postgres only** — not the app microservices. Start the app with **pnpm** (table above).

| What | URL / connection |
|------|------------------|
| PostgreSQL host | `localhost:5432` |
| Connection string | `postgresql://postgres:postgres@localhost:5432/online_store` |
| App (UI + API) | Same as **local dev** — http://localhost:4200 and http://localhost:5152 |

```powershell
docker compose up -d   # optional schema init from database/schema.sql
pnpm dev               # app still runs via Node, not Compose
```

Backend services currently use **in-memory stores**; Postgres is optional for future persistence.

### Minikube (Kubernetes)

Services run **inside the cluster** on port **8080** (ClusterIP). They are **not** on localhost until you **port-forward**.

| What | URL (after port-forward) |
|------|--------------------------|
| Angular UI | http://localhost:4200 |
| Gateway API | http://localhost:5152 |
| Gateway health | http://localhost:5152/health |

Without port-forward, http://localhost:4200 and http://localhost:5152 **will not work**. See [Minikube port-forwarding](#minikube-port-forwarding) below.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| **Node.js** | **22.22.3+**, **24.15.0+**, or **26+** — required by Angular 22 CLI. Node 20 is not supported for the frontend. |
| **pnpm** | 9+ — `corepack enable && corepack prepare pnpm@9.15.0 --activate` |
| **Docker** | Optional — PostgreSQL via Compose; Minikube image builds |

Check your Node version:

```powershell
node -v
```

If `pnpm dev:frontend` or `ng build` reports a minimum Node version error, upgrade from [nodejs.org](https://nodejs.org/) (e.g. **24.16 LTS** or **22.22 LTS**), then run `pnpm install` again.

## Quick start

### 1. Install dependencies

From the repository root:

```powershell
cd your-local-folder-path\nodejs-online-store
pnpm install
```

### 2. Environment (optional)

```powershell
copy .env.example .env
```

Services use in-memory stores by default. JWT settings in `.env` must stay consistent if you customize them.

### 3. Start PostgreSQL (optional)

```powershell
docker compose up -d
```

Schema is applied from `database/schema.sql` on first container start. Backend services currently run in **in-memory mode** without requiring Postgres.

### 4. Run the backend

Start all microservices (10 processes via Turborepo):

```powershell
pnpm dev:backend
```

Wait until you see log lines like `gateway listening on 0.0.0.0:5152`.

Verify:

```powershell
curl http://localhost:5152/health
```

### 5. Run the frontend (Angular 22)

In a **second terminal** (requires Node **22.22.3+** or **24.15.0+**):

```powershell
cd your-local-folder-path\nodejs-online-store
pnpm dev:frontend
```

Open **http://localhost:4200**. The page title shows **Online Store (Angular 22 - Node Gateway)**.

### 6. Run everything at once

Single command (backend + Angular):

```powershell
pnpm dev
```

## Demo credentials

| Field | Value |
|-------|-------|
| Email | `demo@example.com` |
| Password | `demo-password` |

## Typical workflow

1. **Login** with the demo user (pre-filled on the login form).
2. **Catalog** — search products, set quantity, **Add to cart**.
3. **Cart** — **Checkout** (calls `POST /api/checkout` with idempotency).
4. **Admin** — create, edit, or deactivate products (requires login).

## Useful commands

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace packages |
| `pnpm dev` | Turborepo: all `dev` tasks (backend + frontend) |
| `pnpm dev:backend` | Gateway + 9 domain services only |
| `pnpm dev:frontend` | Angular 22 dev server on port 4200 |
| `pnpm build` | Build all packages (`contracts` first) |
| `pnpm lint` | Typecheck/lint workspace packages |
| `pnpm minikube:start` | Start Minikube cluster (not Docker Desktop K8s) |
| `pnpm minikube:deploy` | Build images + deploy to Minikube |
| `pnpm minikube:port-forward` | Forward localhost ports (4200, 5152, …) |
| `pnpm minikube:teardown` | Remove workloads + stop port-forwards |

## Deploy to Minikube (without Docker Desktop Kubernetes)

Use a **standalone Minikube cluster**. Docker Desktop can provide the Docker engine, but **leave “Enable Kubernetes” turned off** in Docker Desktop settings — this project does not use the `docker-desktop` kubectl context.

### Prerequisites

| Tool | Purpose |
|------|---------|
| [Minikube](https://minikube.sigs.k8s.io/docs/start/) | Local Kubernetes cluster |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | Apply manifests |
| Docker | Image builds via `minikube docker-env` |

Optional: set `$env:MINIKUBE_DRIVER = "hyperv"` on Windows if the default `docker` driver is unavailable.

### First-time setup

```powershell
cd your-local-folder-path\nodejs-online-store
pnpm install

# 1) Create Minikube cluster (profile: minikube)
pnpm minikube:start

# 2) Build images inside Minikube's Docker, deploy manifests, start port-forwards
pnpm minikube:deploy
```

When deploy finishes (and port-forwards are running):

| URL | Description |
|-----|-------------|
| http://localhost:4200 | Angular UI (nginx in cluster, proxies `/api` → gateway) |
| http://localhost:5152 | Gateway API (`GET /health`) |

Demo login: `demo@example.com` / `demo-password`

### Minikube port-forwarding

**Why it is required:** Kubernetes services in [`k8s/minikube-all-in-one.yaml`](k8s/minikube-all-in-one.yaml) use **ClusterIP** — reachable as `http://gateway:8080` inside the cluster only. To use the same localhost URLs as local dev, `kubectl port-forward` maps your machine to each service.

Unlike `pnpm dev`, Minikube does **not** expose 4200/5152 on your host automatically. You must run port-forward (or use `minikube service --url` / Ingress — not configured in this repo).

**Hybrid option:** run `pnpm dev:frontend` locally and port-forward **only the gateway** (`5152:8080`) if you skip the in-cluster Angular pod.

#### Port-forward map

Namespace: `online-store`. Script: [`scripts/port-forward-minikube.ps1`](scripts/port-forward-minikube.ps1).

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

#### Port-forward lifecycle

| Action | Command |
|--------|---------|
| Start (included in deploy) | `pnpm minikube:deploy` |
| Start manually | `pnpm minikube:port-forward` |
| Stop | `.\scripts\stop-port-forward-minikube.ps1` |
| Restart stale tunnels | `.\scripts\restart-port-forward-minikube.ps1` |
| PID file | `.port-forward/minikube-port-forwards.json` |
| Logs | `.port-forward/logs/<service>-stdout.log` / `-stderr.log` |

Manual equivalent (minimal — UI + API only):

```powershell
kubectl port-forward -n online-store svc/gateway 5152:8080
kubectl port-forward -n online-store svc/angular-frontend 4200:8080
```

### Minikube scripts

| Script | Description |
|--------|-------------|
| `scripts/start-minikube.ps1` | `minikube start` with profile `minikube` |
| `scripts/deploy-minikube.ps1` | Build 11 container images + `kubectl apply` |
| `scripts/port-forward-minikube.ps1` | Forward gateway (5152), UI (4200), and service debug ports |
| `scripts/stop-port-forward-minikube.ps1` | Stop background `kubectl port-forward` processes |
| `scripts/restart-port-forward-minikube.ps1` | Stop + restart port-forwards |
| `scripts/teardown-minikube.ps1` | Delete namespace workloads |

### Redeploy after code changes

```powershell
pnpm minikube:deploy
```

Images are rebuilt into Minikube’s Docker daemon (not Docker Desktop’s default registry).

### Tear down

```powershell
pnpm minikube:teardown
minikube delete -p minikube   # optional: remove cluster entirely
```

### Verify kubectl context

```powershell
kubectl config current-context
# Expected: minikube
# NOT: docker-desktop
```

Manifests: [`k8s/minikube-all-in-one.yaml`](k8s/minikube-all-in-one.yaml) — namespace `online-store`, images `online-store-node/*:local`.

See also [`k8s/README.md`](k8s/README.md).

## Project layout

```
nodejs-online-store/
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── Dockerfile                  # Node microservice image
├── Dockerfile.angular          # Angular nginx image
├── database/schema.sql
├── k8s/
│   ├── minikube-all-in-one.yaml
│   └── nginx-angular.conf
├── scripts/
│   ├── start-minikube.ps1
│   ├── deploy-minikube.ps1
│   └── port-forward-minikube.ps1
├── src/
│   ├── BuildingBlocks/contracts/   # Shared types + helpers
│   ├── Services/                   # One package per microservice
│   └── frontend/angular/           # Angular 22 SPA
└── README.md
```

## API entry point

All browser traffic goes through the gateway:

- Base URL (via Angular proxy): `http://localhost:5152`
- Health: `GET /health`
- Auth: `POST /api/users/login`, `/register`, `/refresh`, `/logout`
- Catalog: `GET /api/products?q=`
- Admin: `GET/POST/PUT/DELETE /api/admin/products`
- Cart: `PUT /api/carts/{userId}`
- Checkout: `POST /api/checkout` + header `Idempotency-Key`

## Troubleshooting

### Local dev (pnpm)

- **Angular CLI Node version error** — Angular 22 needs Node **22.22.3+**, **24.15.0+**, or **26+**. Upgrade Node and rerun `pnpm install` if you see `The Angular CLI requires a minimum Node.js version…`.
- **Port already in use** — ensure no other stack is bound to 5152, 5121, 5225, etc. Stop the reference .NET services if both repos run locally.
- **`pnpm` not found** — enable Corepack or install pnpm globally.
- **Checkout fails** — start `pnpm dev:backend` first; all domain services must be running before checkout orchestration.
- **Turbo concurrency error** — the repo sets `--concurrency=15` in `package.json` because 10 backend services run in parallel.
- **401 on catalog** — log in first; protected routes require a Bearer token.
- **Admin product edit/create fails** — log in first; create uses `POST /api/admin/products`, update uses `PUT /api/admin/products/{id}` (proxied through the gateway).

### Minikube (K8s) and port-forward

- **localhost:4200 or :5152 connection refused** — port-forward not running. Run `pnpm minikube:port-forward` or redeploy with `pnpm minikube:deploy`.
- **Port-forward skipped / already in use** — stop local `pnpm dev` or other apps on 4200/5152/5121…; run `.\scripts\stop-port-forward-minikube.ps1`, then `pnpm minikube:port-forward`.
- **UI loads but login/API fails** — gateway forward (5152) missing or failed. Check `.port-forward/logs/gateway-stderr.log`.
- **Stale tunnels after sleep/reboot** — run `.\scripts\restart-port-forward-minikube.ps1`.
- **Wrong kubectl context** — run `pnpm minikube:start`; context must be `minikube`, not `docker-desktop`.
- **Cannot access Minikube like local dev without port-forward** — expected with ClusterIP services; port-forward (or `minikube service <name> --url`) is required.

## Reference

Behavior and API contract align with `your-local-folder-path\online-store` (ASP.NET microservices + Angular). This repo replaces the backend with **Node.js** microservices while keeping the same ports and `/api/*` URLs. The frontend here targets **Angular 22** with **TypeScript 6**; the reference repo may still use an older Angular major version.
