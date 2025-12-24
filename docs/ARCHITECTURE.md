# Personal Project Architecture & Technical Decisions

> **Purpose:** This document captures all architectural decisions, technology choices, and implementation plans for a personal full-stack TypeScript web application hosted on GCP. It serves as context for AI assistants and future reference.

**Last Updated:** December 21, 2025  
**Project Status:** Phase 1 In Progress (Database ✅, Auth ✅)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Technology Stack](#3-technology-stack)
4. [Architecture Diagram](#4-architecture-diagram)
5. [Infrastructure as Code (Pulumi)](#5-infrastructure-as-code-pulumi)
6. [Local Development](#6-local-development)
7. [Database Strategy (Neon)](#7-database-strategy-neon)
8. [Authentication (Better Auth)](#8-authentication-better-auth)
9. [LLM Integration (Vertex AI)](#9-llm-integration-vertex-ai)
10. [Real-time Features](#10-real-time-features)
11. [Phased Rollout Plan](#11-phased-rollout-plan)
12. [Environment Configuration](#12-environment-configuration)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Cost Optimization](#14-cost-optimization)
15. [Future Considerations](#15-future-considerations)

**Related Documents:**

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) — Detailed Pulumi & GCP setup guide

---

## 1. Project Overview

### Description

A personal, non-profit web application with the following core features:

- User authentication and authorization
- Text summarization using LLM (Gemini)
- Real-time chat functionality (future phase)
- Server-Sent Events for LLM response streaming

### Goals

- Learn GCP services and infrastructure
- Build a cost-effective solution using free tiers
- Implement infrastructure as code with TypeScript
- Create a scalable architecture that can grow with the project

### Constraints

- Personal/non-profit project (cost-sensitive)
- Must use GCP as cloud platform
- TypeScript-first approach throughout
- Infrastructure must be reproducible via code

---

## 2. Monorepo Structure

This project uses a **pnpm workspace monorepo** with **Turborepo** for task orchestration.

### Why Monorepo?

- **Shared code** — Common utilities and types across packages
- **Atomic changes** — Single PR can update multiple packages
- **Consistent tooling** — Unified linting, testing, and build processes
- **Simplified dependency management** — Single lockfile, hoisted dependencies

### Directory Structure

```
history-portal/
├── .github/                    # GitHub Actions workflows
├── docs/                       # Project documentation
│   ├── ARCHITECTURE.md         # This file
│   └── INFRASTRUCTURE.md       # Pulumi & GCP setup guide
├── infra/                      # Pulumi infrastructure (NOT a workspace package)
│   ├── Pulumi.yaml             # Pulumi project config
│   ├── Pulumi.staging.yaml     # Staging stack config
│   ├── Pulumi.prod.yaml        # Production stack config (future)
│   ├── index.ts                # Main entry point
│   ├── package.json            # Infra-specific dependencies
│   ├── sdks/neon/              # Generated Neon SDK (terraform-provider)
│   └── tsconfig.json
├── packages/                   # pnpm workspace packages
│   ├── db/                     # Database package
│   │   ├── docker-compose.yml  # Local PostgreSQL
│   │   ├── drizzle.config.ts   # Drizzle Kit configuration
│   │   ├── package.json
│   │   ├── migrations/
│   │   │   └── rls-policies.sql  # RLS functions (manual, idempotent)
│   │   ├── seed/               # Seed data (JSON files)
│   │   │   ├── users.json      # User seed data
│   │   │   └── accounts.json   # Account seed data
│   │   ├── scripts/            # Database scripts
│   │   │   ├── seed.ts         # Seed script
│   │   │   ├── reset-local.ts  # Reset local database
│   │   │   └── ...             # Other scripts
│   │   └── src/
│   │       ├── index.ts        # Re-exports (client, schema, config)
│   │       ├── client.ts       # Drizzle clients (HTTP + WebSocket)
│   │       ├── config.ts       # Connection string configuration
│   │       ├── rls.ts          # withRLS() and withAdminAccess() helpers
│   │       └── schema/
│   │           ├── index.ts    # Schema re-exports
│   │           └── auth.ts     # Better Auth tables (user, session, account, verification)
│   ├── portal/                 # Next.js web application
│   │   ├── src/
│   │   │   ├── proxy.ts        # Route protection (cookie check)
│   │   │   ├── app/            # App Router
│   │   │   │   ├── api/
│   │   │   │   │   ├── auth/[...all]/  # Better Auth API handler
│   │   │   │   │   └── health/db/      # Database health endpoint
│   │   │   │   ├── auth/       # Auth pages
│   │   │   │   │   ├── sign-in/
│   │   │   │   │   ├── sign-up/
│   │   │   │   │   ├── forgot-password/
│   │   │   │   │   └── reset-password/
│   │   │   │   └── timeline/   # Protected route example
│   │   │   ├── components/
│   │   │   │   └── auth/       # Auth form components
│   │   │   │       ├── actions.ts      # Server Actions
│   │   │   │       ├── schemas.ts      # Zod validation schemas
│   │   │   │       ├── sign-in-form.tsx
│   │   │   │       ├── sign-up-form.tsx
│   │   │   │       ├── forgot-password-form.tsx
│   │   │   │       └── reset-password-form.tsx
│   │   │   └── lib/
│   │   │       └── auth/       # Auth configuration
│   │   │           ├── index.tsx       # Better Auth server config
│   │   │           ├── client.ts       # Client-side auth (social login)
│   │   │           ├── session.ts      # getSession(), requireSession()
│   │   │           └── email-template.tsx  # Custom email template
│   │   ├── Dockerfile          # Multi-stage build (includes db package)
│   │   ├── package.json
│   │   └── next.config.ts
│   └── utils/                  # Shared utilities (future)
├── package.json                # Root package.json with workspace scripts
├── pnpm-workspace.yaml         # Workspace package definitions
├── pnpm-lock.yaml              # Single lockfile for all packages
└── turbo.json                  # Turborepo task configuration
```

### Key Configuration Files

See the actual configuration files for current values:

- [package.json](../package.json) — Root workspace scripts and dependencies
- [pnpm-workspace.yaml](../pnpm-workspace.yaml) — Workspace package definitions
- [turbo.json](../turbo.json) — Turborepo task configuration

### Why `infra/` is NOT a Workspace Package

The `infra/` folder is at the root level but not included in `pnpm-workspace.yaml` because:

1. **Different lifecycle** — Pulumi has its own CLI, not pnpm/Turbo tasks
2. **Separate dependencies** — Infra needs `@pulumi/gcp`, apps don't
3. **No exports** — Infrastructure code doesn't export modules for other packages
4. **Industry convention** — Most monorepos place infra at root level

### Common Commands

```bash
# Development
pnpm dev:portal              # Start Next.js dev server
pnpm check-types             # Type-check all packages

# Database (local development)
pnpm db:up                   # Start local PostgreSQL + Neon proxy
pnpm db:down                 # Stop local database
pnpm db:logs                 # View database logs
pnpm db:studio               # Open Drizzle Studio
pnpm db:generate             # Generate migration from schema changes
pnpm db:migrate              # Apply migrations
pnpm db:seed                 # Seed the database
pnpm db:push                 # Push schema directly (dev only)

# Infrastructure (run from root)
pnpm pulumi stack ls         # List Pulumi stacks
pnpm infra:up:staging        # Deploy to staging
pnpm infra:up:prod           # Deploy to production

# Package management
pnpm add <pkg> -F @history-portal/portal  # Add to portal
pnpm add <pkg> -F @history-portal/db      # Add to db
pnpm add <pkg> -w                         # Add to root workspace
```

---

## 3. Technology Stack

### Summary Table

| Layer                | Technology                   | Version | Purpose                                 |
| -------------------- | ---------------------------- | ------- | --------------------------------------- |
| **Monorepo**         | pnpm workspaces              | 10.x    | Package management & workspaces         |
| **Build System**     | Turborepo                    | 2.x     | Task orchestration & caching            |
| **IaC**              | Pulumi                       | 3.x     | Infrastructure as Code (TypeScript)     |
| **Compute**          | Cloud Run                    | -       | Serverless container hosting            |
| **Framework**        | Next.js                      | 16.x    | Full-stack React framework (App Router) |
| **Auth**             | Better Auth                  | Latest  | Authentication library                  |
| **Database**         | Neon                         | -       | Serverless PostgreSQL                   |
| **ORM**              | Drizzle                      | Latest  | TypeScript-first ORM                    |
| **LLM**              | Vertex AI (Gemini 1.5 Flash) | -       | Text summarization                      |
| **Streaming**        | Server-Sent Events (SSE)     | -       | LLM response streaming                  |
| **Real-time**        | Firebase Realtime Database   | -       | Chat (Phase 3)                          |
| **Containerization** | Docker                       | -       | Local dev & Cloud Run deployment        |

### Why These Choices?

#### Pulumi over SST/Terraform CDK

- **Best GCP support** in TypeScript ecosystem
- Mature provider for all GCP services
- Excellent Neon provider for database branching
- Large community with GCP-specific examples
- Native TypeScript (not transpiled)

#### Cloud Run over Vercel

- **Learn GCP** (primary goal)
- Generous free tier (2M requests/month)
- Better WebSocket support (60 min timeout vs Vercel's 30s)
- No vendor lock-in (standard Docker containers)
- More control over infrastructure

#### Next.js with API Routes (No Separate BFF)

- Full-stack in single deployment
- Simplified architecture
- Lower cost (one service)
- API routes sufficient for:
  - Better Auth endpoints
  - LLM integration
  - Business logic
  - Future WebSocket upgrade

#### Neon over Supabase/Cloud SQL

- **Database branching** - killer feature for:
  - Staging environments (branch from prod)
  - Integration tests (ephemeral branches)
  - Safe migrations (test on branch first)
- Generous free tier (512MB, auto-suspend)
- Serverless (scales to zero)
- Excellent Pulumi provider
- Standard PostgreSQL (no lock-in)

#### Firebase Realtime over Custom WebSocket (for Chat)

- No WebSocket server to manage
- Free tier generous (100K connections)
- Direct client-to-client sync
- Can migrate to custom solution later if needed

---

## 4. Architecture Diagram

### Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Production Architecture                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │                    Cloud Run Container                     │    │
│   │  ┌──────────────────────────────────────────────────────┐  │    │
│   │  │                   Next.js 15 App                     │  │    │
│   │  │                                                      │  │    │
│   │  │  ┌─────────────────┐  ┌────────────────────────────┐ │  │    │
│   │  │  │   App Router    │  │      API Routes            │ │  │    │
│   │  │  │   (React)       │  │  ┌──────────────────────┐  │ │  │    │
│   │  │  │                 │  │  │ /api/auth/*          │  │ │  │    │
│   │  │  │  • Pages        │  │  │ (Better Auth)        │  │ │  │    │
│   │  │  │  • Components   │  │  ├──────────────────────┤  │ │  │    │
│   │  │  │  • Layouts      │  │  │ /api/summarize       │  │ │  │    │
│   │  │  │                 │  │  │ (SSE → Vertex AI)    │  │ │  │    │
│   │  │  │                 │  │  ├──────────────────────┤  │ │  │    │
│   │  │  │                 │  │  │ /api/*               │  │ │  │    │
│   │  │  │                 │  │  │ (Business Logic)     │  │ │  │    │
│   │  │  └─────────────────┘  │  └──────────────────────┘  │ │  │    │
│   │  │                       └────────────────────────────┘ │  │    │
│   │  │                                                      │  │    │
│   │  │  ┌─────────────────────────────────────────────────┐ │  │    │
│   │  │  │  Custom Server (Phase 3 - Optional)             │ │  │    │
│   │  │  │  WebSocket support via ws library               │ │  │    │
│   │  │  └─────────────────────────────────────────────────┘ │  │    │
│   │  └──────────────────────────────────────────────────────┘  │    │
│   └────────────────────────────────────────────────────────────┘    │
│              │                    │                    │            │
│              ▼                    ▼                    ▼            │
│   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│   │ Neon PostgreSQL  │ │   Vertex AI      │ │ Firebase Realtime│    │
│   │                  │ │   (Gemini)       │ │ (Phase 3)        │    │
│   │ Branches:        │ │                  │ │                  │    │
│   │ • main (prod)    │ │ Gemini 1.5 Flash │ │ Real-time chat   │    │
│   │ • staging        │ │ for summarization│ │ subscriptions    │    │
│   │ • test-* (CI/CD) │ │                  │ │                  │    │
│   └──────────────────┘ └──────────────────┘ └──────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Local Development Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Local Development Setup                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Developer Machine                        │   │
│   │                                                             │   │
│   │   ┌─────────────────────┐   ┌─────────────────────────────┐ │   │
│   │   │   Docker Compose    │   │      pnpm dev               │ │   │
│   │   │                     │   │                             │ │   │
│   │   │   ┌─────────────┐   │   │   Next.js Dev Server        │ │   │
│   │   │   │  PostgreSQL │   │   │   http://localhost:3000     │ │   │
│   │   │   │  :5432      │◄──┼───│                             │ │   │
│   │   │   └─────────────┘   │   │   • Hot reload              │ │   │
│   │   │                     │   │   • API routes              │ │   │
│   │   │   ┌─────────────┐   │   │   • Better Auth             │ │   │
│   │   │   │  Firebase   │   │   │                             │ │   │
│   │   │   │  Emulator   │◄──┼───│   (Phase 3)                 │ │   │
│   │   │   │  :9000      │   │   │                             │ │   │
│   │   │   └─────────────┘   │   └─────────────────────────────┘ │   │
│   │   │                     │                                   │   │
│   │   └─────────────────────┘                                   │   │
│   │                                                             │   │
│   │   Environment Variables:                                    │   │
│   │   DATABASE_URL=postgresql://postgres:postgres@localhost:5432│   │
│   │   VERTEX_AI_* (use real GCP credentials or mock)            │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Environment Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Environment Strategy                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Pulumi Stacks              Neon Projects (Isolated)               │
│   ─────────────              ────────────────────────               │
│                                                                     │
│   (local)                   ┌─────────────────┐                     │
│   Docker Compose  ────────► │ PostgreSQL 17   │  (local Docker)     │
│   pnpm db:up                │                 │                     │
│                             └─────────────────┘                     │
│                                                                     │
│   ┌─────────────┐           ┌─────────────────────────────┐         │
│   │   staging   │──────────►│ history-portal-staging      │ ✅      │
│   └─────────────┘           │ (Neon Project - isolated)   │         │
│                             │                             │         │
│                             │  ┌───────────────────────┐  │         │
│   CI/CD Pipeline            │  │ test-* branches       │  │         │
│   (ephemeral)  ───────────► │  │ (ephemeral, from      │  │         │
│                             │  │  staging branch)      │  │         │
│                             │  └───────────────────────┘  │         │
│                             └─────────────────────────────┘         │
│                                                                     │
│   ┌─────────────┐           ┌─────────────────────────────┐         │
│   │    prod     │──────────►│ history-portal-prod         │ 🔜      │
│   └─────────────┘           │ (Neon Project - isolated)   │         │
│                             └─────────────────────────────┘         │
│                                                                     │
│   Note: Staging and Prod use SEPARATE Neon projects for complete    │
│   isolation. CI/CD uses ephemeral BRANCHES within the staging       │
│   project for cost efficiency.                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Infrastructure as Code (Pulumi)

### Project Structure

```
infra/
├── Pulumi.yaml                 # Project configuration
├── Pulumi.staging.yaml         # Staging stack config (Neon + GCP)
├── Pulumi.prod.yaml            # Production stack config (future)
├── index.ts                    # Main infrastructure code
├── package.json                # Infra dependencies
├── tsconfig.json
└── sdks/
    └── neon/                   # Generated Neon SDK (terraform-provider bridge)
```

> **Note:** The Neon SDK is generated locally using `pulumi package gen-sdk` with the terraform-provider bridge. See the README in `infra/sdks/neon/` for details.

### Key Pulumi Resources

#### Cloud Run Service

```typescript
// infra/cloudrun.ts
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export function createCloudRunService(
  name: string,
  image: string,
  envVars: Record<string, pulumi.Input<string>>
) {
  return new gcp.cloudrun.Service(name, {
    location: "europe-west2", // London region
    template: {
      spec: {
        containers: [
          {
            image,
            envs: Object.entries(envVars).map(([name, value]) => ({
              name,
              value,
            })),
            resources: {
              limits: {
                memory: "512Mi",
                cpu: "1",
              },
            },
          },
        ],
        containerConcurrency: 80,
        timeoutSeconds: 300,
      },
      metadata: {
        annotations: {
          "autoscaling.knative.dev/minScale": "0",
          "autoscaling.knative.dev/maxScale": "10",
        },
      },
    },
    traffics: [
      {
        percent: 100,
        latestRevision: true,
      },
    ],
  });
}
```

#### Neon Database with Branching

```typescript
// infra/database.ts
import * as neon from "@pulumi/neon";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const environment = pulumi.getStack();

export function createDatabase() {
  // Create or reference the Neon project
  const project = new neon.Project("main", {
    name: `myapp-${environment}`,
  });

  // Main branch (production data)
  const mainBranch = new neon.Branch("main", {
    projectId: project.id,
    name: "main",
  });

  // Environment-specific branch
  const envBranch =
    environment !== "prod"
      ? new neon.Branch(environment, {
          projectId: project.id,
          parentId: mainBranch.id,
          name: environment,
        })
      : mainBranch;

  // Database
  const database = new neon.Database("app", {
    projectId: project.id,
    branchId: envBranch.id,
    name: "app",
    ownerName: "neondb_owner",
  });

  return {
    project,
    branch: envBranch,
    database,
    connectionString: pulumi.interpolate`postgresql://neondb_owner:${project.defaultBranchPassword}@${envBranch.host}/app?sslmode=require`,
  };
}
```

### Pulumi Commands Reference

```bash
# Initialize a new stack
pulumi stack init dev

# Deploy infrastructure
pulumi up

# Preview changes
pulumi preview

# Destroy infrastructure
pulumi destroy

# Switch stacks
pulumi stack select prod

# View outputs
pulumi stack output

# Create ephemeral test branch (CI/CD)
pulumi up --stack test-$CI_RUN_ID --yes
pulumi destroy --stack test-$CI_RUN_ID --yes
```

---

## 6. Local Development

### Docker Compose Configuration

The database package includes a Docker Compose setup for local development.

See: [packages/db/docker-compose.yml](../packages/db/docker-compose.yml)

Key components:

- **PostgreSQL 17** — Local database on port 5432

> **Note:** The Neon HTTP Proxy container is still in docker-compose.yml but is not used. Local development uses the standard `pg` driver for simplicity and reliability. The Neon serverless driver is only used in staging/production.

### Development Workflow

```bash
# Start local database
pnpm db:up

# Run Next.js development server
pnpm dev:portal

# Open Drizzle Studio (database browser)
pnpm db:studio

# Run database migrations
pnpm db:migrate

# Generate Drizzle migrations from schema changes
pnpm db:generate

# Stop local database
pnpm db:down
```

### Database Client Configuration

The `@history-portal/db` package exports pre-configured Drizzle clients.

See: [packages/db/src/client.ts](../packages/db/src/client.ts)

Key exports:

- **`db`** — Primary database client
- **`dbPool`** — Pooled client for transactions

#### Driver Selection

The client auto-detects the environment and uses the appropriate driver:

| Environment            | Driver                     | Why                                              |
| ---------------------- | -------------------------- | ------------------------------------------------ |
| **Local**              | `pg` (node-postgres)       | Direct TCP connection, simpler and more reliable |
| **Staging/Production** | `@neondatabase/serverless` | Optimized for serverless (HTTP + WebSocket)      |

> **Trade-off:** Local development cannot use Neon database branching, but gains simplicity. For branch-based testing, use Neon's staging environment or CI integration with ephemeral branches.

### Environment Files

```bash
# packages/db/.env.local (single source of truth for DATABASE_URL)
# Not needed for local Docker! The db package has sensible defaults.
# Only set DATABASE_URL if you want to connect to a remote Neon database.

# DATABASE_URL=postgres://user:pass@ep-xxx.aws-eu-west-2.neon.tech/dbname
```

> **Note:** The portal package loads `DATABASE_URL` from `packages/db/.env.local` via `next.config.ts`.

**Default Local Connection:**

```
postgres://postgres:postgres@db.localtest.me:5432/history_portal
```

> **Note:** We use `db.localtest.me` instead of `localhost` because it resolves to `127.0.0.1` but allows the Neon HTTP proxy hostname matching to work correctly.

---

## 7. Database Strategy (Neon)

### Current Implementation

The database layer is fully implemented with:

| Component                | Status | Description                      |
| ------------------------ | ------ | -------------------------------- |
| Local Docker             | ✅     | PostgreSQL 17                    |
| Drizzle ORM              | ✅     | v0.38.3 with snake_case naming   |
| @neondatabase/serverless | ✅     | v0.10.4 (staging/prod only)      |
| pg (node-postgres)       | ✅     | Local development driver         |
| Neon Staging             | ✅     | `history-portal-staging` project |
| Health Endpoint          | ✅     | `/api/health/db`                 |

### Package Structure

See: [packages/db/](../packages/db/)

| File                                                      | Purpose                                      |
| --------------------------------------------------------- | -------------------------------------------- |
| [docker-compose.yml](../packages/db/docker-compose.yml)   | Local PostgreSQL                             |
| [drizzle.config.ts](../packages/db/drizzle.config.ts)     | Drizzle Kit configuration                    |
| [src/index.ts](../packages/db/src/index.ts)               | Re-exports: db, dbPool, schema, config       |
| [src/client.ts](../packages/db/src/client.ts)             | Drizzle clients (HTTP + WebSocket)           |
| [src/config.ts](../packages/db/src/config.ts)             | Connection string + isLocal detection        |
| [src/schema/index.ts](../packages/db/src/schema/index.ts) | Database schema (empty, awaiting BetterAuth) |

### Schema Management with Drizzle

> **Note:** The schema file is currently empty, awaiting BetterAuth integration. Below is an example of what it will contain:

```typescript
// packages/db/src/schema/index.ts (planned)
import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

// Better Auth required tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Application-specific tables
export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  inputText: text("input_text").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Row-Level Security (RLS)

> **Note:** RLS is a planned feature. Below is an example migration:

```sql
-- migrations/0002_enable_rls.sql (planned)

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = current_setting('app.current_user_id')::uuid);

-- Summaries policy
CREATE POLICY summaries_select_own ON summaries
  FOR SELECT USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY summaries_insert_own ON summaries
  FOR INSERT WITH CHECK (user_id = current_setting('app.current_user_id')::uuid);
```

### Integration Testing with Ephemeral Branches

> **Note:** Ephemeral branch testing is a planned CI/CD feature. Below is an example implementation:

```typescript
// scripts/create-test-branch.ts (planned)
import { Neon } from "@neondatabase/serverless";

async function createTestBranch(runId: string) {
  const neon = new Neon({ apiKey: process.env.NEON_API_KEY });

  const branch = await neon.branches.create({
    projectId: process.env.NEON_PROJECT_ID,
    parentId: process.env.NEON_MAIN_BRANCH_ID,
    name: `test-${runId}`,
  });

  return branch.connectionString;
}

async function deleteTestBranch(runId: string) {
  const neon = new Neon({ apiKey: process.env.NEON_API_KEY });

  await neon.branches.delete({
    projectId: process.env.NEON_PROJECT_ID,
    branchId: `test-${runId}`,
  });
}
```

---

## 8. Authentication (Better Auth)

> **Note:** Better Auth integration is planned for Phase 1. Below are example implementations.

### Configuration

```typescript
// src/lib/auth.ts (planned)
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },

  advanced: {
    generateId: () => crypto.randomUUID(),
  },
});

export type Session = typeof auth.$Infer.Session;
```

### API Route Handler

```typescript
// src/app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### Client-Side Hook

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

// No baseURL needed - uses relative URLs which resolve to current host
export const authClient = createAuthClient();

export const { useSession, signIn, signOut, signUp } = authClient;
```

### Setting RLS Context

```typescript
// src/lib/db-with-rls.ts (planned)
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getDbWithRLS() {
  const session = await auth.api.getSession({
    headers: headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Set RLS context
  await db.execute(
    `SELECT set_config('app.current_user_id', '${session.user.id}', true)`
  );

  return { db, user: session.user };
}
```

---

## 9. LLM Integration (Vertex AI)

> **Note:** Vertex AI integration is planned for Phase 2. Below are example implementations.

### Client Configuration

```typescript
// src/lib/vertex-ai.ts (planned)
import { VertexAI } from "@google-cloud/vertexai";

let vertexAI: VertexAI | null = null;

export function getVertexAI() {
  if (!vertexAI) {
    vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID!,
      location: process.env.GCP_LOCATION || "us-central1",
    });
  }
  return vertexAI;
}

export function getGeminiModel() {
  return getVertexAI().getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.7,
    },
  });
}
```

### SSE Streaming Endpoint

```typescript
// src/app/api/summarize/route.ts (planned)
import { getGeminiModel } from "@/lib/vertex-ai";
import { getDbWithRLS } from "@/lib/db-with-rls";
import { summaries } from "@/db/schema";

export async function POST(req: Request) {
  const { db, user } = await getDbWithRLS();
  const { text } = await req.json();

  if (!text || typeof text !== "string") {
    return Response.json({ error: "Text is required" }, { status: 400 });
  }

  const model = getGeminiModel();
  const prompt = `Summarize the following text concisely:\n\n${text}`;

  const result = await model.generateContentStream(prompt);

  let fullSummary = "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullSummary += chunkText;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`)
          );
        }

        // Save to database after streaming completes
        await db.insert(summaries).values({
          userId: user.id,
          inputText: text,
          summary: fullSummary,
        });

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Client-Side SSE Consumer

```typescript
// src/hooks/use-summarize.ts (planned)
import { useState, useCallback } from "react";

export function useSummarize() {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = useCallback(async (text: string) => {
    setIsLoading(true);
    setSummary("");
    setError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Failed to summarize");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const { text } = JSON.parse(data);
              setSummary((prev) => prev + text);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { summary, isLoading, error, summarize };
}
```

---

## 10. Real-time Features

> **Note:** Real-time features are planned for Phase 3. Below are example implementations.

### Phase 3: Firebase Realtime Database

#### Configuration

```typescript
// src/lib/firebase.ts (planned)
import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const realtimeDb = getDatabase(app);
```

#### Chat Hook

```typescript
// src/hooks/use-chat.ts (planned)
import { useEffect, useState, useCallback } from "react";
import {
  ref,
  push,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useSession } from "@/lib/auth-client";

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
}

export function useChat(roomId: string) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const messagesRef = query(
      ref(realtimeDb, `chats/${roomId}/messages`),
      orderByChild("timestamp"),
      limitToLast(100)
    );

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([id, msg]) => ({
          id,
          ...(msg as Omit<Message, "id">),
        }));
        setMessages(messageList);
      }
      setIsLoading(false);
    });

    return () => off(messagesRef);
  }, [roomId]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!session?.user) return;

      const messagesRef = ref(realtimeDb, `chats/${roomId}/messages`);
      await push(messagesRef, {
        text,
        userId: session.user.id,
        userName: session.user.name || session.user.email,
        timestamp: Date.now(),
      });
    },
    [roomId, session]
  );

  return { messages, isLoading, sendMessage };
}
```

### Alternative: Custom WebSocket (If Needed Later)

```typescript
// server.ts (planned - custom server with WebSocket support)
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

interface Client {
  ws: WebSocket;
  userId: string;
  rooms: Set<string>;
}

const clients = new Map<string, Client>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res, parse(req.url!, true));
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    const userId = authenticateWebSocket(req); // Validate JWT from query param
    if (!userId) {
      ws.close(1008, "Unauthorized");
      return;
    }

    const client: Client = { ws, userId, rooms: new Set() };
    clients.set(userId, client);

    // Keep-alive ping every 30 seconds
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000);

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      handleMessage(client, message);
    });

    ws.on("close", () => {
      clearInterval(pingInterval);
      clients.delete(userId);
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port);
});

function handleMessage(client: Client, message: any) {
  switch (message.type) {
    case "join":
      client.rooms.add(message.roomId);
      break;
    case "leave":
      client.rooms.delete(message.roomId);
      break;
    case "chat":
      broadcastToRoom(message.roomId, {
        type: "chat",
        userId: client.userId,
        text: message.text,
        timestamp: Date.now(),
      });
      break;
  }
}

function broadcastToRoom(roomId: string, message: any) {
  for (const client of clients.values()) {
    if (client.rooms.has(roomId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}
```

---

## 11. Phased Rollout Plan

### Phase 1: Foundation 🟡 (In Progress)

**Goal:** Basic app with authentication and database

**Deliverables:**

- [x] Next.js 16 project setup (App Router)
- [ ] Better Auth integration
- [x] Drizzle ORM + Neon connection
- [x] Docker Compose for local development
- [x] Pulumi infrastructure (Cloud Run + Neon)
- [ ] Basic CI/CD with GitHub Actions
- [x] Staging environment deployed
- [ ] Production environment

**Infrastructure:**

```
Cloud Run (Next.js) ──► Neon PostgreSQL (staging)
        │
        └── DATABASE_URL injected via Pulumi
```

**Completed:**

- Local development with PostgreSQL 17 + Neon HTTP Proxy
- `@history-portal/db` package with Drizzle ORM
- Portal integration with `@history-portal/db`
- Neon staging project via Pulumi (terraform-provider bridge)
- Health check endpoint: `/api/health/db`

**Estimated Time:** 1-2 weeks

---

### Phase 2: LLM Integration

**Goal:** Add text summarization with Gemini

**Deliverables:**

- [ ] Vertex AI client setup
- [ ] SSE streaming endpoint
- [ ] Summary history storage
- [ ] Rate limiting
- [ ] Error handling and retries

**Infrastructure:**

```
Cloud Run (Next.js) ──► Neon PostgreSQL
        │
        └──► Vertex AI (Gemini)
```

**Estimated Time:** 1 week

---

### Phase 3: Real-time Features

**Goal:** Add chat functionality

**Deliverables:**

- [ ] Firebase Realtime Database setup
- [ ] Chat room functionality
- [ ] User presence indicators
- [ ] Message notifications
- [ ] Firebase emulator for local dev

**Infrastructure:**

```
Cloud Run (Next.js) ──► Neon PostgreSQL
        │
        ├──► Vertex AI (Gemini)
        │
        └──► Firebase Realtime Database
```

**Estimated Time:** 1-2 weeks

---

### Phase 4: Enhancements (Future)

**Potential features:**

- Push notifications (Firebase Cloud Messaging)
- File uploads (Cloud Storage)
- Background jobs (Cloud Tasks)
- Full-text search (Typesense or Algolia)
- Analytics (BigQuery)

---

## 12. Environment Configuration

### Environment Variables by Context

| Variable                         | Local           | Staging             | Prod             | Description           |
| -------------------------------- | --------------- | ------------------- | ---------------- | --------------------- |
| `DATABASE_URL`                   | Docker Postgres | Neon staging branch | Neon main branch | PostgreSQL connection |
| `BETTER_AUTH_SECRET`             | dev-secret      | Secret Manager      | Secret Manager   | Auth encryption key   |
| `BETTER_AUTH_URL`                | localhost:3000  | staging URL         | prod URL         | Auth callback URL     |
| `GCP_PROJECT_ID`                 | -               | project-id          | project-id       | GCP project           |
| `GCP_LOCATION`                   | -               | us-central1         | us-central1      | Vertex AI region      |
| `GOOGLE_APPLICATION_CREDENTIALS` | local file      | Cloud Run auto      | Cloud Run auto   | Service account       |
| `NEXT_PUBLIC_FIREBASE_*`         | Emulator        | Firebase staging    | Firebase prod    | Firebase config       |

### Secret Management with Pulumi

> **Note:** Secret Manager integration is planned. Currently, secrets are passed directly as environment variables via Pulumi.

```typescript
// infra/secrets.ts (planned)
import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";

export function createSecrets(neonConnectionString: pulumi.Output<string>) {
  const config = new pulumi.Config();

  const betterAuthSecret = new gcp.secretmanager.Secret("better-auth-secret", {
    secretId: "better-auth-secret",
    replication: { automatic: {} },
  });

  new gcp.secretmanager.SecretVersion("better-auth-secret-version", {
    secret: betterAuthSecret.id,
    secretData: config.requireSecret("betterAuthSecret"),
  });

  const databaseUrl = new gcp.secretmanager.Secret("database-url", {
    secretId: "database-url",
    replication: { automatic: {} },
  });

  new gcp.secretmanager.SecretVersion("database-url-version", {
    secret: databaseUrl.id,
    secretData: neonConnectionString,
  });

  return { betterAuthSecret, databaseUrl };
}
```

---

## 13. Deployment Strategy

### Dockerfile

See: [packages/portal/Dockerfile](../packages/portal/Dockerfile)

The Dockerfile uses a multi-stage build optimized for pnpm workspaces:

1. **deps** — Install dependencies with frozen lockfile
2. **builder** — Build the Next.js app (includes `@history-portal/db`)
3. **runner** — Production image with standalone output

Key features:

- Copies workspace packages (`packages/db`) for monorepo builds
- Uses `output: "standalone"` for minimal image size
- Runs as non-root user for security

### GitHub Actions CI/CD

> **Note:** CI/CD is planned. See [CI-CD.md](./CI-CD.md) for setup instructions when implemented.

---

## 14. Cost Optimization

### Free Tier Limits

| Service               | Free Tier                         | Estimated Usage | Stay Free? |
| --------------------- | --------------------------------- | --------------- | ---------- |
| **Cloud Run**         | 2M requests/month, 360K vCPU-sec  | Light usage     | ✅ Yes     |
| **Neon**              | 512MB storage, 0.25 compute units | Small DB        | ✅ Yes     |
| **Vertex AI**         | $300 credit (90 days)             | Moderate        | ⚠️ Monitor |
| **Firebase Realtime** | 1GB storage, 100K connections     | Light chat      | ✅ Yes     |
| **Artifact Registry** | 500MB free                        | 1-2 images      | ✅ Yes     |
| **Secret Manager**    | 6 active secrets free             | ~5 secrets      | ✅ Yes     |

### Cost-Saving Tips

1. **Cloud Run:**

   - Set `minScale: 0` to scale to zero
   - Use `--cpu-throttling` for lower costs
   - Keep container image small

2. **Neon:**

   - Use branching instead of separate projects
   - Delete old test branches automatically

3. **Vertex AI:**

   - Use Gemini 1.5 Flash (cheapest)
   - Implement response caching for repeated queries
   - Set reasonable token limits

4. **General:**
   - Use `europe-west2` (London) for UK-based projects, or check [GCP regions](https://cloud.google.com/compute/docs/regions-zones) for your location
   - Monitor with GCP Billing alerts
   - Review usage monthly

---

## 15. Future Considerations

### Scaling Considerations

When the app grows, consider:

1. **Database:** Neon auto-scales, but monitor compute units
2. **Cloud Run:** Increase `maxScale` as needed
3. **WebSocket:** If Firebase limits hit, migrate to custom WebSocket + Redis
4. **Caching:** Add Redis (Memorystore) for session caching
5. **CDN:** Cloud CDN for static assets

### Additional Features to Consider

- **Push Notifications:** Firebase Cloud Messaging
- **File Uploads:** Cloud Storage with signed URLs
- **Background Jobs:** Cloud Tasks or Cloud Scheduler
- **Search:** Algolia or Typesense
- **Analytics:** BigQuery + Looker Studio
- **Monitoring:** Cloud Monitoring + Error Reporting

### Migration Paths

| From              | To               | When                                 |
| ----------------- | ---------------- | ------------------------------------ |
| Firebase Realtime | Custom WebSocket | Need more control, hitting limits    |
| Neon              | Cloud SQL        | Need compliance, more features       |
| Cloud Run         | GKE              | Need persistent connections at scale |
| Single container  | Microservices    | Team growth, independent scaling     |

---

## Appendix: Quick Reference Commands

```bash
# Local Development
pnpm db:up                        # Start PostgreSQL + Neon proxy
pnpm db:down                      # Stop local database
pnpm dev:portal                   # Start Next.js dev server
pnpm db:studio                    # Open Drizzle Studio
pnpm db:generate                  # Generate migration from schema
pnpm db:migrate                   # Apply migrations
pnpm db:push                      # Push schema directly (dev)

# Pulumi Infrastructure (from root)
pnpm infra:preview:staging        # Preview staging changes
pnpm infra:up:staging             # Deploy to staging
pnpm infra:destroy:staging        # Destroy staging
pnpm pulumi stack output          # View outputs
pnpm pulumi config                # View configuration

# GCP
gcloud auth login                 # Authenticate
gcloud auth application-default login  # Set app credentials
gcloud config set project <id>    # Set project
gcloud run services list          # List Cloud Run services
gcloud run services logs read portal-staging  # View logs

# Health Checks
curl https://portal-staging-7qac6lyjqa-nw.a.run.app/api/health/db
```

---

**Document Maintainer:** AI Assistant  
**Last Updated:** December 15, 2025  
**Version:** 1.1.0
