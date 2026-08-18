# TRX Training Generator

Aplicação Next.js com PostgreSQL e Drizzle ORM, preparada para execução self-hosted com Docker Compose.

## Primeira instalação

```bash
cp .env.example .env
# Editar .env e definir POSTGRES_PASSWORD e, opcionalmente, OPENROUTER_API_KEY.
docker compose up -d --build
docker compose ps
```

A aplicação fica disponível em <http://localhost:3003>. O PostgreSQL não publica uma porta no host.

As migrations versionadas em `drizzle/` são aplicadas automaticamente antes de cada arranque da aplicação. Se uma migration falhar, o servidor Next.js não arranca.

Uma base nova contém o schema, mas não o catálogo. Inicialize os músculos e exercícios uma única vez com:

```bash
docker compose run --rm app ./docker-bootstrap.sh
```

Este bootstrap é explícito e idempotente. Não cria imagens nem workouts e nunca é executado durante um restart normal. As imagens e o workout de desenvolvimento continuam disponíveis através dos scripts npm existentes para tarefas de desenvolvimento controladas.

## Operação

Depois da primeira build, o sistema arranca com:

```bash
docker compose up -d
```

Comandos úteis:

```bash
docker compose ps
docker compose logs -f app
docker compose restart app
docker compose down
```

`docker compose down` remove os containers e a network default, mas preserva o volume nomeado `postgres_data`. Apenas `docker compose down -v` remove também os dados; use-o somente quando pretende apagar integralmente a base de dados.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

Os scripts de migrations e seeds locais continuam definidos em `package.json`. Para desenvolvimento fora de Docker, defina `DATABASE_URL` com o endereço local do PostgreSQL.
