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
- Load persisted workout detail pages through `getWorkoutById()` in a Server Component so the page and `GET /api/workouts/[id]` share one response contract without an internal HTTP request.
- Load persisted exercise detail pages through `getExerciseById()` in `lib/exercises/exercise.repository.ts` so the Server Component and `GET /api/exercises/[id]` share one complete response contract without an internal HTTP request; select exercise, image, and muscle fields explicitly and convert numeric activations to numbers.
- Keep workout muscle aggregation in `lib/workouts/workout-muscle-summary.ts` and include it in the shared `getWorkoutById()` response as `muscleSummary`; calculate it from the exercise muscle data already loaded by the repository rather than adding per-exercise queries.
- Calculate muscle load as exercise volume times activation, where exercise volume uses `sets * reps`, `sets * (durationSeconds / 5)`, or a work value of `1` when neither is present. Treat persisted `sets` as the total series count and use block `rounds` only when `sets` is null, so rounds and sets are not counted twice; normalize by the highest workout load, round scores to two decimal places, and return an empty array when no muscle data exists.
- For an individual exercise heatmap, use each exercise muscle's persisted `activation` directly as its score; do not apply workout volume, sets, reps, or rounds.
- Persist workout aggregates (`workouts`, `workout_blocks`, and `workout_exercises`) in a single Drizzle transaction to prevent partial workouts.
- Select API fields explicitly and transform Drizzle query results into clean response objects instead of returning raw join rows.
- Use camelCase for TypeScript properties and snake_case for PostgreSQL table and column names.
- Follow the existing schema style: explicit `varchar` lengths, timezone-aware timestamps, inline foreign keys, and generated UUID primary keys.
- Generate migrations with `npm run db:generate`, inspect the generated SQL, then apply them with `npm run db:migrate`. Do not edit generated migrations without a concrete reason.
- Keep standalone database seeds under `lib/db/`, load `.env` files with `@next/env` before importing the database connection, and make development fixtures idempotent.
- Run `npm run db:seed:workout` to recreate the `Full Body Strength` development workout from exercises already present in the database.
- Run `npm run lint`, `npx tsc --noEmit`, and `npm run build` after code or schema changes.
- The local PostgreSQL service is defined in `docker-compose.yml`.

# UI conventions

- Build the interface mobile-first for 360px to 430px widths. On larger screens, keep the same mobile experience centered at a maximum width of 480px rather than introducing a dashboard or sidebar.
- Keep the shared application shell in `app/layout.tsx`, including the fixed bottom navigation and safe-area spacing. Use real App Router routes for primary navigation instead of local tab state.
- Keep reusable UI under `components/<feature>/`; extract components when they own meaningful behavior or are repeated, not for every small visual element.
- Keep pages and layouts as Server Components by default. Add narrow Client Component boundaries only where state, event handlers, browser APIs, or client-side API requests require them.
- Keep the Generate page server-rendered and generation form state in `components/generate/workout-generator-form.tsx`; reuse the workout generator domain input types when constructing requests to `POST /api/workouts/generate`.
- After successful generation, navigate directly to `/workouts/<id>` from the returned persisted workout. Keep the form values during requests and errors, prevent duplicate submissions, and expose pending and error states accessibly.
- Keep workout detail content server-rendered; isolate completion, feedback, deletion, and image-error fallback behavior in narrow Client Components under `components/workouts/`.
- Keep exercise detail content server-rendered; isolate media selection and image-error fallback in `components/exercises/exercise-media-gallery.tsx`, preserve persisted image order, and use a neutral placeholder when no usable image exists.
- Keep the reusable workout muscle heatmap in `components/muscles/muscle-heatmap.tsx`; pass only muscle summary items rather than a complete workout, keep it server-rendered with inline front/back SVGs, and map visual regions by `svgRegion` rather than `slug`. Ignore null or unknown mappings without failing.
- Use the existing emerald accent with stable classes and vary only opacity through the clamped `getMuscleIntensity()` helper. Keep bilateral regions symmetric, show at most the five highest-scoring muscles with textual intensity labels and accessible progress values, and render a discrete empty state instead of neutral silhouettes when the summary is empty.
- Display persisted enum-like values with human-readable labels and never expose underscores in the UI.
- For exercise thumbnails, use the first non-empty persisted image URL and preserve the same neutral placeholder dimensions when no image exists or loading fails. Do not invent external images.
- Link exercise names in persisted workout cards to `/exercises/<exercise-id>` without changing the card's other behavior, and use a route-level 404 with a link back to workouts when an exercise is missing.
- Prefer a real route-level 404 for missing workouts. Do not add a `loading.tsx` to the workout detail segment unless streaming is worth changing a late `notFound()` response from HTTP 404 to 200.
- Use Tailwind CSS v4 utilities for styling. Prefer zinc or stone backgrounds, white surfaces, zinc text and borders, with emerald as a restrained accent for primary actions and active states.
- Preserve the light, neutral, functional visual language: no gradients, glass effects, heavy shadows, decorative animation, dark mode, or dense desktop-specific layouts unless explicitly requested.
- Make touch targets at least 44px high, keep visible focus states and labels, and ensure selected controls expose a non-color state such as `aria-pressed` or `aria-current`.
- Use simple inline SVG icons when the project has no icon library; do not add a dependency solely for a few navigation icons.
- Reserve bottom content space for the fixed navigation and account for `safe-area-inset-top` and `safe-area-inset-bottom` on mobile devices.
