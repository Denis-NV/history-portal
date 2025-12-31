# CI/CD Setup Guide

> **Purpose:** This document provides instructions for setting up GitHub Actions workflows for automated testing and deployment.

**Last Updated:** December 19, 2025

---

## Table of Contents

1. [Overview](#1-overview)
2. [Workflows](#2-workflows)
3. [Setup Steps](#3-setup-steps)
4. [Branch Protection](#4-branch-protection)
5. [Future Enhancements](#5-future-enhancements)

---

## 1. Overview

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Pull Request to main                    Push to main              │
│          │                                      │                   │
│          ▼                                      ▼                   │
│   ┌─────────────┐                        ┌─────────────┐            │
│   │   Verify    │                        │   Verify    │            │
│   │  (Lint)     │                        │  (Lint)     │            │
│   └─────────────┘                        └──────┬──────┘            │
│          │                                      │                   │
│          ▼                                      ▼                   │
│   ┌─────────────┐                        ┌─────────────┐            │
│   │  Required   │                        │  Migrate    │            │
│   │  to Merge   │                        │  + Seed     │            │
│   └─────────────┘                        └──────┬──────┘            │
│                                                 │                   │
│                                                 ▼                   │
│                                          ┌─────────────┐            │
│                                          │   Deploy    │            │
│                                          │  (Staging)  │            │
│                                          └──────┬──────┘            │
│                                                 │                   │
│                                                 ▼ (on failure)      │
│                                          ┌─────────────┐            │
│                                          │  Rollback   │            │
│                                          │  (PITR)     │            │
│                                          └─────────────┘            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Workflow Files

| Workflow                                        | Trigger      | Purpose                      |
| ----------------------------------------------- | ------------ | ---------------------------- |
| [verify.yml](../.github/workflows/verify.yml)   | PRs to main  | Lint & test (required check) |
| [release.yml](../.github/workflows/release.yml) | Push to main | Deploy to staging            |

---

## 2. Workflows

### Verify Workflow

**File:** [.github/workflows/verify.yml](../.github/workflows/verify.yml)

**Purpose:** Run linting and tests on pull requests. This workflow is:

- Required in branch protection (blocks PRs if failing)
- Reusable by other workflows via `workflow_call`

**Triggers:**

- Pull requests targeting `main`
- Called by `release.yml` before deployment

**Job:** `Lint & Test`

**Steps:**

1. Checkout code
2. Setup pnpm and Node.js
3. Install dependencies
4. Install Pulumi CLI (for getting Neon project ID from staging stack)
5. Authenticate with Neon
6. Run linting (`pnpm turbo lint`)
7. Run unit/integration tests (`pnpm turbo test`) - creates ephemeral branch
8. Install Playwright browsers
9. Run E2E tests - reuses branch, cleans up after
10. Upload Playwright report on failure

**Ephemeral Branch Flow:**

Each test runner creates and manages its own ephemeral branch independently:

```
Vitest (unit/integration) → Creates branch → Runs tests → Deletes branch
Playwright (E2E)          → Creates branch → Runs tests → Deletes branch
```

Note: Playwright creates its branch in the webServer command (before Next.js starts)
to ensure DATABASE_URL is set before any code is compiled.

### Release Workflow

**File:** [.github/workflows/release.yml](../.github/workflows/release.yml)

**Purpose:** Deploy to staging environment after merge to main.

**Triggers:**

- Push to `main` branch with changes in:
  - `packages/portal/**`
  - `infra/**`
  - `package.json`, `pnpm-lock.yaml`, `turbo.json`
- Manual trigger via `workflow_dispatch`

**Jobs:**

1. **Verify** - Run lint checks (reuses verify workflow)
2. **Migrate** - Run database schema migrations, RLS policies, and seed data
3. **Deploy** - Build Docker image and deploy to Cloud Run via Pulumi
4. **Rollback** (on deploy failure) - Restore database to pre-migration state using Neon PITR

**Migration & Seeding Strategy:**

- Migrations run **before** deployment to ensure schema is ready
- Seeding runs **after** migrations to populate initial data
- Seeding is idempotent (uses `ON CONFLICT DO NOTHING`)
- Uses Neon's Point-in-Time Recovery (PITR) for rollback capability
- Pre-migration timestamp is recorded for potential rollback
- If deployment fails, database is restored to pre-migration state

---

## 3. Setup Steps

### Step 1: Create Pulumi Access Token

1. Go to [app.pulumi.com/account/tokens](https://app.pulumi.com/account/tokens)
2. Create a new token
3. Add to GitHub Secrets as `PULUMI_ACCESS_TOKEN`

### Step 2: Set Up Workload Identity Federation

#### What is Workload Identity Federation?

**The problem:** GitHub Actions needs to authenticate to GCP to deploy. The old way was to create a service account JSON key and store it as a GitHub secret. But JSON keys are:

- Long-lived (never expire unless you revoke them)
- Dangerous if leaked
- A pain to rotate

**The solution:** Workload Identity Federation lets GitHub Actions prove who it is to GCP using a short-lived token (OIDC). No secrets stored, no keys to leak.

**How it works:**

1. GitHub Actions generates a signed JWT token saying "I am workflow X in repo Y"
2. GCP's Workload Identity Pool trusts tokens from `token.actions.githubusercontent.com`
3. GCP exchanges that token for a short-lived GCP access token
4. The workflow can now use GCP APIs as the service account

#### Setup Commands

Run these commands in your local terminal:

```bash
# Set variables (update GITHUB_REPO with your actual repo)
export PROJECT_ID="history-portal"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
export GITHUB_REPO="YOUR_GITHUB_USERNAME/history-portal"  # e.g., "denis/history-portal"

# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions" \
  --location="global" \
  --display-name="GitHub Actions"

# Create Workload Identity Provider
# The --attribute-condition restricts access to only your specific repository (required by GCP)
gcloud iam workload-identity-pools providers create-oidc "github" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create Service Account for GitHub Actions
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant necessary roles to the service account
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/${GITHUB_REPO}"

# Required for Pulumi to get access tokens for Docker authentication
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.serviceAccountTokenCreator" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/${GITHUB_REPO}"
```

### Step 3: Add GitHub Secrets

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret                           | Value                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `PULUMI_ACCESS_TOKEN`            | Your Pulumi access token                                                                         |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions/providers/github` |
| `GCP_SERVICE_ACCOUNT`            | `github-actions@history-portal.iam.gserviceaccount.com`                                          |
| `NEON_API_KEY`                   | Neon API key for PITR rollback (create at [console.neon.tech](https://console.neon.tech))        |
| `NEON_PROJECT_ID`                | Neon project ID (from Pulumi outputs: `patient-shadow-80448127` for staging)                     |

> **Note:** `DATABASE_URL` is automatically retrieved from Pulumi stack outputs during the migration job. No need to set it as a secret.

To get your project number:

```bash
gcloud projects describe history-portal --format="value(projectNumber)"
```

---

## 4. Branch Protection

Configure branch protection to require the verify workflow before merging:

1. Go to your repo → Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
4. Add required status check: `Lint & Test`

---

## 5. Future Enhancements

### Production Deployments

For production, consider:

1. **Manual approval:** Add environment protection rules in GitHub
2. **Separate workflow:** Create `release-prod.yml` triggered by tags or manual dispatch
3. **Smoke tests:** Add post-deployment health checks

Example production trigger:

```yaml
on:
  push:
    tags:
      - "v*" # Deploy on version tags like v1.0.0
```

---

## 6. Troubleshooting

### Migration Failures

If migrations fail in CI:

1. Check the workflow logs for the specific error
2. Fix the migration locally and test with `pnpm db:migrate`
3. Push the fix - CI will retry migrations

### Rollback Triggered

If rollback runs (deployment failed after migrations):

1. The database is restored to pre-migration state via Neon PITR
2. Check deploy logs to identify the failure cause
3. Fix the issue and push again - migrations will re-run

### Docker Build Failures

Common issues:

- **Lockfile mismatch:** Ensure `.npmrc` is included in Docker build context
- **Type errors:** Run `pnpm turbo build` locally before pushing
- **Missing dependencies:** Check that all workspace packages are copied in Dockerfile

---

**Document Maintainer:** AI Assistant  
**Last Updated:** December 19, 2025
