const { PrismaClient } = require('@prisma/client')

const prisma = globalThis.__prismaClient__ ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaClient__ = prisma
}

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
