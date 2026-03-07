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

# ── Migrate: full build stage for running database migrations ─────────────────
# Based on the build stage (all devDependencies present) rather than the lean
# runner. prisma migrate deploy requires @prisma/engines (migration engine binary)
# and several other transitive deps of the prisma CLI — all of which are
# available in the build stage's pnpm virtual store. Image size is not a concern
# here since this container runs once at startup and is then discarded.
FROM build AS migrate
WORKDIR /app/apps/api
