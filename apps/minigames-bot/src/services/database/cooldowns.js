const { prisma } = require('./prisma')

const DUEL_COOLDOWN_MS = 10 * 60 * 1000
const PROTECTION_MS = 4 * 60 * 60 * 1000
const DAILY_LIMIT = 5

async function canInitiateDuel(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) return { allowed: true }

    if (user.lastPolymorphiaUse) {
        const elapsed = Date.now() - user.lastPolymorphiaUse.getTime()
        if (elapsed < DUEL_COOLDOWN_MS) {
            const remaining = Math.ceil((DUEL_COOLDOWN_MS - elapsed) / 1000 / 60)
            return { allowed: false, reason: 'cooldown', remainingMinutes: remaining }
        }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (user.dailyDuelDate && user.dailyDuelDate >= today && user.dailyDuelCount >= DAILY_LIMIT) {
        return { allowed: false, reason: 'daily_limit', limit: DAILY_LIMIT }
    }

    return { allowed: true }
}

async function canBeTargeted(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) return { allowed: true }

    if (user.polymorphiaProtectedUntil && user.polymorphiaProtectedUntil > new Date()) {
        return { allowed: false, reason: 'protection', until: user.polymorphiaProtectedUntil }
    }

    const activeState = await prisma.polymorphiaState.findFirst({
        where: {
            user: { discordId, guildId },
            isActive: true
        }
    })
    if (activeState) {
        return { allowed: false, reason: 'already_polymorphed', until: activeState.endsAt }
    }

    return { allowed: true }
}

async function applyCooldowns(attackerDiscordId, defenderDiscordId, guildId) {
    const now = new Date()

    await prisma.user.updateMany({
        where: { discordId: attackerDiscordId, guildId },
        data: { lastPolymorphiaUse: now }
    })

    await prisma.user.updateMany({
        where: { discordId: defenderDiscordId, guildId },
        data: { polymorphiaProtectedUntil: new Date(now.getTime() + PROTECTION_MS) }
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
