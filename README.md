# TRX Training Generator

A self-hosted, mobile-first TRX workout generator with optional AI-assisted workout composition.

## Features

- Generates persisted TRX workouts by goal, duration, level, focus, and intensity
- Uses a curated local TRX, dumbbell, and muscle catalog
- Keeps suspension-trainer and dumbbell movements evenly distributed without requiring a bench or other accessories
- Supports AI-assisted composition through Mistral, with a deterministic fallback
- Provides workout history, completion feedback, and workout deletion
- Shows workout and exercise muscle heatmaps
- Supports externally hosted exercise demonstration images
- Stores application data in PostgreSQL
- Provides a mobile-first interface for self-hosted deployment

## Tech stack

- Next.js 16 and React 19
- Tailwind CSS 4
- PostgreSQL 17
- Drizzle ORM
- Mistral
- Docker and Docker Compose

## Quick start

### 1. Clone the repository

```bash
git clone git@github.com:kyra-io/trx-tranning-generator.git
cd trx-tranning-generator
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Edit `.env` and replace `POSTGRES_PASSWORD=change-me` with a strong password. `POSTGRES_DB` and `POSTGRES_USER` may keep their defaults.

Set `MISTRAL_API_KEY` to enable AI-assisted workout composition. Without a key, or if Mistral fails, the application uses its deterministic workout generator. `MISTRAL_MODEL` selects the model sent to Mistral and defaults to `ministral-14b-latest`.

### 3. Build and start the services

```bash
docker compose up -d --build
```

This creates PostgreSQL with the persistent `postgres_data` volume, waits for the database health check, applies migrations, and starts the Next.js application. It does not populate the exercise catalog automatically.

For a new database, initialize the muscle and exercise catalog once:

```bash
docker compose run --rm app ./docker-bootstrap.sh
```

The bootstrap is idempotent. It seeds muscles, the complete local TRX and dumbbell exercise catalog, and verified external exercise image mappings. It does not add a development workout.

### 4. Open the application

- On the Docker host: <http://localhost:3003>
- From another device on the LAN: `http://<server-ip>:3003`

## Database initialization

Versioned migrations from `drizzle/` are applied automatically whenever the application container starts. The app will not start if migration fails.

Catalog initialization is intentionally manual:

```bash
docker compose run --rm app ./docker-bootstrap.sh
```

Run it after the first startup of a new database. It safely seeds the system muscle data, the local TRX and dumbbell exercise catalog, and verified external exercise image mappings, and can be run again.

The sample development workout is not part of the production bootstrap. Its npm script is documented under [Database commands](#database-commands).

## Updating

```bash
git pull --ff-only
docker compose up -d --build
```

New migrations are applied automatically when the rebuilt application container starts. Existing PostgreSQL data remains in the `postgres_data` volume.

## Stopping

```bash
docker compose down
```

This removes the containers and Compose network but preserves the database volume.

## Resetting the database

> **WARNING:** `docker compose down -v` permanently deletes the PostgreSQL volume and all application data.

Only reset the database when complete data loss is intended:

```bash
docker compose down -v
docker compose up -d --build
docker compose run --rm app ./docker-bootstrap.sh
```

## Logs

```bash
# All services
docker compose logs -f

# Application only
docker compose logs -f app

# PostgreSQL only
docker compose logs -f postgres
```

## Status and health

```bash
docker compose ps
curl http://localhost:3003/api/health
```

The health endpoint checks that the application can query PostgreSQL. A healthy response is `{"status":"ok"}`.

## Development without the app container

```bash
npm ci
npm run dev
```

`DATABASE_URL` must point to a PostgreSQL database reachable from the host. The Compose `postgres` service does not publish port 5432 to the host, so it cannot be used directly by a host-side Next.js process with the current configuration. Use a separate local PostgreSQL instance, or use the recommended full Docker Compose workflow.

For a host-side database, a typical URL has this shape:

```text
postgresql://<user>:<password>@localhost:5432/<database>
```

Run migrations and the required catalog seeds before generating workouts.

## Database commands

These scripts run against the `DATABASE_URL` in the current environment:

| Command | Description |
| --- | --- |
| `npm run db:generate` | Generate a migration from schema changes. |
| `npm run db:migrate` | Apply pending Drizzle migrations. |
| `npm run db:studio` | Open Drizzle Studio. |
| `npm run db:seed` | Seed the muscle catalog. |
| `npm run db:seed:exercise` | Seed the legacy single exercise fixture. |
| `npm run db:seed:exercises` | Seed the complete local TRX and dumbbell exercise catalog. |
| `npm run db:seed:exercise-images` | Add verified external image mappings for catalog exercises. |
| `npm run db:seed:workout` | Recreate the `Full Body Strength` development workout. |

The production image does not include the project package metadata, development dependencies, or all TypeScript seed sources. Use `docker-bootstrap.sh` for production catalog and image initialization; the npm commands above are intended for a development checkout.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_DB` | No | PostgreSQL database name. Defaults to `trx` in Docker Compose. |
| `POSTGRES_USER` | No | PostgreSQL user. Defaults to `trx` in Docker Compose. |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password used by both services. No usable default is provided. |
| `MISTRAL_API_KEY` | No | Enables Mistral AI workout composition. The deterministic generator is used when omitted or when Mistral fails. |
| `MISTRAL_MODEL` | No | Mistral model identifier. Defaults to `ministral-14b-latest`. |
| `DATABASE_URL` | Docker-managed | PostgreSQL connection URL. Compose constructs it for the app; set it explicitly for host-side development and database scripts. |

## Persistence

PostgreSQL stores its data in the Docker named volume `postgres_data`. `docker compose down` preserves this volume; `docker compose down -v` deletes it and all stored application data.

## Project structure

| Path | Purpose |
| --- | --- |
| `app/` | Next.js App Router pages and API route handlers. |
| `components/` | Mobile-first UI components grouped by feature. |
| `lib/db/` | Drizzle connection, schema, and seed scripts. |
| `lib/workouts/` | Workout selection, generation, persistence, and muscle summaries. |
| `lib/ai/` | AI provider integration. |
| `drizzle/` | Versioned PostgreSQL migrations. |
| `public/` | Static application assets. |
| `Dockerfile` | Multi-stage production image. |
| `docker-compose.yml` | Application, PostgreSQL, health checks, networking, and persistence. |

## Mistral

Mistral is used only for AI-assisted workout composition. Configure `MISTRAL_API_KEY` and, optionally, `MISTRAL_MODEL`. The default model is `ministral-14b-latest`, which supports custom structured outputs. A generation uses at most two Mistral requests. When Mistral returns HTTP 429, the application observes `Retry-After` when present (or uses a 60-second default), skips further Mistral calls during that bounded cooldown, and continues immediately with the built-in deterministic fallback.

## Exercise Data & Visual References

This project uses and adapts information from multiple external sources when building its curated TRX and dumbbell exercise catalog. Not every exercise or catalog field comes directly from these sources.

### Free Exercise DB

[free-exercise-db](https://github.com/yuhonas/free-exercise-db) is the source for the dumbbell exercises and is also used as a reference for parts of the TRX catalog. The dumbbell subset excludes movements that require a bench, chair, box, rack, ball, platform, or other accessory. Referenced or adapted metadata may include exercise names, movement information, muscle groups, instructions, and image references.

The original dataset is distributed under the Unlicense. See the [free-exercise-db license](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) for its terms.

### TRX Training

TRX-specific exercise information and visual references may link to publicly available content from the official [TRX Training](https://www.trxtraining.com/) website, including exercise naming where applicable and movement or execution references.

External exercise images are referenced by URL and are not distributed as part of this repository. They can become unavailable if a source URL changes. The production bootstrap adds the verified URL mappings; during development, the same idempotent mappings can be added with `npm run db:seed:exercise-images`.

TRX and related trademarks are the property of their respective owners. This project is not affiliated with, endorsed by, or sponsored by TRX.

### Disclaimer

This is a personal, self-hosted project created for experimentation and personal training use. Workout and exercise information generated by the application should not be considered professional medical or fitness advice.

## Troubleshooting

### App does not start

```bash
docker compose logs -f app
```

Check for migration, database connection, and server startup errors. If the app starts but cannot generate a workout, confirm that the catalog bootstrap has been run on the new database.

### Database does not become healthy

```bash
docker compose logs -f postgres
```

Confirm that `POSTGRES_PASSWORD` is set in `.env` and that the existing volume was not created with different credentials.

### Port 3003 is already in use

Stop the process using port 3003, or change the `3003:3000` port mapping in `docker-compose.yml`.

### Mistral generation fails

Check `MISTRAL_API_KEY` and `MISTRAL_MODEL` in `.env`. Do not print or include the API key in logs or support output. The application will use deterministic generation when Mistral is unavailable.

For HTTP 429 errors, check the organization's current request, token-per-minute, and monthly token limits in the Mistral Admin limits page. The application does not retry a rate-limited request: it activates a temporary local cooldown and uses the deterministic fallback until that window expires. Restarting the container does not reset the provider-side quota.

## Commands cheat sheet

| Action | Command |
| --- | --- |
| Start | `docker compose up -d` |
| Build and start | `docker compose up -d --build` |
| Stop | `docker compose down` |
| Follow all logs | `docker compose logs -f` |
| Show status | `docker compose ps` |
| Rebuild the app | `docker compose up -d --build app` |

Database reset is deliberately omitted from this table because it permanently deletes data. See [Resetting the database](#resetting-the-database).
