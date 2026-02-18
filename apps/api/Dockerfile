# syntax=docker/dockerfile:1

# ── Base ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN npm install -g pnpm@9.15.0

# ── Deps: install all workspace dependencies ─────────────────────────────────
FROM base AS deps
WORKDIR /app

# Copy workspace manifests first for better layer caching.
# pnpm requires all workspace package.json files to be present to correctly
# resolve the workspace and install per-package devDependencies.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/
COPY apps/latex-service/package.json ./apps/latex-service/
# Prisma schema is needed here so prisma generate can run right after install
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma

RUN pnpm install --frozen-lockfile

# Generate Prisma Client immediately after install while network access is
# available. prisma is a devDep of apps/api so its binary lives there, not
# at the root. The generated client stays in node_modules and is carried
# forward into the build stage via COPY --from=deps.
RUN ./apps/api/node_modules/.bin/prisma generate --schema=./apps/api/prisma/schema.prisma

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app

# Copy the full deps layer — this includes root node_modules AND per-package
# node_modules (e.g. packages/shared/node_modules/.bin/tsc).
COPY --from=deps /app/ ./

# Overwrite with actual source files
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# Build shared package first (api depends on it)
RUN pnpm --filter @tailor.me/shared build

# Build the API
RUN pnpm --filter @tailor.me/api build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
# Set WORKDIR to the app directory so Node.js module resolution traverses:
#   /app/apps/api/node_modules  →  /app/apps/node_modules  →  /app/node_modules
# which covers both hoisted (root) and non-hoisted (app-level) pnpm packages.
WORKDIR /app/apps/api

ENV NODE_ENV=production

# Root node_modules (hoisted deps shared across the workspace)
COPY --from=build /app/node_modules /app/node_modules
# App-level node_modules (non-hoisted deps, e.g. @nestjs/*, prisma CLI)
COPY --from=build /app/apps/api/node_modules ./node_modules
# @tailor.me/shared is a pnpm workspace symlink pointing to packages/shared.
# The symlink target must exist in the runner for Node.js to resolve it.
COPY --from=build /app/packages/shared /app/packages/shared

# Compiled API output
COPY --from=build /app/apps/api/dist ./dist

# Prisma schema + migrations (required by prisma migrate deploy and the query engine)
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]
