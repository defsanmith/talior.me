# syntax=docker/dockerfile:1

# ── Base ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
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

# Run prisma generate from within the deployed directory so Prisma resolves
# node_modules/@prisma/client at /prod/api and writes the generated client to
# /prod/api/node_modules/.prisma/client — no devDependency needed in the image.
# The prisma CLI binary in /app (from the build stage) is still accessible here.
WORKDIR /prod/api
RUN /app/apps/api/node_modules/.bin/prisma generate \
    --schema=/app/apps/api/prisma/schema.prisma

# ── Runner ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
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

# ── Migrate: runner + Prisma CLI for running database migrations ──────────────
# Extends the lean runner image by adding only the prisma CLI binary and package.
# Used exclusively by the `migrate` compose service; not shipped as the api image.
FROM runner AS migrate
COPY --from=build /app/apps/api/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=build /app/apps/api/node_modules/prisma ./node_modules/prisma
