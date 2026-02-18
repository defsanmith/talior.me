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
# Prisma schema is needed here so prisma generate can run right after install
COPY apps/api/prisma/schema.prisma ./apps/api/prisma/schema.prisma

RUN pnpm install --frozen-lockfile

# Generate Prisma Client immediately after install while network access is available.
# prisma is a devDep of apps/api so its binary lives at apps/api/node_modules/.bin/prisma.
RUN ./apps/api/node_modules/.bin/prisma generate --schema=./apps/api/prisma/schema.prisma

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS build
WORKDIR /app

# Copy the full deps layer — this includes root node_modules AND per-package
# node_modules (e.g. packages/shared/node_modules/.bin/tsc).
COPY --from=deps /app/ ./

# Overwrite with actual source files
COPY packages/shared ./packages/shared
COPY apps/worker ./apps/worker
# Copy the full prisma schema for reference during build
COPY apps/api/prisma ./apps/api/prisma

# Build shared package first (worker depends on it)
RUN pnpm --filter @tailor.me/shared build

# Build the worker
RUN pnpm --filter @tailor.me/worker build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
# Set WORKDIR to the app directory so Node.js module resolution traverses:
#   /app/apps/worker/node_modules  →  /app/apps/node_modules  →  /app/node_modules
WORKDIR /app/apps/worker

ENV NODE_ENV=production

# Root node_modules (hoisted deps)
COPY --from=build /app/node_modules /app/node_modules
# App-level node_modules (non-hoisted deps, e.g. @nestjs/*, bullmq)
COPY --from=build /app/apps/worker/node_modules ./node_modules
# prisma CLI + query engine binary lives under apps/api/node_modules
COPY --from=build /app/apps/api/node_modules /app/apps/api/node_modules
# @tailor.me/shared is a pnpm workspace symlink pointing to packages/shared.
# The symlink target must exist in the runner for Node.js to resolve it.
COPY --from=build /app/packages/shared /app/packages/shared

# Compiled worker output
COPY --from=build /app/apps/worker/dist ./dist

CMD ["node", "dist/main"]
