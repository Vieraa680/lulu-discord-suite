const { prisma } = require('./prisma')

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

async function findUserByDiscord(discordId, guildId) {
    return prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
}

async function findUserById(id) {
    return prisma.user.findUnique({ where: { id } })
}

module.exports = { getOrCreateUser, findUserByDiscord, findUserById }
