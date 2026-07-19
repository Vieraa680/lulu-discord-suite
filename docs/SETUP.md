# Setup & Development

Prerequisites
- Node 20+
- Docker (for local Postgres)

1) Environment
- Copy root `.env.example` to `.env` and fill values.

2) Start infrastructure
- `npm run dev:infra` to start Postgres and pgAdmin (docker compose).

3) Install & build
- `npm install`
- `npm run build -w packages/database`

4) Database
- Adjust `packages/database/prisma/.env` if needed and run migrations or `prisma db push`.

5) Run apps
- `npm run dev:minigames`
- `npm run dev:admin`
- `npm run dev:web`

6) Tests
- Run admin-bot tests: `npm run test -w apps/admin-bot` (Vitest)
