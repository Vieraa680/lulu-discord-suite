const { PrismaClient } = require('@prisma/client')

const prisma = globalThis.__prismaClient__ ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaClient__ = prisma
}

/**
 * Get or create a user record for a given Discord user in a specific guild.
 * @param {string} discordId - Discord User snowflake
 * @param {string} guildId   - Discord Server ID
 * @param {string} username  - Display name
 */
async function getOrCreateUser(discordId, guildId, username) {
    return prisma.user.upsert({
        where: {
            discordId_guildId: { discordId, guildId }
        },
        update: { username },
        create: {
            discordId,
            guildId,
            username
        }
    })
}

/**
 * Add candies to a user's balance and log the transaction.
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} username
 * @param {number} amount
 * @param {string} description
 */
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

module.exports = {
    prisma,
    getOrCreateUser,
    addCandies
}
