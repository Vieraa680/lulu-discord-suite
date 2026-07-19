const { prisma } = require('./prisma')

async function createPolymorphiaState(userId, guildId, previousNickname, currentForm, durationMinutes) {
    const now = new Date()
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000)

    return prisma.polymorphiaState.upsert({
        where: { userId },
        update: {
            isActive: true,
            currentForm,
            previousNickname,
            formDuration: durationMinutes,
            startedAt: now,
            endsAt,
            guildId
        },
        create: {
            userId,
            isActive: true,
            currentForm,
            previousNickname,
            formDuration: durationMinutes,
            startedAt: now,
            endsAt,
            guildId
        }
    })
}

async function expirePolymorphiaState(stateId) {
    return prisma.polymorphiaState.update({
        where: { id: stateId },
        data: {
            isActive: false,
            currentForm: '',
            startedAt: null,
            endsAt: null
        }
    })
}

async function recordDuelResult(winnerId, loserId, isDefended) {
    const operations = [
        prisma.user.update({
            where: { id: winnerId },
            data: { polymorphiaWins: { increment: 1 } }
        }),
        prisma.user.update({
            where: { id: loserId },
            data: { polymorphiaLosses: { increment: 1 } }
        })
    ]

    if (isDefended) {
        operations.push(
            prisma.user.update({
                where: { id: loserId },
                data: { polymorphiaSaved: { increment: 1 } }
            })
        )
    }

    return prisma.$transaction(operations)
}

async function recordDefenderWin(defenderId, attackerId) {
    return prisma.$transaction([
        prisma.user.update({
            where: { id: defenderId },
            data: { polymorphiaSaved: { increment: 1 } }
        }),
        prisma.user.update({
            where: { id: attackerId },
            data: { polymorphiaLosses: { increment: 1 } }
        })
    ])
}

async function getPolymorphiaStats(discordId, guildId) {
    return prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: { state: true }
    })
}

async function incrementDailyDuelCount(userId, isNewDay) {
    return prisma.user.update({
        where: { id: userId },
        data: {
            dailyDuelCount: isNewDay ? 1 : { increment: 1 },
            dailyDuelDate: new Date()
        }
    })
}

module.exports = {
    createPolymorphiaState,
    expirePolymorphiaState,
    recordDuelResult,
    recordDefenderWin,
    getPolymorphiaStats,
    incrementDailyDuelCount
}
