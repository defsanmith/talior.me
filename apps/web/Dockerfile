# syntax=docker/dockerfile:1

# ── Base ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ── Deps: install all workspace dependencies ─────────────────────────────────
FROM base AS deps
WORKDIR /app

# pnpm requires all workspace package.json files to be present to correctly
# resolve the workspace and install per-package devDependencies.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY apps/latex-service/package.json ./apps/latex-service/

RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app

# Copy the full deps layer — this includes root node_modules AND per-package
# node_modules (e.g. packages/shared/node_modules/.bin/tsc).
COPY --from=deps /app/ ./

# Overwrite with actual source files
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# NEXT_PUBLIC_BASE_URL is baked into the client bundle at build time
ARG NEXT_PUBLIC_BASE_URL=http://localhost:3001
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL

# Build shared package first (web depends on it)
RUN pnpm --filter @tailor.me/shared build

# Build Next.js (produces .next/standalone because of output: 'standalone' in next.config.mjs)
RUN pnpm --filter @tailor.me/web build

# Ensure public/ exists so the runner COPY doesn't fail on projects that have
# no static assets in that directory.
RUN mkdir -p ./apps/web/public

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# Bind to all interfaces inside the container
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# next build --standalone with a pnpm monorepo mirrors the full workspace path
# inside the standalone bundle:
#   .next/standalone/apps/web/server.js   ← entry point
#   .next/standalone/apps/web/.next/      ← compiled output
# Static assets and public/ must be placed under the same nested path.
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
