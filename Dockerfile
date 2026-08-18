FROM node:24.13.0-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24.13.0-bookworm-slim AS builder
WORKDIR /app
# Route modules validate that the server-side variable exists while Next collects
# build metadata. No connection is made and the runtime value is supplied by Compose.
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npx esbuild scripts/migrate.mjs --bundle --platform=node --format=cjs --outfile=/tmp/migrate.cjs \
    && npx esbuild lib/db/seed.ts --bundle --platform=node --format=cjs --outfile=/tmp/seed.cjs \
    && npx esbuild lib/db/seed-exercises.ts --bundle --platform=node --format=cjs --outfile=/tmp/seed-exercises.cjs \
    && npx esbuild lib/db/seed-exercise-images.ts --bundle --platform=node --format=cjs --outfile=/tmp/seed-exercise-images.cjs

FROM node:24.13.0-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=nextjs:nodejs /tmp/migrate.cjs /tmp/seed.cjs /tmp/seed-exercises.cjs /tmp/seed-exercise-images.cjs ./scripts/
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
COPY --chown=nextjs:nodejs docker-bootstrap.sh ./docker-bootstrap.sh
COPY --chown=nextjs:nodejs scripts/healthcheck.mjs ./scripts/

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
