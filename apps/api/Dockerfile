# syntax=docker/dockerfile:1

# ── Base ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS base
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@9.15.0

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

# The pnpm store cache persists the downloaded package tarballs across builds.
# On a warm cache this turns a full network install into a local copy.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

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

# ── Pruned: production-only dependencies via pnpm deploy ─────────────────────
FROM build AS pruned

# pnpm deploy creates a self-contained directory with:
#   - only production dependencies (no devDependencies: typescript, @nestjs/cli,
#     prisma CLI, ts-node, ts-loader, etc.)
#   - workspace packages (@tailor.me/shared) bundled inline — no symlinks needed
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm --filter @tailor.me/api deploy --prod /prod/api

# prisma generate resolves @prisma/client by walking UP from the schema file's
# directory. Passing an absolute /app/... path makes it find the build stage's
# node_modules, not /prod/api/node_modules, so the generated .prisma/client is
# written to the wrong virtual-store tree and the runner image never gets it.
# Fix: copy the schema into /prod/api/prisma/ first, then use a relative path so
# Prisma walks /prod/api/ → finds /prod/api/node_modules/ → writes the client
# into /prod/api/node_modules/.pnpm/@prisma+client@.../node_modules/.prisma/client
WORKDIR /prod/api
RUN mkdir -p prisma && cp /app/apps/api/prisma/schema.prisma ./prisma/schema.prisma
RUN /app/apps/api/node_modules/.bin/prisma generate --schema=./prisma/schema.prisma

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app/apps/api

ENV NODE_ENV=production

# Production-only node_modules — pruned by pnpm deploy.
# devDependencies (typescript, @nestjs/cli, prisma CLI, ts-node, ts-loader…)
# are not present. @tailor.me/shared is bundled inline; no extra COPY needed.
COPY --from=pruned /prod/api/node_modules ./node_modules

# Compiled API output
COPY --from=build /app/apps/api/dist ./dist

# Prisma schema + migrations (required by prisma migrate deploy and the query engine)
COPY --from=build /app/apps/api/prisma ./prisma

EXPOSE 3001

CMD ["node", "dist/main"]

# ── Migrate ──────────────────────────────────────────────────────────────────
# Lean standalone image: node:22-alpine + prisma CLI only.
# No workspace deps, no TypeScript, no build output — just the migration engine
# binary and the schema + migrations folder. Goes from ~2 GB to ~300 MB.
FROM node:22-alpine AS migrate
WORKDIR /app/apps/api

# Install only the prisma CLI (brings the migration engine binary with it).
# Use --no-save so no package.json is created; pin to the same major as the app.
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-save prisma@^6.1.0

COPY apps/api/prisma ./prisma
