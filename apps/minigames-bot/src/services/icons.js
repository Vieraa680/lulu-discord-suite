const ICONIFY_API_BASE = 'https://api.iconify.design'

// @type {Record<string, { iconify: string, char: string }>}
const ICON_DEFS = {
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

// Build exported object: each constant resolves to the Unicode string for Discord
const ICONS = {}
for (const [key, def] of Object.entries(ICON_DEFS)) {
    ICONS[key] = def.char
}

// Attach raw definitions so the dashboard can read Iconify IDs
ICONS.ICON_DEFS = ICON_DEFS

/**
 * Resolve an icon name to its Unicode character.
 * @param {string} name - Uppercase icon key (e.g. 'SWORDS')
 * @returns {string} Unicode emoji or empty string if not found
 */
ICONS.resolve = (name) => ICON_DEFS[name]?.char || ''

/**
 * Resolve an icon name to its Iconify identifier.
 * @param {string} name - Uppercase icon key (e.g. 'SWORDS')
 * @returns {string} Iconify ID (e.g. 'mdi:sword-cross') or empty string
 */
ICONS.resolveIconify = (name) => ICON_DEFS[name]?.iconify || ''

/**
 * Generate a URL to an Iconify icon via the public API.
 * Uses PNG format because Discord's media proxy doesn't render SVGs reliably.
 *
 * @param {string} name     - Uppercase icon key (e.g. 'SWORDS')
 * @param {string} [color]  - Optional hex color (e.g. '#9B59B6')
 * @returns {string} Full Iconify API URL, or empty string if not found
 *
 * @example
 *   embed.setThumbnail(iconifyUrl('SWORDS', '#9B59B6'))
 *   // → https://api.iconify.design/mdi/sword-cross.png?color=%239B59B6
 */
function iconifyUrl(name, color) {
    const iconify = ICON_DEFS[name]?.iconify
    if (!iconify) return ''

    const path = iconify.replace(':', '/')
    let svgUrl = `${ICONIFY_API_BASE}/${path}.svg`
    if (color) {
        const encoded = encodeURIComponent(color)
        svgUrl += `?color=${encoded}`
    }
    return `https://images.weserv.nl/?url=${encodeURIComponent(svgUrl)}&output=png&w=256&h=256`
}

/**
 * Shortcut to get an Iconify URL using a Discord embed color number.
 *
 * @param {string} name      - Uppercase icon key
 * @param {number} hexColor  - Discord embed color as number (e.g. 0x9B59B6)
 * @returns {string} Full Iconify API URL
 *
 * @example
 *   embed.setThumbnail(iconifyUrlFromColor('SWORDS', 0x9B59B6))
 */
function iconifyUrlFromColor(name, hexColor) {
    const hex = typeof hexColor === 'number'
        ? `#${hexColor.toString(16).padStart(6, '0')}`
        : hexColor
    return iconifyUrl(name, hex)
}

ICONS.iconifyUrl = iconifyUrl
ICONS.iconifyUrlFromColor = iconifyUrlFromColor

module.exports = ICONS
