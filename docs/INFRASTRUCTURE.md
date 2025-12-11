# Infrastructure Setup Guide

> **Purpose:** This document provides step-by-step instructions for setting up and managing the infrastructure for the history-portal project. It serves as both a reference for AI assistants and a reproducible guide for recreating the setup on other projects.

**Last Updated:** December 11, 2025  
**Project Status:** Initial Setup Complete

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [GCP Project Setup](#3-gcp-project-setup)
4. [Pulumi Setup](#4-pulumi-setup)
5. [Stack Configuration](#5-stack-configuration)
6. [Resources](#6-resources)
7. [Common Commands](#7-common-commands)
8. [Troubleshooting](#8-troubleshooting)
9. [CI/CD Integration](#9-cicd-integration)

---

## 1. Overview

### Architecture

```
Local Development          Cloud Infrastructure
─────────────────          ────────────────────

┌─────────────────┐        ┌─────────────────────────────────┐
│  pnpm dev       │        │         GCP Project             │
│  (Next.js)      │        │   ┌─────────────────────────┐   │
└────────┬────────┘        │   │      Cloud Run          │   │
         │                 │   │   (Next.js Container)   │   │
         ▼                 │   └───────────┬─────────────┘   │
┌─────────────────┐        │               │                 │
│  Docker         │        │   ┌───────────▼─────────────┐   │
│  (PostgreSQL)   │        │   │      Neon Database      │   │
└─────────────────┘        │   │   (Serverless Postgres) │   │
                           │   └─────────────────────────┘   │
                           └─────────────────────────────────┘
```

### Environment Strategy

| Environment | Pulumi Stack | Neon Branch | Purpose                     |
| ----------- | ------------ | ----------- | --------------------------- |
| Local       | (none)       | (Docker)    | Development with hot reload |
| Staging     | `staging`    | `staging`   | Pre-production testing      |
| Production  | `prod`       | `main`      | Live application            |
| CI/CD       | (ephemeral)  | `test-*`    | Automated testing           |

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

Pulumi is installed as a **local dependency** in the monorepo root (not globally):

```json
// package.json (root)
{
  "devDependencies": {
    "@pulumi/pulumi": "^3"
  }
}
```

This approach:

- Pins the version for reproducibility
- Works seamlessly in CI/CD
- Avoids global install conflicts between projects

---

## 3. GCP Project Setup

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
  cloudbuild.googleapis.com
```

### Step 5: Set Up Billing Alerts (Recommended)

1. Go to [console.cloud.google.com/billing/budgets](https://console.cloud.google.com/billing/budgets)
2. Create a budget alert (e.g., $10/month)
3. Configure email notifications

---

## 4. Pulumi Setup

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

From the monorepo root:

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

#### Pulumi.yaml

```yaml
name: history-portal
description: A minimal Google Cloud TypeScript Pulumi program
runtime:
  name: nodejs
  options:
    packagemanager: pnpm
config:
  pulumi:tags:
    value:
      pulumi:template: gcp-typescript
```

#### Pulumi.staging.yaml

```yaml
config:
  gcp:project: history-portal # Your GCP Project ID
  gcp:region: europe-west1 # Optional: default region
```

#### package.json

```json
{
  "name": "history-portal",
  "main": "index.ts",
  "devDependencies": {
    "@types/node": "^18",
    "typescript": "^5.0.0"
  },
  "dependencies": {
    "@pulumi/gcp": "^9.0.0",
    "@pulumi/pulumi": "^3.113.0"
  }
}
```

---

## 5. Stack Configuration

### Current Stacks

| Stack     | Status     | Purpose                    |
| --------- | ---------- | -------------------------- |
| `staging` | ✅ Created | Pre-production environment |
| `prod`    | 🔜 Planned | Production environment     |

### Creating New Stacks

```bash
# From monorepo root
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
pnpm pulumi config set gcp:region europe-west1

# Set secret (encrypted)
pnpm pulumi config set --secret betterAuthSecret "your-secret-value"

# View config
pnpm pulumi config
```

---

## 6. Resources

### Current Resources

The initial template creates a sample GCS bucket. This will be replaced with actual resources.

```typescript
// infra/index.ts (initial template)
import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

// Create a GCP resource (Storage Bucket)
const bucket = new gcp.storage.Bucket("my-bucket", {
  location: "US",
});

// Export the DNS name of the bucket
export const bucketName = bucket.url;
```

### Planned Resources

| Resource          | Provider       | Purpose                   | Status     |
| ----------------- | -------------- | ------------------------- | ---------- |
| Cloud Run Service | `@pulumi/gcp`  | Next.js container hosting | 🔜 Planned |
| Artifact Registry | `@pulumi/gcp`  | Docker image storage      | 🔜 Planned |
| Secret Manager    | `@pulumi/gcp`  | Secrets storage           | 🔜 Planned |
| Neon Database     | `@pulumi/neon` | PostgreSQL database       | 🔜 Planned |
| Neon Branches     | `@pulumi/neon` | Staging/test branches     | 🔜 Planned |

### Adding Neon Provider (Future)

```bash
cd infra
pnpm add @pulumi/neon
```

---

## 7. Common Commands

### Root-Level Commands (Recommended)

Run from monorepo root using npm scripts:

```bash
# Preview changes
pnpm infra:preview

# Deploy infrastructure
pnpm infra:up

# Destroy infrastructure
pnpm infra:destroy

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

## 8. Troubleshooting

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

## 9. CI/CD Integration

### GitHub Actions Setup (Future)

#### Required Secrets

| Secret                | Description               |
| --------------------- | ------------------------- |
| `GCP_PROJECT_ID`      | Your GCP project ID       |
| `GCP_SA_KEY`          | Service account JSON key  |
| `PULUMI_ACCESS_TOKEN` | Pulumi Cloud access token |

#### Service Account for CI/CD

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create key
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### Example Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main, staging]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

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

## Appendix: Quick Reference

### File Locations

| File                        | Purpose                 |
| --------------------------- | ----------------------- |
| `infra/Pulumi.yaml`         | Project configuration   |
| `infra/Pulumi.staging.yaml` | Staging stack config    |
| `infra/Pulumi.prod.yaml`    | Production stack config |
| `infra/index.ts`            | Infrastructure code     |
| `infra/package.json`        | Infra dependencies      |

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
**Last Updated:** December 11, 2025  
**Version:** 1.0.0
