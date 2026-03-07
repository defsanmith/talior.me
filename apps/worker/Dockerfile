# syntax=docker/dockerfile:1

# ── Base ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@9.15.0

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

# The pnpm store cache persists the downloaded package tarballs across builds.
# On a warm cache this turns a full network install into a local copy.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

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

# ── Pruned: production-only dependencies via pnpm deploy ─────────────────────
FROM build AS pruned

# pnpm deploy creates a self-contained directory with:
#   - only production dependencies (no devDependencies: typescript, @nestjs/cli,
#     prisma CLI, ts-node, ts-loader, etc.)
#   - workspace packages (@tailor.me/shared) bundled inline — no symlinks needed
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter @tailor.me/worker deploy --prod /prod/worker

# Same prisma generate fix as the api: copy the schema into /prod/worker/prisma/
# so Prisma walks up from there, finds /prod/worker/node_modules/, and writes
# the generated client into the correct pnpm virtual-store path.
WORKDIR /prod/worker
RUN mkdir -p prisma && cp /app/apps/api/prisma/schema.prisma ./prisma/schema.prisma
RUN /app/apps/api/node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app/apps/worker

ENV NODE_ENV=production

# Production-only node_modules — pruned by pnpm deploy.
# devDependencies (typescript, @nestjs/cli, prisma CLI, ts-node, ts-loader…)
# are not present. @tailor.me/shared is bundled inline; no extra COPY needed.
# The full /app/apps/api/node_modules copy has been replaced by the deploy output,
# which includes only the @prisma/client needed at runtime.
COPY --from=pruned /prod/worker/node_modules ./node_modules

# Compiled worker output
COPY --from=build /app/apps/worker/dist ./dist

CMD ["node", "dist/main"]
