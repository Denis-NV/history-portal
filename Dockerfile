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

# Copy package files
COPY pnpm-lock.yaml package.json .npmrc ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ─────────────────────────────────────────────────────────────────────────────
# Builder stage - build the Next.js app
# ─────────────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source and config files
COPY src ./src
COPY public ./public
COPY next.config.ts tsconfig.json postcss.config.mjs package.json ./

# Build the app
ENV NEXT_TELEMETRY_DISABLED=1
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
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static files
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy public folder
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
