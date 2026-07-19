const { prisma } = require('./prisma')
const { getOrCreateUser } = require('./users')

async function addCandies(discordId, guildId, username, amount, description) {
    const user = await getOrCreateUser(discordId, guildId, username)

    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                candies: { increment: amount },
                totalEarned: { increment: amount }
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'earn',
                amount,
                balanceAfter: user.candies + amount,
                description
            }
        })
    ])

    return updatedUser
}

async function spendCandies(discordId, guildId, username, amount, description) {
    const user = await getOrCreateUser(discordId, guildId, username)

    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                candies: { decrement: amount },
                totalSpent: { increment: amount }
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'spend',
                amount,
                balanceAfter: user.candies - amount,
                description
            }
        })
    ])

    return updatedUser
}

module.exports = { addCandies, spendCandies }
