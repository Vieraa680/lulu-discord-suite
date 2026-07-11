const PROGRESS_FULL = '▓'
const PROGRESS_EMPTY = '░'
const PROGRESS_BAR_LENGTH = 12

/**
 * Render a visual progress bar.
 *
 * @param {number} current   Current value (e.g. elapsed ms)
 * @param {number} max       Maximum value (e.g. total cooldown ms)
 * @param {number} [length]  Number of segments in the bar (default 12)
 * @returns {string}  e.g. "▓▓▓▓▓▓░░░░░░ 50%"
 */
function progressBar(current, max, length = PROGRESS_BAR_LENGTH) {
    if (max <= 0) return `${PROGRESS_FULL.repeat(length)} 100%`
    const ratio = Math.min(Math.max(current / max, 0), 1)
    const filled = Math.round(ratio * length)
    const empty = length - filled
    const pct = Math.round(ratio * 100)
    return `${PROGRESS_FULL.repeat(filled)}${PROGRESS_EMPTY.repeat(empty)} ${pct}%`
}

/**
 * Render a countdown / cooldown bar.
 * Shows time remaining instead of percentage.
 *
 * @param {number} remainingMs  Milliseconds remaining
 * @param {number} totalMs      Total duration in milliseconds
 * @param {number} [length]     Bar length (default 12)
 * @returns {string}  e.g. "▓▓▓▓▓▓░░░░░░ 3m 42s"
 */
function cooldownBar(remainingMs, totalMs, length = PROGRESS_BAR_LENGTH) {
    if (totalMs <= 0) return `${PROGRESS_FULL.repeat(length)} 0s`
    const ratio = Math.min(Math.max(remainingMs / totalMs, 0), 1)
    const filled = Math.round(ratio * length)
    const empty = length - filled
    const seconds = Math.ceil(remainingMs / 1000)
    const label = seconds >= 60
        ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
        : `${seconds}s`
    return `${PROGRESS_FULL.repeat(filled)}${PROGRESS_EMPTY.repeat(empty)} ${label}`
}

/**
 * Format a Discord timestamp for relative display.
 * @param {Date|number} date
 * @returns {string} Discord relative timestamp string
 */
function relativeTimestamp(date) {
    const ms = date instanceof Date ? date.getTime() : date
    return `<t:${Math.floor(ms / 1000)}:R>`
}

/**
 * Format a Discord timestamp for short datetime display.
 * @param {Date|number} date
 * @returns {string} Discord short datetime string
 */
function shortTimestamp(date) {
    const ms = date instanceof Date ? date.getTime() : date
    return `<t:${Math.floor(ms / 1000)}:f>`
}

/**
 * Get an embed color based on a rarity string.
 * @param {string} rarity
 * @returns {number} Hex color as number
 */
function colorFromRarity(rarity) {
    const colors = {
        common: 0x95A5A6,
        uncommon: 0x2ECC71,
        rare: 0x3498DB,
        epic: 0x9B59B6,
        legendary: 0xF1C40F
    }
    return colors[rarity?.toLowerCase()] || 0x9B59B6
}

/**
 * Format a number with locale separators.
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
    return n.toLocaleString('en-US')
}

module.exports = {
    progressBar,
    cooldownBar,
    relativeTimestamp,
    shortTimestamp,
    colorFromRarity,
    formatNumber,
    PROGRESS_BAR_LENGTH
}
