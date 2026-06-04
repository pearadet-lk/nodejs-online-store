# Node.js Online Store

Full-stack monorepo mirroring the [online-store](https://github.com) reference architecture: **Angular 21** frontend, **10 Node.js microservices** (Gateway + 9 domain services), **pnpm workspaces**, and **Turborepo**.

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
| Frontend | `@online-store/angular` | **4200** | SPA (proxies `/api` → gateway) |

Shared DTOs live in `@online-store/contracts`.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker** (optional, for PostgreSQL schema init)

## Quick start

### 1. Install dependencies

From the repository root:

```powershell
cd d:\MyGitHubProject\nodejs-online-store
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

### 5. Run the frontend

In a **second terminal**:

```powershell
cd d:\MyGitHubProject\nodejs-online-store
pnpm dev:frontend
```

Open **http://localhost:4200**

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
| `pnpm dev:frontend` | Angular dev server on port 4200 |
| `pnpm build` | Build all packages (`contracts` first) |
| `pnpm lint` | Typecheck/lint workspace packages |

## Project layout

```
nodejs-online-store/
├── pnpm-workspace.yaml
├── turbo.json
├── docker-compose.yml
├── database/schema.sql
├── src/
│   ├── BuildingBlocks/contracts/   # Shared types + helpers
│   ├── Services/                   # One package per microservice
│   └── frontend/angular/           # Angular 21 SPA
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

- **Port already in use** — ensure no other stack is bound to 5152, 5121, 5225, etc. Stop the reference .NET services if both repos run locally.
- **`pnpm` not found** — enable Corepack or install pnpm globally.
- **Checkout fails** — start `pnpm dev:backend` first; all domain services must be running before checkout orchestration.
- **Turbo concurrency error** — the repo sets `--concurrency=15` in `package.json` because 10 backend services run in parallel.
- **401 on catalog** — log in first; protected routes require a Bearer token.

## Reference

Behavior and API contract align with `D:\MyGitHubProject\online-store` (ASP.NET microservices + Angular). This repo replaces the backend with Node.js while keeping the same ports and `/api/*` URLs.
