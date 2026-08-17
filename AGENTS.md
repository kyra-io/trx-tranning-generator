<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

- This is a monolithic Next.js App Router application using PostgreSQL and Drizzle ORM.
- Keep the database schema in `lib/db/schema.ts`, the connection in `lib/db/index.ts`, and Drizzle configuration in `drizzle.config.ts`.
- Keep Route Handlers thin, place reusable database reads in repositories under `lib/<feature>/`, and keep domain orchestration in feature services.
- Keep workout generation in `lib/workouts/workout-generator.service.ts`; generators must return the complete persisted workout through `getWorkoutById()` so deterministic and future LLM implementations share the same API contract.
- Persist workout aggregates (`workouts`, `workout_blocks`, and `workout_exercises`) in a single Drizzle transaction to prevent partial workouts.
- Select API fields explicitly and transform Drizzle query results into clean response objects instead of returning raw join rows.
- Use camelCase for TypeScript properties and snake_case for PostgreSQL table and column names.
- Follow the existing schema style: explicit `varchar` lengths, timezone-aware timestamps, inline foreign keys, and generated UUID primary keys.
- Generate migrations with `npm run db:generate`, inspect the generated SQL, then apply them with `npm run db:migrate`. Do not edit generated migrations without a concrete reason.
- Keep standalone database seeds under `lib/db/`, load `.env` files with `@next/env` before importing the database connection, and make development fixtures idempotent.
- Run `npm run db:seed:workout` to recreate the `Full Body Strength` development workout from exercises already present in the database.
- Run `npm run lint` and `npx tsc --noEmit` after code or schema changes.
- The local PostgreSQL service is defined in `docker-compose.yml`.
