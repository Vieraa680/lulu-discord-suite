const { PrismaClient } = require('@prisma/client')

const prisma = globalThis.__prismaClient__ ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaClient__ = prisma
}

/**
 * Retrieves a Discord user from the database or creates a new record if one
 * does not already exist. Uses the Discord snowflake as the primary key.
 *
 * @param {string} userId - Discord snowflake
 * @param {string} username - Discord username (for new records)
 * @returns {Promise<import('@prisma/client').User>}
 */
async function getOrCreateUser(userId, username) {
    return prisma.user.upsert({
        where: { id: userId },
        update: { username },
        create: {
            id: userId,
            username
        }
    })
}

/**
 * Adds gominolas (currency) to a user's balance and creates an audit
 * transaction record.
 *
 * @param {string} userId - Discord snowflake
 * @param {string} username - Discord username
 * @param {number} amount - Amount of gominolas to add (must be positive)
 * @param {string} description - Reason for the transaction
 * @returns {Promise<import('@prisma/client').User>}
 */
async function addGominolas(userId, username, amount, description) {
    const user = await getOrCreateUser(userId, username)

    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: userId },
            data: {
                gominolas: { increment: amount },
                totalEarned: { increment: amount }
            }
        }),
        prisma.transaction.create({
            data: {
                userId,
                type: 'earn',
                amount,
                balanceAfter: user.gominolas + amount,
                description
            }
        })
    ])

    return updatedUser
}

/**
 * Increments the butterfly catch counter for a user's polymorphia state.
 * Creates the polymorphia state record if it doesn't exist yet.
 *
 * @param {string} userId - Discord snowflake
 * @returns {Promise<void>}
 */
async function incrementButterflyCaught(userId) {
    await prisma.polymorphiaState.upsert({
        where: { userId },
        update: {
            butterfliesCaught: { increment: 1 },
            totalButterflies: { increment: 1 }
        },
        create: {
            userId,
            butterfliesCaught: 1,
            totalButterflies: 1
        }
    })
}

module.exports = {
    prisma,
    getOrCreateUser,
    addGominolas,
    incrementButterflyCaught
}
