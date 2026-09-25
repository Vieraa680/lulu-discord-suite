# Lulu Discord Suite — Agent Guidelines & Repository Architecture

Welcome to **lulu-discord-suite**, a monorepo ecosystem powering League of Legends-themed Discord bots and an administrative CRM dashboard. All AI agents, contributors, and automated tooling must adhere to the rules, architectural patterns, and conventions outlined in this document.

---

## 1. Project Architecture & Workspaces

The repository is managed as an **npm workspaces** monorepo:

```
lulu-discord-suite/
├── apps/
│   ├── minigames-bot/     # Discord.js bot: LoL minigames (Polymorphia, Candies economy, Shop)
│   ├── admin-bot/         # Discord.js bot: Moderation, server configuration, audit logs
│   └── crm-dashboard/     # Next.js web application (App Router, Tailwind CSS v4, React 19)
├── packages/
│   └── database/          # Shared Prisma ORM package (@lulu-discord/database)
├── plans/                 # Architectural specifications and design docs
├── AGENTS.md              # Global agent guidelines and repo instructions
├── .clinerules            # Cline / Roo-Code specific rule sync
└── package.json           # Root workspace configuration
```

### Workspace Directory Map

| Path | Name | Description | Key Tech |
|------|------|-------------|----------|
| `apps/minigames-bot` | `minigames-bot` | Interactive Discord bot for server games | Discord.js v14, TS/JS (`tsx`), Vitest, Pino |
| `apps/admin-bot` | `admin-bot` | Administrative and moderation bot | Discord.js v14, Node.js |
| `apps/crm-dashboard` | `crm-dashboard` | Web panel for server owners and admins | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| `packages/database` | `@lulu-discord/database` | Shared PostgreSQL database layer | Prisma ORM, TypeScript |

---

## 2. Essential Commands

Always run workspace commands from the monorepo root using the `-w` flag (or navigate into the package directory).

### Development Servers

```bash
# Start Minigames bot in development mode
npm run dev:minigames

# Start Admin bot in development mode
npm run dev:admin

# Start CRM Dashboard (Next.js)
npm run dev:web
```

### Shared Database Package (`packages/database`)

```bash
# Generate Prisma Client after editing schema.prisma
npm run db:generate -w packages/database

# Push schema changes directly to the active database (development)
npm run db:push -w packages/database

# Create a new Prisma migration (production/tracked migrations)
npm run db:migrate -w packages/database

# Open Prisma Studio to browse database records visually
npm run db:studio -w packages/database

# Compile TypeScript output (required for consumers to import latest types)
npm run build -w packages/database
```

> **Note:** The root `postinstall` script automatically runs `npm run build -w packages/database`.

### Testing & Linting

```bash
# Run unit and integration tests in minigames-bot
npm test -w apps/minigames-bot

# Run tests in watch mode
npm run test:watch -w apps/minigames-bot

# Lint the CRM Dashboard
npm run lint -w apps/crm-dashboard
```

### Fast Code Search (`tgrep`)

The system has `tgrep` (trigram-indexed fast grep) installed for ultra-fast repository searches.

```bash
# Build / update the trigram search index (.tgrep directory)
tgrep index

# Search code across the codebase
tgrep "<pattern>"

# Search with line numbers and file glob filter
tgrep -n "<pattern>" -g "*.ts"
```

### Adding Dependencies

**CRITICAL:** Never install app-specific dependencies in the monorepo root.

```bash
# Correct: install into a specific workspace
npm install <package-name> -w apps/minigames-bot
npm install <package-name> -w apps/crm-dashboard
npm install <package-name> -w packages/database

# Install dev dependency into a specific workspace
npm install -D <package-name> -w apps/minigames-bot

# Only install in root if the tool applies to the entire monorepo tooling
npm install -D <tool-name>
```

---

## 3. Strict Development Rules

1. **Language Policy:**
   - **All code, comments, TypeScript types, variables, commit messages, and technical documentation must be written in English.**
   - User chat / prompts may be in Spanish or English, but the codebase remains strictly English.

2. **Secrets & Environment Variables:**
   - Never commit `.env` or credential files.
   - Reference `.env.example` in each app directory for required environment variables.
   - Required bot variables: `DISCORD_TOKEN`, `DATABASE_URL`, `COMMAND_REGISTRATION_MODE`, `GUILD_ID`.

3. **Workspace Isolation:**
   - Treat each app as a discrete package relying on `@lulu-discord/database` for persistence.
   - Do not cross-import code directly across `apps/` (e.g., `minigames-bot` must never import from `admin-bot` or `crm-dashboard`). Shared code must reside in `packages/`.

---

## 4. Git Conventions & Workflow

### Branch Naming

Use the standardized branch format:
`feature/<app-or-scope>-<short-description>`
Examples:
- `feature/minigames-polymorphia-cooldown`
- `feature/crm-guild-settings-page`
- `fix/admin-ban-permissions`

### Conventional Commits (Mandatory)

Every commit message **must** strictly adhere to [Conventional Commits](https://www.conventionalcommits.org/):

Format:
```
<type>(<scope>): <description in english>
```

- Allowed scopes: `minigames`, `admin`, `crm`, `database`, `repo`
- Length limit: Header line ≤ 50 characters

| Type | Scope | Description |
|------|-------|-------------|
| `feat` | `minigames`, `admin`, `crm`, `database`, `repo` | New feature or user capability |
| `fix` | `minigames`, `admin`, `crm`, `database`, `repo` | Bug fix |
| `chore` | `repo`, `minigames`, `admin`, `crm`, `database` | Dependency updates, tooling, config |
| `docs` | `repo`, `minigames`, `admin`, `crm`, `database` | Documentation changes only |
| `refactor` | `minigames`, `admin`, `crm`, `database` | Code restructuring with no behavior change |
| `test` | `minigames`, `admin`, `crm`, `database` | Adding or updating tests |
| `perf` | `minigames`, `admin`, `crm`, `database` | Performance optimization |

Examples:
- `feat(minigames): implement duel cooldown check and daily resets`
- `fix(crm): handle missing guild configuration gracefully`
- `chore(database): update prisma client to 6.5.0`

---

## 5. Technology Stack & Coding Guidelines

### Discord Bots (`apps/minigames-bot` & `apps/admin-bot`)
- **Library:** Discord.js v14+
- **Command Architecture:**
  - Exclusively use Discord Slash Commands (`/`). Legacy prefix commands are reserved only for passive message events (e.g., butterfly spawns).
  - Use `interaction.deferReply()` if processing or database queries may take more than 2.5 seconds to avoid Discord webhook timeouts.
  - Use `ephemeral: true` for user-specific feedback (inventory, errors, daily status).
- **Subpath Imports:**
  - `minigames-bot` uses Node.js subpath imports configured in `package.json`:
    - `#services/database`
    - `#services/*`
    - `#handlers/*`
    - `#polymorphia/*`
    - `#utils/*`
- **Logging:** Use `pino` for structured logging. Avoid raw `console.log` in production bot code.

### Web Dashboard (`apps/crm-dashboard`)
- **Framework:** Next.js 16+ (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS v4.
- **Icons:** `@iconify/react`.
- **Data Fetching:** Leverage React Server Components (RSC) and Server Actions for data mutations with `@lulu-discord/database`.

### Database Layer (`packages/database`)
- **ORM:** Prisma ORM connected to PostgreSQL.
- **Client Access:** Import the singleton instance from `@lulu-discord/database`:
  ```typescript
  import { prisma } from "@lulu-discord/database";
  ```
- **Schema Modification Protocol:**
  Whenever you change `packages/database/prisma/schema.prisma`:
  1. Update `schema.prisma`.
  2. Run `npm run db:generate -w packages/database`.
  3. Run `npm run build -w packages/database` so consumer apps pick up updated TypeScript declaration files (`.d.ts`).
  4. Run `npm run db:push -w packages/database` (or `db:migrate`).

---

## 6. Safety & AI Agent Best Practices

- **Never perform destructive database commands** (such as `prisma migrate reset` or `db push --force-reset`) without explicit confirmation from the user.
- **Run validation before completing tasks:** Verify TypeScript compilation and test execution (`npm test -w apps/minigames-bot` or package build) before declaring a task resolved.
- **Maintain backward compatibility:** When modifying shared database models (`User`, `GuildConfig`, `PolymorphiaState`), ensure changes do not break existing Discord bot commands or dashboard pages.
