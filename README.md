# History Portal

A personal full-stack TypeScript web application for exploring historical timelines and maps, hosted on GCP.

## Tech Stack

- **Frontend:** Next.js 16 (App Router)
- **Database:** Neon (Serverless PostgreSQL) + Drizzle ORM
- **Auth:** Better Auth
- **Infrastructure:** Pulumi + GCP Cloud Run
- **AI:** Vertex AI (Gemini) for text summarization

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Setup

```bash
# Clone and install dependencies
git clone <repo-url>
cd history-portal
pnpm install

# One-time: Create your Neon dev branch and get connection string
pnpm db:setup:neon-dev

# Add the output DATABASE_URL to .env.local
# Then reset and run migrations
pnpm db:reset:local
```

#### Start Development

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Common Commands

```bash
pnpm dev                   # Start Next.js dev server
pnpm check-types           # Type-check
pnpm test                  # Unit/integration tests
pnpm test:db               # Database/RLS tests
pnpm test:e2e              # E2E tests
pnpm infra:up:staging      # Deploy to staging
pnpm infra:up:prod         # Deploy to production
```

## Project Structure

```
history-portal/
├── src/
│   ├── app/               # Next.js App Router pages & API routes
│   ├── components/         # React components
│   ├── db/                 # Database layer (schema, RLS, migrations)
│   └── lib/                # Shared utilities & auth
├── scripts/db/             # Database scripts (seed, reset, migrations)
├── drizzle/                # Drizzle migration journal
├── migrations/             # SQL migrations (including RLS)
├── e2e/                    # Playwright E2E tests
├── public/                 # Static assets
├── infra/                  # Pulumi infrastructure (GCP)
├── docs/                   # Documentation
├── package.json            # Dependencies & scripts
└── Dockerfile              # Production container
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Technical decisions, tech stack, and project structure
- [Authentication](docs/AUTHENTICATION.md) — Better Auth setup, RLS, and session management
- [Conventions](docs/CONVENTIONS.md) — Coding standards, type patterns, and API guidelines
- [Testing](docs/TESTING.md) — Vitest, Playwright, and testing strategy
- [Infrastructure](docs/INFRASTRUCTURE.md) — Pulumi & GCP setup guide
- [CI/CD](docs/CI-CD.md) — GitHub Actions workflows and setup

## License

Private project
