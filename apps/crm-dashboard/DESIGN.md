---
name: Lulu CRM Dashboard
description: High-density, quiet, and disciplined operational command bridge for Discord server administration
colors:
  neutral-bg: "#09090b"
  neutral-surface: "#121215"
  neutral-hover: "#18181b"
  border-subtle: "#27272a"
  text-primary: "#fafafa"
  text-secondary: "#a1a1aa"
  text-muted: "#71717a"
  primary: "#8b5cf6"
  primary-hover: "#7c3aed"
  accent-candy: "#f59e0b"
  success: "#10b981"
  danger: "#ef4444"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.neutral-bg}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: Lulu CRM Dashboard

## Overview

**Creative North Star: "The Quiet Flight Deck"**

Lulu CRM Dashboard is an operational tool built for Discord administrators and community leads. Rather than performing visual theatrics with neon glows, cartoonish illustrations, and emoji spam, the interface treats Discord telemetry and player economies with the precision and sobriety of high-tier developer consoles (like Linear or Vercel). The design recedes into the background so that player statuses, candy velocity, and audit logs speak clearly.

**Key Characteristics:**
- **High Data Density:** Clean tabular numbers, concise spacing, and scannable columns.
- **Tonal Discipline:** True dark canvas (zinc-950) with neutral slate borders and a single restrained violet interactive accent.
- **Auditable Clarity:** Clear visual distinctions between player-generated events and staff-initiated mutations without screaming colors.

## Colors

The palette is restrained, using dark neutral zinc for structure and reserve accents for currency and interactions.

### Primary
- **Command Violet** (`#8b5cf6`): Used strictly for primary interactive states, active nav selections, and primary focus rings.

### Neutral
- **Obsidian Ground** (`#09090b`): The root application canvas.
- **Surface Elevation** (`#121215`): Container backgrounds for tables and grouped panels.
- **Border Subtle** (`#27272a`): Structural divider lines with 1px hairline weight.
- **Text Bright** (`#fafafa`): Headings and primary data points.
- **Text Muted** (`#a1a1aa`): Secondary labels, helper descriptions, and table headers.

### Named Rules
**The Single-Accent Rule.** Colorful accents are restricted to semantic meaning: Amber strictly for candies/economy, Emerald for net-positive deltas, Red for destructive actions. No decorative rainbow gradients.

## Typography

**Body & Headings:** System UI sans stack (`system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
**Numerical & IDs:** Tabular numerals with monospace stack for Discord Snowflake IDs.

### Hierarchy
- **Headline** (700, 1.5rem, 1.25): Page headers.
- **Title** (600, 0.875rem, 1.3): Section headers and card labels.
- **Body** (400, 0.8125rem, 1.5): Data values and table content.
- **Label / Snowflake** (500, 0.6875rem, 1.2): Discord IDs, timestamps, and metadata tags.

## Layout

- Fixed 64px width sidebar on desktop, responsive drawer on mobile.
- Generous max-width content container (`max-w-6xl`) with 24px vertical rhythmic spacing.
- Structured tables with sticky, high-contrast headers.

## Elevation & Depth

Surfaces are flat at rest. Depth is communicated strictly via tonal contrast (`#09090b` canvas vs `#121215` containers) and 1px borders (`#27272a`). Diffuse shadows and glowing halos are banned.

## Shapes

- Containers and panels use subtle rounded corners (8px to 12px radius).
- Interactive pills and badges use 6px radius for density.

## Components

### Buttons
- **Shape:** 8px radius (`rounded-lg`).
- **Primary:** High-contrast light button (`#fafafa` background, `#09090b` bold text).
- **Secondary:** Neutral dark button (`#18181b` background with `#27272a` border).

### Tables & Ledgers
- Flat rows with subtle hover feedback (`hover:bg-zinc-800/40`).
- Hairline dividers between records (`divide-y divide-zinc-800/60`).

## Do's and Don'ts

### Do:
- **Do** format all currency and counts with `tabular-nums`.
- **Do** format Discord IDs in monospace font with truncated labels where space is constrained.
- **Do** provide clear feedback and reasons for all staff mutation actions.

### Don't:
- **Don't** use decorative emojis in place of standard interface icons.
- **Don't** add colored glow halos, multi-color card borders, or gradient text.
- **Don't** clutter user profiles with synthetic stock photography.
