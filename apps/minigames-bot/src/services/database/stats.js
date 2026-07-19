const { prisma } = require('./prisma')

async function getServerStats(guildId) {
    const [
        totalUsers,
        totalCandies,
        totalEarned,
        totalSpent,
        totalPolymorphiaDuels,
        totalPolymorphiaWins,
        totalPolymorphiaLosses,
        totalPolymorphiaSaved,
        activePolymorphiaCount,
        totalTransactions
    ] = await Promise.all([
        prisma.user.count({ where: { guildId } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { candies: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { totalEarned: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { totalSpent: true } }),
        prisma.user.aggregate({
            where: { guildId },
            _sum: { polymorphiaWins: true, polymorphiaLosses: true }
        }),
        prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaWins: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaLosses: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaSaved: true } }),
        prisma.polymorphiaState.count({
            where: {
                guildId,
                isActive: true
            }
        }),
        prisma.transaction.count({
            where: {
                user: { guildId }
            }
        })
    ])

    return {
        totalUsers,
        totalCandiesInEconomy: totalCandies._sum.candies || 0,
        totalEarned: totalEarned._sum.totalEarned || 0,
        totalSpent: totalSpent._sum.totalSpent || 0,
        totalDuels: (totalPolymorphiaDuels._sum.polymorphiaWins || 0) + (totalPolymorphiaDuels._sum.polymorphiaLosses || 0),
        totalPolymorphiaWins: totalPolymorphiaWins._sum.polymorphiaWins || 0,
        totalPolymorphiaLosses: totalPolymorphiaLosses._sum.polymorphiaLosses || 0,
        totalPolymorphiaSaved: totalPolymorphiaSaved._sum.polymorphiaSaved || 0,
        activePolymorphiaCount,
        totalTransactions
    }
}

async function getLeaderboard(guildId, category, limit = 10) {
    const allowedFields = ['candies', 'polymorphiaWins', 'polymorphiaSaved', 'totalEarned', 'polymorphiaLosses']
    if (!allowedFields.includes(category)) {
        throw new Error(`Invalid leaderboard category: "${category}". Allowed: ${allowedFields.join(', ')}`)
    }

    const users = await prisma.user.findMany({
        where: {
            guildId,
            [category]: { gt: 0 }
        },
        orderBy: { [category]: 'desc' },
        take: limit,
        select: {
            discordId: true,
            username: true,
            [category]: true
        }
    })

    return users.map(u => ({
        discordId: u.discordId,
        username: u.username,
        value: u[category]
    }))
}

async function getButterflyCaughtCount(guildId) {
    return prisma.transaction.count({
        where: {
            description: { contains: 'mariposa' },
            user: { guildId }
        }
    })
}

module.exports = { getServerStats, getLeaderboard, getButterflyCaughtCount }
