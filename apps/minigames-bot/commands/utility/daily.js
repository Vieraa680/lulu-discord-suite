const { SlashCommandBuilder } = require('discord.js')
const { claimDaily } = require('#services/dailyRewards')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Reclama tu recompensa diaria de candies.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })

        try {
            const result = await claimDaily(
                interaction.user.id,
                interaction.guildId,
                interaction.user.username
            )

            await interaction.editReply(
                `Has reclamado tu recompensa diaria: **${result.amount} Candies**. Racha actual: **${result.streak}**.`
            )
        } catch (err) {
            const logger = require('#utils/logger').child({ command: 'daily' })
            if (err && err.code === 'ALREADY_CLAIMED') {
                const secs = err.remaining || 0
                await interaction.editReply(`Ya reclamaste hoy. Intenta de nuevo en ${secs} segundos.`)
                return
            }
            logger.error({ err }, 'Failed to claim daily reward')
            await interaction.editReply('Error al procesar tu recompensa diaria. Intentalo mas tarde.')
        }
    }
}
