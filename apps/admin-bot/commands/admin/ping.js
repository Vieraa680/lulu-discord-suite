const { SlashCommandBuilder } = require('discord.js')
const { prisma } = require('@lulu-discord/database')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-ping')
        .setDescription('Check admin bot and database latency.'),

    async execute(interaction) {
        const startedAt = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const dbLatency = Date.now() - startedAt
        const wsLatency = Math.round(interaction.client.ws.ping)

        await interaction.reply({
            content: `🏓 Admin pong — WS: ${wsLatency}ms · DB: ${dbLatency}ms`,
            ephemeral: true
        })
    }
}
