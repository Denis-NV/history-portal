# Infrastructure Setup Guide

> **Purpose:** This document provides step-by-step instructions for setting up and managing the infrastructure for the history-portal project. It serves as both a reference for AI assistants and a reproducible guide for recreating the setup on other projects.

**Last Updated:** December 19, 2025  
**Project Status:** Staging Deployed ✅ | Database Connected ✅ | Auth Working ✅

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Local Development](#3-local-development)
4. [GCP Project Setup](#4-gcp-project-setup)
5. [Pulumi Setup](#5-pulumi-setup)
6. [Stack Configuration](#6-stack-configuration)
7. [Resources](#7-resources)
8. [Docker & Cloud Run Deployment](#8-docker--cloud-run-deployment)
9. [Common Commands](#9-common-commands)
10. [Troubleshooting](#10-troubleshooting)
11. [CI/CD Integration](#11-cicd-integration)

---

## 1. Overview

### Architecture

```
Local Development                    Cloud Infrastructure
─────────────────                    ────────────────────

┌─────────────────────────────┐     ┌─────────────────────────────────┐
│  pnpm dev (Next.js)         │     │         GCP Project             │
└────────────┬────────────────┘     │   ┌─────────────────────────┐   │
             │                      │   │      Cloud Run          │   │
             ▼                      │   │   (Next.js Container)   │   │
┌─────────────────────────────┐     │   └───────────┬─────────────┘   │
│  Neon Dev Branch            │     │               │                 │
│  (from staging project)     │     │   ┌───────────▼─────────────┐   │
│                             │     │   │      Neon Database      │   │
│                             │     │   │   (Serverless Postgres) │   │
└─────────────────────────────┘     └─────────────────────────────────┘
```

### Environment Strategy

| Environment | Pulumi Stack | Database                     | Purpose                     |
| ----------- | ------------ | ---------------------------- | --------------------------- |
| Local       | (none)       | Neon `dev-{username}` branch | Development with hot reload |
| Staging     | `staging`    | Neon Project (staging)       | Pre-production testing      |
| Production  | `prod`       | Neon Project (prod)          | Live application            |
| CI/CD       | (ephemeral)  | Neon Branch (from staging)   | Automated testing           |

> **Note:** Staging and Production use separate Neon projects for complete isolation. CI/CD tests and local Neon development use branches from the staging project.

---

## 2. Prerequisites

### Required Tools

```bash
# macOS installation
brew install google-cloud-sdk   # GCP CLI
brew install node               # Node.js (or use volta/nvm)

# Verify installations
gcloud --version
node --version
pnpm --version
```

### Pulumi CLI

Pulumi is used for infrastructure management in the `infra/` directory. Install its dependencies separately:

```bash
cd infra
pnpm install
```

---

## 3. Local Development

Local development uses a personal Neon branch from the staging project.

### Setting Up Your Dev Branch

```bash
# One-time setup: Create a personal dev branch on staging
pnpm db:setup:neon-dev

# Output: DATABASE_URL connection string
# Add this to .env.local
```

The script:

1. Gets the staging Neon project ID from Pulumi
2. Creates a `dev-{username}` branch (e.g., `dev-denis`) if it doesn't exist
3. Outputs the connection string for your `.env.local`

**Benefits:**

- Same Neon branching model as CI/CD
- Test branch-based migrations locally
- Each developer gets their own isolated branch

### Resetting the Database

```bash
pnpm db:reset:local
```

This clears all schemas and re-runs migrations for a clean slate.

### Environment Configuration

`.env.local` is the single source of truth for `DATABASE_URL`:

```bash
# Run `pnpm db:setup:neon-dev` to get this connection string
DATABASE_URL=postgresql://...@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require
```

Next.js loads `.env.local` automatically at startup.

---

## 4. GCP Project Setup

### Step 1: Create GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click project dropdown (top left) → **New Project**
3. Name: `history-portal` (or your preferred name)
4. Note the **Project ID** (e.g., `history-portal-123456`)

### Step 2: Enable Billing

1. Go to [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
2. Link a billing account to your project
3. Add a payment method (credit card)

> **Note:** You won't be charged if you stay within free tiers. New accounts get $300 free credits for 90 days.

### Step 3: Authenticate gcloud CLI

```bash
# Login to your Google account
gcloud auth login

# Set application default credentials (used by Pulumi)
gcloud auth application-default login

# Set your default project
gcloud config set project YOUR_PROJECT_ID

# Fix quota project warning (if it appears)
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

### Step 4: Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  compute.googleapis.com  # Silences Pulumi GCP provider warning
```

### Step 5: Set Up Billing Alerts (Recommended)

1. Go to [console.cloud.google.com/billing/budgets](https://console.cloud.google.com/billing/budgets)
2. Create a budget alert (e.g., $10/month)
3. Configure email notifications

---

## 5. Pulumi Setup

### Project Structure

```
infra/
├── Pulumi.yaml             # Project configuration
├── Pulumi.staging.yaml     # Staging stack config
├── Pulumi.prod.yaml        # Production stack config (future)
├── index.ts                # Main infrastructure code
├── package.json            # Infra-specific dependencies
└── tsconfig.json           # TypeScript config
```

### Step 1: Initialize Pulumi Project

From the project root:

```bash
# Create infra directory and initialize
mkdir infra && cd infra
pnpm pulumi new gcp-typescript

# Or if infra folder already exists:
pnpm pulumi new gcp-typescript --force
```

During setup, you'll be prompted for:

- **Project name:** `history-portal`
- **Project description:** Your description
- **Stack name:** `staging` (start with staging)
- **GCP Project:** Your GCP Project ID

### Step 2: Pulumi Account

Pulumi uses a backend to store state. Options:

1. **Pulumi Cloud (Default):** Free for individual use

   - Sign up at [app.pulumi.com](https://app.pulumi.com)
   - Run `pulumi login`

2. **Local backend:** For offline/private use

   ```bash
   pulumi login --local
   ```

3. **Cloud Storage:** For team use without Pulumi Cloud
   ```bash
   pulumi login gs://your-bucket-name
   ```

### Step 3: Install Dependencies

```bash
cd infra
pnpm install
```

### Configuration Files

See the actual configuration files for current values:

| File                                                      | Purpose                                       |
| --------------------------------------------------------- | --------------------------------------------- |
| [infra/Pulumi.yaml](../infra/Pulumi.yaml)                 | Project configuration                         |
| [infra/Pulumi.staging.yaml](../infra/Pulumi.staging.yaml) | Staging stack config (includes Neon settings) |
| [infra/package.json](../infra/package.json)               | Infra dependencies                            |
| [infra/index.ts](../infra/index.ts)                       | Main infrastructure code                      |

---

## 6. Stack Configuration

### Current Stacks

| Stack     | Status     | Purpose                    |
| --------- | ---------- | -------------------------- |
| `staging` | ✅ Created | Pre-production environment |
| `prod`    | 🔜 Planned | Production environment     |

### Creating New Stacks

```bash
# From the project root
pnpm pulumi stack init prod

# Or from infra directory
cd infra && pulumi stack init prod
```

### Switching Stacks

```bash
pnpm pulumi stack select staging
pnpm pulumi stack select prod
```

### Stack-Specific Configuration

Set configuration values per stack:

```bash
# Set for current stack
pnpm pulumi config set gcp:region europe-west2

# Set secrets (encrypted)
pnpm pulumi config set --secret betterAuthSecret "$(openssl rand -base64 32)"
pnpm pulumi config set --secret googleClientId "xxx.apps.googleusercontent.com"
pnpm pulumi config set --secret googleClientSecret "GOCSPX-xxx"
pnpm pulumi config set --secret resendApiKey "re_xxx"

# Set non-secret config
pnpm pulumi config set emailFrom "noreply@yourdomain.com"

# Set app URL (required for auth email links)
# After first deploy, get the URL from `pulumi stack output serviceUrl`
pnpm pulumi config set appUrl "https://portal-staging-xxx.run.app"

# View config
pnpm pulumi config
```

> **Note:** `appUrl` is used to set `BETTER_AUTH_URL` for email verification links. The Cloud Run URL hash (e.g., `7qac6lyjqa`) is stable across normal deployments but changes if you destroy and recreate the stack.

> **First Deploy or Destroy/Recreate Workflow:**
>
> 1. Deploy without `appUrl` (or with placeholder) — deployment succeeds but email links won't work
> 2. Get the new URL: `pnpm pulumi stack output serviceUrl`
> 3. Update config: `pnpm pulumi config set appUrl "<new-url>"`
> 4. Re-deploy: `pnpm infra:up:staging`
>
> Once you set up a custom domain, this is no longer needed.

---

## 7. Resources

### Current Resources (Staging)

| Resource          | Name                     | Status      | Purpose                    |
| ----------------- | ------------------------ | ----------- | -------------------------- |
| Artifact Registry | `portal`                 | ✅ Deployed | Docker image storage       |
| Cloud Run Service | `portal-staging`         | ✅ Deployed | Next.js container hosting  |
| IAM Policy        | `allUsers`               | ✅ Deployed | Public access to Cloud Run |
| Neon Project      | `history-portal-staging` | ✅ Deployed | Serverless PostgreSQL 17   |

**Live URL:** https://portal-staging-7qac6lyjqa-nw.a.run.app  
**Health Check:** https://portal-staging-7qac6lyjqa-nw.a.run.app/api/health/db

**Infrastructure Code:** [infra/index.ts](../infra/index.ts)

### Neon Database Configuration

The Neon provider is set up using a locally-generated SDK via Pulumi's terraform-provider bridge:

```
infra/
├── sdks/
│   └── neon/           # Generated Neon SDK (terraform-provider bridge)
└── index.ts            # Neon.Project resource configuration
```

**Neon Stack Configuration** (`Pulumi.staging.yaml`):

```yaml
config:
  app:neonOrgId: org-quiet-wind-18934135
  app:neonRegion: aws-eu-west-2 # London (closest to GCP europe-west2)
  neon:apiKey:
    secure: <encrypted>
```

### Planned Resources

| Resource       | Provider      | Purpose         | Status     |
| -------------- | ------------- | --------------- | ---------- |
| Secret Manager | `@pulumi/gcp` | Secrets storage | 🔜 Planned |

---

## 8. Docker & Cloud Run Deployment

### Configuration Files

| File                                        | Purpose                            |
| ------------------------------------------- | ---------------------------------- |
| [next.config.ts](../next.config.ts)         | Next.js standalone output config   |
| [Dockerfile](../Dockerfile)                 | Multi-stage Docker build           |
| [.dockerignore](../.dockerignore)           | Excludes files from Docker context |

### Key Configuration

**Next.js** requires `output: "standalone"` for Cloud Run deployment, which creates a self-contained build.

**Dockerfile** uses a multi-stage build (deps -> builder -> runner) for a single Next.js project.

### Key Learnings

1. **Public folder location:** In standalone builds, the `public` folder must be copied to the same directory as `server.js` (e.g., `./public`).

2. **Static files location:** Similarly, `.next/static` must be at `./.next/static`.

3. **Runtime secrets & lazy DB clients:** `DATABASE_URL` is injected by Cloud Run at runtime, not available during `next build`. The `@/db` module uses lazy-initialized Proxy wrappers so importing it is safe at build time — the actual Neon connection is only created on first query. See [ARCHITECTURE.md - Lazy Initialization](./ARCHITECTURE.md#lazy-initialization).

### Configure Docker Authentication

Before first deployment, authenticate Docker with Artifact Registry:

```bash
gcloud auth configure-docker europe-west2-docker.pkg.dev --quiet
```

### Deployment Commands

```bash
# Preview changes (specify stack explicitly)
pnpm infra:preview:staging   # or :prod

# Deploy (builds image, pushes to registry, updates Cloud Run)
pnpm infra:up:staging        # or :prod

# View outputs (including URL)
pnpm pulumi stack output
```

### Viewing Logs

```bash
# Stream logs
gcloud run services logs read portal-staging --region=europe-west2 --tail=50

# Or via Cloud Console
# https://console.cloud.google.com/run/detail/europe-west2/portal-staging/logs
```

---

## 9. Common Commands

### Root-Level Commands (Recommended)

Run from the project root using npm scripts:

```bash
# Stack-specific commands (explicit stack selection)
pnpm infra:preview:staging   # Preview staging
pnpm infra:up:staging        # Deploy staging
pnpm infra:destroy:staging   # Destroy staging

pnpm infra:preview:prod      # Preview production
pnpm infra:up:prod           # Deploy production
pnpm infra:destroy:prod      # Destroy production

# Any pulumi command
pnpm pulumi <command>
pnpm pulumi stack ls
pnpm pulumi config
pnpm pulumi stack output
```

### Direct Pulumi Commands

Run from infra directory:

```bash
cd infra

pulumi preview          # Preview changes
pulumi up               # Deploy
pulumi destroy          # Tear down
pulumi stack ls         # List stacks
pulumi stack output     # View outputs
pulumi refresh          # Sync state with cloud
```

### GCP Commands

```bash
# View enabled APIs
gcloud services list --enabled

# Check current project
gcloud config get-value project

# List Cloud Run services (after deployment)
gcloud run services list

# View logs
gcloud run services logs read SERVICE_NAME
```

---

## 10. Troubleshooting

### Common Issues

#### "Billing account not found"

```
ERROR: Billing must be enabled for activation of service(s)
```

**Solution:** Link a billing account to your GCP project at [console.cloud.google.com/billing](https://console.cloud.google.com/billing)

#### "Quota project mismatch" Warning

```
WARNING: Your active project does not match the quota project
```

**Solution:**

```bash
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

#### "Permission denied" Errors

**Solution:** Re-authenticate:

```bash
gcloud auth login
gcloud auth application-default login
```

#### Pulumi State Issues

```bash
# Refresh state from cloud
pulumi refresh

# Cancel stuck operation
pulumi cancel

# View detailed logs
pulumi up --debug
```

### Useful Diagnostics

```bash
# Check GCP auth
gcloud auth list

# Check current config
gcloud config list

# Check Pulumi state
pnpm pulumi stack --show-urns
```

---

## 11. CI/CD Integration

See [CI-CD.md](./CI-CD.md) for complete GitHub Actions setup instructions.

---

## Appendix: Quick Reference

### File Locations

| File                                                      | Purpose                 |
| --------------------------------------------------------- | ----------------------- |
| [infra/Pulumi.yaml](../infra/Pulumi.yaml)                 | Project configuration   |
| [infra/Pulumi.staging.yaml](../infra/Pulumi.staging.yaml) | Staging stack config    |
| [infra/Pulumi.prod.yaml](../infra/Pulumi.prod.yaml)       | Production stack config |
| [infra/index.ts](../infra/index.ts)                       | Infrastructure code     |
| [infra/package.json](../infra/package.json)               | Infra dependencies      |

### Environment Variables

```bash
# GCP credentials (set by gcloud auth)
GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json

# Pulumi (if using Pulumi Cloud)
PULUMI_ACCESS_TOKEN=pul-xxxxxxxx
```

### Useful Links

- [Pulumi GCP Provider Docs](https://www.pulumi.com/registry/packages/gcp/)
- [Pulumi Neon Provider Docs](https://www.pulumi.com/registry/packages/neon/)
- [GCP Cloud Run Docs](https://cloud.google.com/run/docs)
- [GCP Free Tier](https://cloud.google.com/free)

---

**Document Maintainer:** AI Assistant  
**Last Updated:** December 19, 2025  
**Version:** 1.2.0
