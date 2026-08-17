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
- Keep workout completion in `lib/workouts/workout.service.ts`; update the workout and upsert its unique feedback in one Drizzle transaction, preserve an existing `completedAt`, and return the complete persisted workout through `getWorkoutById()`.
- Keep workout deletion in `lib/workouts/workout.repository.ts`; delete only the `workouts` row, use the existing foreign-key cascades for blocks, workout exercises, and feedback, and never delete referenced `exercises`.
- Persist workout aggregates (`workouts`, `workout_blocks`, and `workout_exercises`) in a single Drizzle transaction to prevent partial workouts.
- Select API fields explicitly and transform Drizzle query results into clean response objects instead of returning raw join rows.
- Use camelCase for TypeScript properties and snake_case for PostgreSQL table and column names.
- Follow the existing schema style: explicit `varchar` lengths, timezone-aware timestamps, inline foreign keys, and generated UUID primary keys.
- Generate migrations with `npm run db:generate`, inspect the generated SQL, then apply them with `npm run db:migrate`. Do not edit generated migrations without a concrete reason.
- Keep standalone database seeds under `lib/db/`, load `.env` files with `@next/env` before importing the database connection, and make development fixtures idempotent.
- Run `npm run db:seed:workout` to recreate the `Full Body Strength` development workout from exercises already present in the database.
- Run `npm run lint` and `npx tsc --noEmit` after code or schema changes.
- The local PostgreSQL service is defined in `docker-compose.yml`.

# UI conventions

- Build the interface mobile-first for 360px to 430px widths. On larger screens, keep the same mobile experience centered at a maximum width of 480px rather than introducing a dashboard or sidebar.
- Keep the shared application shell in `app/layout.tsx`, including the fixed bottom navigation and safe-area spacing. Use real App Router routes for primary navigation instead of local tab state.
- Keep reusable UI under `components/<feature>/`; extract components when they own meaningful behavior or are repeated, not for every small visual element.
- Keep pages and layouts as Server Components by default. Add narrow Client Component boundaries only where state, event handlers, browser APIs, or client-side API requests require them.
- Use Tailwind CSS v4 utilities for styling. Prefer zinc or stone backgrounds, white surfaces, zinc text and borders, with emerald as a restrained accent for primary actions and active states.
- Preserve the light, neutral, functional visual language: no gradients, glass effects, heavy shadows, decorative animation, dark mode, or dense desktop-specific layouts unless explicitly requested.
- Make touch targets at least 44px high, keep visible focus states and labels, and ensure selected controls expose a non-color state such as `aria-pressed` or `aria-current`.
- Use simple inline SVG icons when the project has no icon library; do not add a dependency solely for a few navigation icons.
- Reserve bottom content space for the fixed navigation and account for `safe-area-inset-top` and `safe-area-inset-bottom` on mobile devices.
