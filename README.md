# History Portal

A personal full-stack TypeScript web application for exploring historical timelines and maps, hosted on GCP.

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Frontend:** Next.js 16 (App Router)
- **Database:** Neon (Serverless PostgreSQL) + Drizzle ORM
- **Auth:** Better Auth
- **Infrastructure:** Pulumi + GCP Cloud Run
- **AI:** Vertex AI (Gemini) for text summarization

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (optional, for offline database)

### Setup

```bash
# Clone and install dependencies
git clone <repo-url>
cd history-portal
pnpm install
```

#### Option A: Neon Dev Branch (Recommended)

Uses a personal branch on the staging Neon project (requires staging deployed):

```bash
# One-time: Create your dev branch and get connection string
pnpm db:setup:neon-dev

# Add the output DATABASE_URL to packages/db/.env.local
# Then reset and run migrations
pnpm db:reset:local
```

#### Option B: Docker PostgreSQL (Offline)

For offline development or full database isolation:

```bash
# Start local PostgreSQL
pnpm db:start

# Reset and run migrations
pnpm db:reset:local
```

#### Start Development

```bash
pnpm dev:portal
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Common Commands

```bash
pnpm dev:portal            # Start Next.js dev server
pnpm check-types           # Type-check all packages
pnpm infra:up:staging      # Deploy to staging
pnpm infra:up:prod         # Deploy to production
```

## Project Structure

```
history-portal/
├── docs/               # Documentation
├── infra/              # Pulumi infrastructure (GCP)
├── packages/
│   ├── db/             # Database schema & migrations
│   ├── portal/         # Next.js web application
│   └── utils/          # Shared utilities
├── package.json        # Root workspace config
├── pnpm-workspace.yaml # Workspace definitions
└── turbo.json          # Turborepo config
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Technical decisions, tech stack, and project structure
- [Authentication](docs/AUTHENTICATION.md) — Better Auth setup, RLS, and session management
- [Conventions](docs/CONVENTIONS.md) — Coding standards, type patterns, and API guidelines
- [Infrastructure](docs/INFRASTRUCTURE.md) — Pulumi & GCP setup guide
- [CI/CD](docs/CI-CD.md) — GitHub Actions workflows and setup

## License

Private project
