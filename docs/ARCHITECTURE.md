# Personal Project Architecture & Technical Decisions

> **Purpose:** This document captures all architectural decisions, technology choices, and implementation plans for a personal full-stack TypeScript web application hosted on GCP. It serves as context for AI assistants and future reference.

**Last Updated:** December 3, 2025  
**Project Status:** Planning / Phase 1

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Infrastructure as Code (Pulumi)](#4-infrastructure-as-code-pulumi)
5. [Local Development](#5-local-development)
6. [Database Strategy (Neon)](#6-database-strategy-neon)
7. [Authentication (Better Auth)](#7-authentication-better-auth)
8. [LLM Integration (Vertex AI)](#8-llm-integration-vertex-ai)
9. [Real-time Features](#9-real-time-features)
10. [Phased Rollout Plan](#10-phased-rollout-plan)
11. [Project Structure](#11-project-structure)
12. [Environment Configuration](#12-environment-configuration)
13. [Deployment Strategy](#13-deployment-strategy)
14. [Cost Optimization](#14-cost-optimization)
15. [Future Considerations](#15-future-considerations)

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

## 2. Technology Stack

### Summary Table

| Layer                | Technology                   | Version | Purpose                                 |
| -------------------- | ---------------------------- | ------- | --------------------------------------- |
| **IaC**              | Pulumi                       | Latest  | Infrastructure as Code (TypeScript)     |
| **Compute**          | Cloud Run                    | -       | Serverless container hosting            |
| **Framework**        | Next.js                      | 15.x    | Full-stack React framework (App Router) |
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

## 3. Architecture Diagram

### Production Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Production Architecture                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │                    Cloud Run Container                      │    │
│   │  ┌──────────────────────────────────────────────────────┐  │    │
│   │  │                   Next.js 15 App                      │  │    │
│   │  │                                                       │  │    │
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
│   │  │                                                       │  │    │
│   │  │  ┌─────────────────────────────────────────────────┐ │  │    │
│   │  │  │  Custom Server (Phase 3 - Optional)             │ │  │    │
│   │  │  │  WebSocket support via ws library               │ │  │    │
│   │  │  └─────────────────────────────────────────────────┘ │  │    │
│   │  └──────────────────────────────────────────────────────┘  │    │
│   └────────────────────────────────────────────────────────────┘    │
│              │                    │                    │             │
│              ▼                    ▼                    ▼             │
│   ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐    │
│   │ Neon PostgreSQL  │ │   Vertex AI      │ │ Firebase Realtime│    │
│   │                  │ │   (Gemini)       │ │ (Phase 3)        │    │
│   │ Branches:        │ │                  │ │                  │    │
│   │ • main (prod)    │ │ Gemini 1.5 Flash │ │ Real-time chat   │    │
│   │ • staging        │ │ for summarization│ │ subscriptions    │    │
│   │ • test-* (CI/CD) │ │                  │ │                  │    │
│   └──────────────────┘ └──────────────────┘ └──────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Local Development Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Local Development Setup                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                    Developer Machine                         │   │
│   │                                                              │   │
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
│   │   │                     │                                    │   │
│   │   └─────────────────────┘                                    │   │
│   │                                                              │   │
│   │   Environment Variables:                                     │   │
│   │   DATABASE_URL=postgresql://postgres:postgres@localhost:5432 │   │
│   │   VERTEX_AI_* (use real GCP credentials or mock)             │   │
│   │                                                              │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Multi-Environment Strategy

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Environment Strategy                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Pulumi Stacks              Neon Branches                          │
│   ─────────────              ─────────────                          │
│                                                                      │
│   ┌─────────────┐           ┌─────────────┐                         │
│   │    dev      │──────────►│   dev       │  (developer's cloud)    │
│   └─────────────┘           └─────────────┘                         │
│                                    │                                 │
│   ┌─────────────┐           ┌──────┴──────┐                         │
│   │   staging   │──────────►│   staging   │  (branched from main)   │
│   └─────────────┘           └─────────────┘                         │
│                                    │                                 │
│   ┌─────────────┐           ┌──────┴──────┐                         │
│   │    prod     │──────────►│    main     │  (production)           │
│   └─────────────┘           └─────────────┘                         │
│                                    │                                 │
│   CI/CD Pipeline            ┌──────┴──────┐                         │
│   ──────────────            │  test-*     │  (ephemeral, auto-delete)│
│   Creates ephemeral         └─────────────┘                         │
│   branches for tests                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Infrastructure as Code (Pulumi)

### Project Structure

```
infra/
├── Pulumi.yaml                 # Project configuration
├── Pulumi.dev.yaml             # Dev stack config
├── Pulumi.staging.yaml         # Staging stack config
├── Pulumi.prod.yaml            # Production stack config
├── index.ts                    # Main entry point
├── config.ts                   # Configuration helpers
├── cloudrun.ts                 # Cloud Run service
├── database.ts                 # Neon database & branches
├── secrets.ts                  # Secret Manager
├── iam.ts                      # IAM roles & service accounts
└── outputs.ts                  # Stack outputs
```

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
    location: "europe-west1",
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

## 5. Local Development

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: "3.8"

services:
  db:
    image: postgres:15-alpine
    container_name: myapp-postgres
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  # Firebase emulator for Phase 3 (real-time chat)
  firebase:
    image: andreysenov/firebase-tools
    container_name: myapp-firebase
    command: firebase emulators:start --project demo-myapp --only database
    ports:
      - "4000:4000" # Emulator UI
      - "9000:9000" # Realtime Database
    volumes:
      - ./firebase.json:/home/node/firebase.json
    profiles:
      - realtime # Only start with: docker compose --profile realtime up

volumes:
  postgres_data:
```

### Development Workflow

```bash
# Start local services
docker compose up -d

# Run Next.js development server
pnpm dev

# Run with Firebase emulator (Phase 3)
docker compose --profile realtime up -d

# Run database migrations
pnpm db:migrate

# Generate Drizzle types
pnpm db:generate

# Run tests with ephemeral Neon branch
pnpm test:integration
```

### Environment Files

```bash
# .env.local (local development - DO NOT COMMIT)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
BETTER_AUTH_SECRET=local-dev-secret-change-in-production
BETTER_AUTH_URL=http://localhost:3000

# Vertex AI (use real credentials for LLM features)
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Firebase (Phase 3 - local emulator)
NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://localhost:9000?ns=demo-myapp
```

```bash
# .env.example (template for developers)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
GCP_PROJECT_ID=
GCP_LOCATION=us-central1
GOOGLE_APPLICATION_CREDENTIALS=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
```

---

## 6. Database Strategy (Neon)

### Schema Management with Drizzle

```typescript
// src/db/schema.ts
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

```sql
-- migrations/0002_enable_rls.sql

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

```typescript
// scripts/create-test-branch.ts
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

## 7. Authentication (Better Auth)

### Configuration

```typescript
// src/lib/auth.ts
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

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { useSession, signIn, signOut, signUp } = authClient;
```

### Setting RLS Context

```typescript
// src/lib/db-with-rls.ts
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

## 8. LLM Integration (Vertex AI)

### Client Configuration

```typescript
// src/lib/vertex-ai.ts
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
// src/app/api/summarize/route.ts
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
// src/hooks/use-summarize.ts
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

## 9. Real-time Features

### Phase 3: Firebase Realtime Database

#### Configuration

```typescript
// src/lib/firebase.ts
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
// src/hooks/use-chat.ts
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
// server.ts - Custom server with WebSocket support
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

## 10. Phased Rollout Plan

### Phase 1: Foundation ✅ (Current)

**Goal:** Basic app with authentication and database

**Deliverables:**

- [ ] Next.js 15 project setup (App Router)
- [ ] Better Auth integration
- [ ] Drizzle ORM + Neon connection
- [ ] Docker Compose for local development
- [ ] Pulumi infrastructure (Cloud Run + Neon branches)
- [ ] Basic CI/CD with GitHub Actions
- [ ] Staging and production environments

**Infrastructure:**

```
Cloud Run (Next.js) ──► Neon PostgreSQL
```

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

## 11. Project Structure

```
my-nextjs-app/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint, test, type-check
│       └── deploy.yml             # Deploy to Cloud Run
├── infra/                         # Pulumi infrastructure
│   ├── Pulumi.yaml
│   ├── Pulumi.dev.yaml
│   ├── Pulumi.staging.yaml
│   ├── Pulumi.prod.yaml
│   ├── index.ts
│   ├── cloudrun.ts
│   ├── database.ts
│   └── package.json
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/               # Auth-required routes
│   │   │   ├── dashboard/
│   │   │   └── layout.tsx
│   │   ├── (public)/             # Public routes
│   │   │   ├── login/
│   │   │   └── signup/
│   │   ├── api/
│   │   │   ├── auth/[...all]/    # Better Auth
│   │   │   ├── summarize/        # LLM endpoint
│   │   │   └── health/           # Health check
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                   # Reusable UI components
│   │   └── features/             # Feature-specific components
│   ├── db/
│   │   ├── index.ts              # Drizzle client
│   │   ├── schema.ts             # Database schema
│   │   └── migrations/           # Drizzle migrations
│   ├── hooks/
│   │   ├── use-summarize.ts
│   │   └── use-chat.ts           # Phase 3
│   ├── lib/
│   │   ├── auth.ts               # Better Auth server
│   │   ├── auth-client.ts        # Better Auth client
│   │   ├── db-with-rls.ts        # RLS helper
│   │   ├── vertex-ai.ts          # Vertex AI client
│   │   └── firebase.ts           # Phase 3
│   └── types/
│       └── index.ts
├── scripts/
│   ├── create-test-branch.ts     # CI helper
│   └── init-db.sql               # Docker init
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .env.local                    # Git-ignored
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

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

```typescript
// infra/secrets.ts
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

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1

RUN corepack enable pnpm && pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

env:
  GCP_PROJECT: ${{ secrets.GCP_PROJECT_ID }}
  GCP_REGION: europe-west1
  SERVICE_NAME: myapp

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker
        run: gcloud auth configure-docker ${{ env.GCP_REGION }}-docker.pkg.dev

      - name: Build and push image
        run: |
          docker build -t ${{ env.GCP_REGION }}-docker.pkg.dev/${{ env.GCP_PROJECT }}/myapp/${{ env.SERVICE_NAME }}:${{ github.sha }} .
          docker push ${{ env.GCP_REGION }}-docker.pkg.dev/${{ env.GCP_PROJECT }}/myapp/${{ env.SERVICE_NAME }}:${{ github.sha }}

      - name: Deploy with Pulumi
        uses: pulumi/actions@v4
        with:
          command: up
          stack-name: ${{ github.ref == 'refs/heads/main' && 'prod' || 'staging' }}
          work-dir: ./infra
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
```

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
   - Use `europe-west1` for lower egress costs (if EU-based)
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
docker compose up -d              # Start local services
pnpm dev                          # Start Next.js dev server
pnpm db:migrate                   # Run migrations
pnpm db:generate                  # Generate Drizzle types
pnpm db:studio                    # Open Drizzle Studio

# Pulumi Infrastructure
cd infra
pulumi stack select dev           # Switch to dev stack
pulumi up                         # Deploy infrastructure
pulumi preview                    # Preview changes
pulumi stack output               # View outputs
pulumi destroy                    # Tear down infrastructure

# Docker
docker build -t myapp .           # Build image
docker run -p 3000:3000 myapp     # Run locally

# GCP
gcloud auth login                 # Authenticate
gcloud config set project <id>    # Set project
gcloud run services list          # List Cloud Run services
gcloud run services logs read myapp  # View logs
```

---

**Document Maintainer:** AI Assistant  
**Last Updated:** December 3, 2025  
**Version:** 1.0.0
