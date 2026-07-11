const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const { addGominolas, incrementButterflyCaught } = require('#services/database')

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
                `+**${reward} Gominolas Moradas** han sido anadidas a su inventario.`
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
            await addGominolas(interaction.user.id, interaction.user.username, reward, 'Atrapo una mariposa morada con /catch!')
            await incrementButterflyCaught(interaction.user.id)
        } catch (error) {
            console.error('[catchCommand] Database error while rewarding:', error.message)
        }

        await interaction.editReply(
            `Atrapaste la mariposa morada con **/catch**! Ganaste **${reward} Gominolas Moradas**`
        )
    }
}
