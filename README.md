# lulu-discord-suite

Monorepo for Lulu Discord Suite: bots (minigames, admin) and CRM dashboard. Phase 1 improvements implemented: shared bot-utils, admin-bot integration, env validation, Docker Compose, and CRM authentication (Auth.js).

Quick start

1. Copy env: `cp .env.example .env` and set values (Discord tokens, DB URL, NextAuth secrets).
2. Start local DB: `npm run dev:infra` (requires Docker).
3. Install dependencies: `npm install`.
4. Build database package: `npm run build -w packages/database` (postinstall runs this automatically).
5. Run apps:
   - Minigames bot: `npm run dev:minigames`
   - Admin bot: `npm run dev:admin`
   - CRM dashboard: `npm run dev:web`

For developers: see `docs/SETUP.md` for detailed setup and testing instructions.
