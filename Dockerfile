# syntax=docker/dockerfile:1.6

# Base image
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install deps with pnpm (cached)
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production

# Build the app
RUN pnpm build

# Runtime image
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copy build output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

RUN mkdir -p /app/.next/cache \
	&& chown -R nextjs:nextjs /app/.next

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
