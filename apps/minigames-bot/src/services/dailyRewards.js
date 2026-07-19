const { prisma, getOrCreateUser } = require('#services/database')

/**
 * Claim the daily reward for a user.
 * Returns { amount, streak }
 */
async function claimDaily(discordId, guildId, username) {
    const now = new Date()

    const user = await getOrCreateUser(discordId, guildId, username)

    if (user.lastDailyClaim) {
        const last = new Date(user.lastDailyClaim)
        const msSince = now - last
        const dayMs = 24 * 60 * 60 * 1000
        if (msSince < dayMs) {
            const remaining = Math.ceil((dayMs - msSince) / 1000)
            const err = new Error('Daily already claimed')
            err.code = 'ALREADY_CLAIMED'
            err.remaining = remaining
            throw err
        }
    }

    // Determine streak: if claimed within the previous 48h window -> streak+1, else reset to 1
    let newStreak = 1
    if (user.lastDailyClaim) {
        const last = new Date(user.lastDailyClaim)
        const msSince = now - last
        const oneDay = 24 * 60 * 60 * 1000
        const twoDays = oneDay * 2
        if (msSince < twoDays) {
            newStreak = Math.min(7, (user.dailyStreak || 0) + 1)
        }
    }

    const rewardsByDay = [10, 12, 14, 16, 18, 20, 25]
    const amount = rewardsByDay[Math.max(0, Math.min(newStreak - 1, rewardsByDay.length - 1))]

    // Persist in a transaction: update user streak/last claim and create transaction log
    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                candies: { increment: amount },
                totalEarned: { increment: amount },
                lastDailyClaim: now,
                dailyStreak: newStreak,
            },
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'earn',
                amount,
                balanceAfter: (user.candies || 0) + amount,
                description: `Daily reward (day ${newStreak})`,
            },
        }),
    ])

    return { amount, streak: newStreak, user: updatedUser }
}

async function getDailyInfo(discordId, guildId) {
    const user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId, guildId } } })
    if (!user) return null
    return { lastDailyClaim: user.lastDailyClaim, dailyStreak: user.dailyStreak }
}

module.exports = { claimDaily, getDailyInfo }
