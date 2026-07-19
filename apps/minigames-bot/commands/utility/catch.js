const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const { addCandies } = require('#services/database')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('catch')
        .setDescription('Intenta atrapar una mariposa morada si hay una activa en el canal.'),

    async execute(interaction, client) {
        await interaction.deferReply({ ephemeral: true })

        const activeButterflies = client._activeButterflies
        if (!activeButterflies) {
            await interaction.editReply('No hay ninguna mariposa activa en este momento.')
            return
        }

        const channelId = interaction.channelId
        const butterfly = activeButterflies.get(channelId)

        if (!butterfly) {
            await interaction.editReply(
                'No hay ninguna mariposa en este canal en este momento. ' +
                'Sigue participando en el chat para que aparezca una!'
            )
            return
        }

        if (butterfly.caught) {
            await interaction.editReply(
                'Alguien ya atrapo esta mariposa. La proxima vez se mas rapido.'
            )
            return
        }

        butterfly.caught = true
        activeButterflies.delete(channelId)

        const reward = butterfly.reward
        const tag = interaction.user.toString()

        const caughtEmbed = new EmbedBuilder()
            .setTitle('Mariposa Atrapada!')
            .setDescription(
                `${tag} fue mas rapido que **Pix** y atrapo la Mariposa Morada!\n\n` +
                `+**${reward} Candies** han sido anadidos a tu saldo.`
            )
            .setColor(0xA020F0)
            .setFooter({ text: 'Sigue participando en el chat para que aparezca la siguiente!' })
            .setTimestamp()

        const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(butterfly.customId)
                .setLabel('Atrapar!')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        )

        try {
            const embedMessage = await interaction.channel.messages.fetch(butterfly.messageId)
            await embedMessage.edit({ embeds: [caughtEmbed], components: [disabledRow] })
        } catch {
            // message may have been deleted
        }

        try {
            await addCandies(
                interaction.user.id,
                interaction.guildId,
                interaction.user.username,
                reward,
                'Atrapo una mariposa morada con /catch!'
            )
        } catch (error) {
            const logger = require('#utils/logger').child({ command: 'catch' })
            logger.error({ err: error }, 'Database error while rewarding')
        }

        await interaction.editReply(
            `Atrapaste la mariposa morada con **/catch**! Ganaste **${reward} Candies**`
        )
    }
}
