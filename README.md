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

3. **Start databases**

   ```bash
   docker compose up -d
   ```

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
