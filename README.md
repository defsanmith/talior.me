# Tailor.me - AI-Powered Resume Builder

A single-user monorepo application for building tailored resumes using AI. Supports up to 10 concurrent resume-build jobs with real-time progress updates.

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend API**: NestJS with Socket.IO for real-time updates
- **Worker**: NestJS with BullMQ for job processing
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: BullMQ with Redis
- **AI**: OpenAI API

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker and Docker Compose

## Quick Start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:

   ```
   OPENAI_API_KEY=sk-...
   ```

3. **Start infrastructure** (Postgres, Redis, OpenSearch, LaTeX service)

   ```bash
   docker compose up -d postgres redis opensearch latex
   ```

   > To run the **full stack in production mode** instead, see [Running with Docker (Production)](#running-with-docker-production) below.

4. **Run migrations**

   ```bash
   pnpm db:migrate
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

## Application URLs

- **Web UI**: http://localhost:3000
- **API**: http://localhost:3001
- **WebSocket**: http://localhost:3001/socket.io
- **Prisma Studio**: `pnpm db:studio` → http://localhost:5555

## Running with Docker (Production)

Run the entire stack — frontend, API, worker, LaTeX service, Postgres, Redis, and OpenSearch — with a single command. No local Node.js or pnpm installation required.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24 with Docker Compose v2 (`docker compose` not `docker-compose`)
- **≥ 8 GB of RAM** available to Docker (OpenSearch requires at least 4 GB on its own)
- On Linux, OpenSearch requires a higher virtual memory limit — run once on the host:
  ```bash
  sudo sysctl -w vm.max_map_count=262144
  ```

### 1. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in the required secrets:

| Variable         | Required                      | Description                                   |
| ---------------- | ----------------------------- | --------------------------------------------- |
| `OPENAI_API_KEY` | Yes (if `AI_PROVIDER=OPENAI`) | Your OpenAI API key                           |
| `GEMINI_API_KEY` | Yes (if `AI_PROVIDER=GEMINI`) | Your Google Gemini API key                    |
| `JWT_SECRET`     | **Yes**                       | Long random string — change from the default! |

Everything else has sensible defaults for the Docker Compose network and can be left as-is.

### 2. Build and start all services

```bash
docker compose up --build -d
```

The first build will take several minutes (it installs pnpm workspaces and compiles all TypeScript). Subsequent starts are fast because Docker caches the layers.

**Start-up order**  
`postgres` → `migrate` (runs Prisma migrations) → `api` + `worker` → `web`

### 3. Service URLs

| Service               | URL                   |
| --------------------- | --------------------- |
| Web UI                | http://localhost:3000 |
| API                   | http://localhost:3001 |
| LaTeX service         | http://localhost:3002 |
| OpenSearch            | http://localhost:9200 |
| OpenSearch Dashboards | http://localhost:5601 |

### Common commands

```bash
# View logs for all services (live)
docker compose logs -f

# View logs for a specific service
docker compose logs -f api
docker compose logs -f worker

# Check the status of all containers
docker compose ps

# Stop all services (data volumes are preserved)
docker compose down

# Stop all services AND delete volumes (resets database, Redis, and OpenSearch)
docker compose down -v

# Rebuild and restart a single service after a code change
docker compose up --build -d api

# Rebuild a single service image without restarting
docker compose build api
```

### Re-running migrations manually

```bash
docker compose run --rm migrate
```

### Troubleshooting

| Symptom                      | Fix                                                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api` keeps restarting       | `migrate` may not have finished — check `docker compose logs migrate`                                                                               |
| OpenSearch exits immediately | Increase Docker memory limit to ≥ 8 GB; on Linux run `sudo sysctl -w vm.max_map_count=262144`                                                       |
| Port already in use          | Stop any locally running services on ports 3000, 3001, 3002, 5432, 6379, 9200                                                                       |
| `NEXT_PUBLIC_BASE_URL` wrong | If you expose the API on a non-localhost host, set `NEXT_PUBLIC_BASE_URL=http://<your-host>:3001` in `.env` and rebuild: `docker compose build web` |

## Project Structure

```
tailor.me/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # NestJS API with Socket.IO
│   └── worker/       # NestJS BullMQ worker
├── packages/
│   └── shared/       # Shared types and DTOs
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

## Features

### Profile Management

- Store work experiences with atomic bullets
- Tag bullets with skills and technologies
- Seed with demo data for testing

### Resume Job System

- Submit job descriptions
- Max 10 concurrent jobs
- Real-time progress updates via WebSocket
- Persistent job history

### AI Workflow

1. **Parse JD**: Extract required skills and keywords
2. **Retrieve**: Find relevant bullets from profile
3. **Select**: Choose best-matching bullets
4. **Rewrite**: AI-enhance bullets (grounded in original content)
5. **Verify**: Ensure no hallucinations or scope inflation
6. **Assemble**: Generate final resume JSON

### Real-time Updates

- Live progress bars on dashboard
- Stage updates (parsing, rewriting, etc.)
- WebSocket + fallback polling

## Development

### Database Commands

```bash
# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Generate Prisma Client
pnpm db:generate
```

### Build & Deploy

```bash
# Build all apps
pnpm build

# Start production servers
pnpm start
```

### Clean

```bash
# Remove build artifacts and node_modules
pnpm clean
```

## Architecture Notes

- **No retries**: Jobs fail fast on errors
- **Single user**: No authentication required
- **Grounded rewrites**: AI only rephrases existing content, no new claims
- **Deterministic verification**: Checks for hallucinations before accepting AI output
- **Concurrent processing**: Worker handles up to 10 jobs simultaneously

## License

MIT
