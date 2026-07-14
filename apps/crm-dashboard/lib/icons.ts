/** Base URL for Iconify's public SVG API */
const ICONIFY_API_BASE = 'https://api.iconify.design'

/** Single icon definition matching the bot's icon schema */
export interface IconDef {
  /** Iconify icon identifier (e.g. "mdi:sword-cross") */
  iconify: string
  /** Unicode fallback emoji for Discord (e.g. "⚔️") */
  char: string
}

/** Map of semantic icon names to their definitions */
export const ICON_DEFS: Record<string, IconDef> = {
  // ── Combat / Duel ──
  SWORDS:       { iconify: 'mdi:sword-cross',      char: '⚔️' },
  SWORD:        { iconify: 'mdi:sword',             char: '⚔️' },
  SHIELD:       { iconify: 'mdi:shield',            char: '🛡️' },
  TROPHY:       { iconify: 'mdi:trophy',            char: '🏆' },
  SKULL:        { iconify: 'mdi:skull-outline',     char: '💀' },
  DICE:         { iconify: 'mdi:dice-d20',          char: '🎲' },

  // ── Status / UI ──
  CHECK:        { iconify: 'mdi:check-circle',      char: '✅' },
  CROSS:        { iconify: 'mdi:close-circle',      char: '❌' },
  LOCK:         { iconify: 'mdi:lock',              char: '🔒' },
  ALARM:        { iconify: 'mdi:alarm',             char: '⏰' },
  HOURGLASS:    { iconify: 'mdi:hourglass',         char: '⏳' },
  STOPWATCH:    { iconify: 'mdi:stopwatch',         char: '⏱️' },

  // ── Currency / Economy ──
  CANDY:        { iconify: 'mdi:candy',             char: '🍬' },
  MONEY:        { iconify: 'mdi:cash',              char: '💰' },
  PACKAGE:      { iconify: 'mdi:package-variant',   char: '📦' },

  // ── Magic / Effects ──
  SPARKLES:     { iconify: 'mdi:sparkles',          char: '✨' },
  LIGHTNING:    { iconify: 'mdi:lightning-bolt',    char: '⚡' },
  TORNADO:      { iconify: 'mdi:weather-tornado',   char: '🌪️' },

  // ── Stats / Info ──
  CHART:        { iconify: 'mdi:chart-bar',         char: '📊' },
  MEDAL:        { iconify: 'mdi:medal',             char: '🎖️' },
}

/** Resolve an icon name to its Iconify ID */
export function iconifyId(name: string): string {
  return ICON_DEFS[name]?.iconify ?? ''
}

/** Resolve an icon name to its Unicode fallback */
export function unicodeChar(name: string): string {
  return ICON_DEFS[name]?.char ?? ''
}

/**
 * Generate a URL to the real Iconify SVG icon via the public API.
 * Discord embeds can render this as a thumbnail/image.
 *
 * @param name  - Uppercase icon key (e.g. 'SWORDS')
 * @param color - Optional hex color (e.g. '#9B59B6')
 * @returns Full Iconify API URL, or empty string if not found
 *
 * @example
 *   embed.setThumbnail(iconifyUrl('SWORDS', '#9B59B6'))
 *   // → https://api.iconify.design/mdi/sword-cross.svg?color=%239B59B6
 */
export function iconifyUrl(name: string, color?: string): string {
  const id = ICON_DEFS[name]?.iconify
  if (!id) return ''

  let url = `${ICONIFY_API_BASE}/${id}.svg`
  if (color) {
    url += `?color=${encodeURIComponent(color)}`
  }
  return url
}

/**
 * Shortcut using a numeric hex color (common in Discord embed styling).
 *
 * @param name     - Uppercase icon key
 * @param hexColor - Color as number (e.g. 0x9B59B6)
 * @returns Full Iconify API URL
 */
export function iconifyUrlFromColor(name: string, hexColor: number): string {
  const hex = `#${hexColor.toString(16).padStart(6, '0')}`
  return iconifyUrl(name, hex)
}