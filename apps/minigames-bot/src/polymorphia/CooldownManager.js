const { prisma } = require('#services/database')

const DUEL_COOLDOWN_MS = 10 * 60 * 1000         // 10 minutes between initiating duels
const PROTECTION_MS = 4 * 60 * 60 * 1000         // 4 hours immunity after being targeted
const DAILY_LIMIT = 5                             // Max duels initiated per day

/**
 * Check if a user can initiate a polymorphia duel.
 *
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId   - Discord server ID
 * @returns {Promise<{allowed: boolean, reason?: string, remainingMinutes?: number}>}
 */
async function canInitiateDuel(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })

    if (!user) return { allowed: true }

    // Cooldown check (10 min)
    if (user.lastPolymorphiaUse) {
        const elapsed = Date.now() - user.lastPolymorphiaUse.getTime()
        if (elapsed < DUEL_COOLDOWN_MS) {
            const remaining = Math.ceil((DUEL_COOLDOWN_MS - elapsed) / 1000 / 60)
            return {
                allowed: false,
                reason: 'cooldown',
                remainingMinutes: remaining
            }
        }
    }

    // Daily limit check (max 5 initiated duels in last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
    if (user.updatedAt > last24h) {
        const totalDuelStats = user.polymorphiaWins + user.polymorphiaLosses
        if (totalDuelStats >= DAILY_LIMIT) {
            return {
                allowed: false,
                reason: 'daily_limit',
                limit: DAILY_LIMIT
            }
        }
    }

    return { allowed: true }
}

/**
 * Check if a user can be targeted by a polymorphia duel (protection period).
 *
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId   - Discord server ID
 * @returns {Promise<{allowed: boolean, reason?: string, until?: Date}>}
 */
async function canBeTargeted(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })

    if (!user) return { allowed: true }

    if (user.polymorphiaProtectedUntil && user.polymorphiaProtectedUntil > new Date()) {
        return {
            allowed: false,
            reason: 'protection',
            until: user.polymorphiaProtectedUntil
        }
    }

    // Also check if the user is currently polymorphed
    const activeState = await prisma.polymorphiaState.findFirst({
        where: {
            user: { discordId, guildId },
            isActive: true
        }
    })

    if (activeState) {
        return {
            allowed: false,
            reason: 'already_polymorphed',
            until: activeState.endsAt
        }
    }

    return { allowed: true }
}

/**
 * Apply cooldown and protection timers after a duel.
 *
 * @param {string} attackerDiscordId
 * @param {string} defenderDiscordId
 * @param {string} guildId
 */
async function applyCooldowns(attackerDiscordId, defenderDiscordId, guildId) {
    const now = new Date()

    // Attacker: set lastPolymorphiaUse (10 min cooldown)
    await prisma.user.updateMany({
        where: { discordId: attackerDiscordId, guildId },
        data: { lastPolymorphiaUse: now }
    })

    // Defender: set protection (4h immunity)
    await prisma.user.updateMany({
        where: { discordId: defenderDiscordId, guildId },
        data: {
            polymorphiaProtectedUntil: new Date(now.getTime() + PROTECTION_MS)
        }
    })
}

module.exports = {
    DUEL_COOLDOWN_MS,
    PROTECTION_MS,
    DAILY_LIMIT,
    canInitiateDuel,
    canBeTargeted,
    applyCooldowns
}