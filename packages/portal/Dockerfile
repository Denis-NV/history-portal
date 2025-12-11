# Node.js base image for Cloud Run
# Using node:22-alpine for latest security patches
# The "high vulnerabilities" warning from Docker may come from transient npm dependencies
# Run `docker scout cves <image>` to check - these are typically in build-time deps only
FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─────────────────────────────────────────────────────────────────────────────
# Dependencies stage - install all dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy workspace config files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/portal/package.json ./packages/portal/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Builder stage - build the Next.js app
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/portal/node_modules ./packages/portal/node_modules

# Copy source files
COPY packages/portal ./packages/portal
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Build the application
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app/packages/portal
RUN pnpm build

# ─────────────────────────────────────────────────────────────────────────────
# Runner stage - production image
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone output (includes node_modules and server.js)
COPY --from=builder --chown=nextjs:nodejs /app/packages/portal/.next/standalone ./

# Copy static files to the correct location within the standalone structure
COPY --from=builder --chown=nextjs:nodejs /app/packages/portal/.next/static ./packages/portal/.next/static

# Copy public folder to the correct location (same level as server.js)
COPY --from=builder --chown=nextjs:nodejs /app/packages/portal/public ./packages/portal/public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone output creates server.js in the package directory
CMD ["node", "packages/portal/server.js"]
