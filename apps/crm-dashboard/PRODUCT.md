# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Discord server administrators, moderators, and community managers running the Lulu Discord Suite bot ecosystem. They need to monitor economy balances, manage user profiles and inventories, inspect active Polymorphia duels, adjust game configurations, and audit transaction logs.

## Product Purpose
A unified administrative CRM and operational dashboard for the Lulu Discord Suite. It transforms raw database records and bot telemetry into an interactive command center, enabling community leaders to oversee player progression, balance the candy economy, manage shop items, and tune bot rules per server.

## Positioning
Unlike generic Discord bot web portals that only toggle basic commands, Lulu CRM provides specialized League of Legends-themed player management with real-time candy economy auditing, Polymorphia state manipulation, item catalog control, and per-guild configuration.

## Operating Context
Used on desktop and mobile web by Discord server staff while moderating voice/text channels, running server events, investigating economy abuse, or tuning minigame reward rates.

## Capabilities and Constraints
- Overview dashboard with high-impact server metrics (candies in circulation, active duels, caught butterflies, user base growth).
- Player CRM: Search and inspect user profiles, modify candy balances with auditable transaction logs, manage inventory items, and lift/apply Polymorphia states.
- Economy & Transaction Audit Log: Live feed with filtering by type (earn, spend, refund, admin) and search.
- Competitive Leaderboards: Dynamic rankings across multiple dimensions (candies, wins, defenses, total earned).
- Item Catalog Manager: Browse and toggle shop items, prices, rarities, and durations.
- Guild Configuration: Per-server settings for multipliers, veteran roles, log channels, and excluded channels.
- Built on Next.js 16 (App Router), React 19, Tailwind CSS v4, Prisma ORM (@lulu-discord/database).

## Brand Commitments
- Theme: "Arcane Lulu Magic" — Whimsical yet powerful League of Legends yordle sorcery. Deep mystical indigo/violet canvas with bioluminescent Lulu pink and Pix gold highlights, subtle glassmorphism, and responsive micro-interactions.
- Tone: Enchanting, precise, modern, high-craft.

## Evidence on Hand
- Monorepo database package `@lulu-discord/database` with Prisma models (`User`, `GuildConfig`, `PolymorphiaState`, `Item`, `UserItem`, `Transaction`, `Achievement`, `UserAchievement`).
- Incumbent Next.js app in `apps/crm-dashboard`.

## Product Principles
1. Instant Operational Clarity: Critical guild metrics and alerts must be visible at a glance without visual clutter.
2. Safe & Auditable Mutations: Every administrative action (modifying balance, granting items) must leave an immutable transaction record.
3. Immersive Whimsical Craft: Maintain the delightful League/Lulu personality without compromising enterprise dashboard density and speed.
4. Seamless Responsiveness: Flawless experience across desktop monitors and mobile devices for on-the-go Discord moderation.
