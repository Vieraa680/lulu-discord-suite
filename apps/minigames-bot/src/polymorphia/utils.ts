const PROGRESS_FULL = '▓'
const PROGRESS_EMPTY = '░'
const PROGRESS_BAR_LENGTH = 12

/**
 * Render a visual progress bar.
 *
 * @param current - Current value (e.g. elapsed ms)
 * @param max     - Maximum value (e.g. total cooldown ms)
 * @param length  - Number of segments in the bar (default 12)
 * @returns       - Progress bar
 */
function progressBar(current: number, max: number, length: number = PROGRESS_BAR_LENGTH): string {
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
 * @param remainingMs - Milliseconds remaining
 * @param totalMs     - Total duration in milliseconds
 * @param length      - Bar length (default 12)
 * @returns           - Progress bar
 */
function cooldownBar(remainingMs: number, totalMs: number, length: number = PROGRESS_BAR_LENGTH): string {
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
 * @param date - Date object or Unix timestamp in milliseconds
 * @returns Discord relative timestamp string
 */
function relativeTimestamp(date: Date | number): string {
    const ms = date instanceof Date ? date.getTime() : date
    return `<t:${Math.floor(ms / 1000)}:R>`
}

/**
 * Format a Discord timestamp for short datetime display.
 * @param date - Date object or Unix timestamp in milliseconds
 * @returns Discord short datetime string
 */
function shortTimestamp(date: Date | number): string {
    const ms = date instanceof Date ? date.getTime() : date
    return `<t:${Math.floor(ms / 1000)}:f>`
}

/**
 * Get an embed color based on a rarity string.
 * @param rarity
 * @returns Hex color as number
 */
function colorFromRarity(rarity: string): number {
    const colors: Record<string, number> = {
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
 * @param n
 * @returns Formatted number string
 */
function formatNumber(n: number): string {
    return n.toLocaleString('en-US')
}

export {
    progressBar,
    cooldownBar,
    relativeTimestamp,
    shortTimestamp,
    colorFromRarity,
    formatNumber,
    PROGRESS_BAR_LENGTH
}