# Build a single Node microservice from the pnpm monorepo.
# Usage:
#   docker build -f Dockerfile --build-arg SERVICE_PACKAGE=@online-store/gateway --build-arg SERVICE_DIR=src/Services/Gateway -t online-store-node/gateway:local .

FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Flat node_modules so devDependency binaries (tsc, etc.) resolve in Docker.
RUN echo "node-linker=hoisted" > .npmrc

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY src/BuildingBlocks/contracts/package.json ./src/BuildingBlocks/contracts/
COPY src/Services/CartService/package.json ./src/Services/CartService/
COPY src/Services/EmailService/package.json ./src/Services/EmailService/
COPY src/Services/Gateway/package.json ./src/Services/Gateway/
COPY src/Services/HistoryService/package.json ./src/Services/HistoryService/
COPY src/Services/InventoryService/package.json ./src/Services/InventoryService/
COPY src/Services/OrderService/package.json ./src/Services/OrderService/
COPY src/Services/PaymentService/package.json ./src/Services/PaymentService/
COPY src/Services/ProductService/package.json ./src/Services/ProductService/
COPY src/Services/ShippingService/package.json ./src/Services/ShippingService/
COPY src/Services/UserService/package.json ./src/Services/UserService/

RUN pnpm install --frozen-lockfile

COPY src/BuildingBlocks/contracts/src ./src/BuildingBlocks/contracts/src
COPY src/BuildingBlocks/contracts/tsconfig.json ./src/BuildingBlocks/contracts/tsconfig.json
ARG SERVICE_DIR=src/Services/Gateway
COPY ${SERVICE_DIR}/src ./${SERVICE_DIR}/src
COPY ${SERVICE_DIR}/tsconfig.json ./${SERVICE_DIR}/tsconfig.json

RUN pnpm --filter @online-store/contracts build

FROM node:22-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src/BuildingBlocks/contracts ./src/BuildingBlocks/contracts

ARG SERVICE_DIR=src/Services/Gateway
ARG SERVICE_PACKAGE=@online-store/gateway
COPY --from=build /app/${SERVICE_DIR} ./${SERVICE_DIR}

ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app/${SERVICE_DIR}

CMD ["pnpm", "exec", "tsx", "src/server.ts"]
