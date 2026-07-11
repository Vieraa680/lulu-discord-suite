const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const { addCandies } = require('#services/database')

function parseChannelId(customId) {
    const parts = customId.split(':')
    return parts.length === 2 ? parts[1] : null
}

async function handleButterflyCatch(interaction, client) {
    const channelId = parseChannelId(interaction.customId)

    if (!channelId) {
        await interaction.reply({
            content: 'Error al procesar el boton. Intenta con `/catch` en su lugar.',
            ephemeral: true
        })
        return
    }

    const activeButterflies = client._activeButterflies
    if (!activeButterflies) {
        await interaction.reply({
            content: 'No hay ninguna mariposa activa en este momento.',
            ephemeral: true
        })
        return
    }

    const butterfly = activeButterflies.get(channelId)
    if (!butterfly) {
        await interaction.reply({
            content: 'No hay ninguna mariposa en este canal. Espera a que aparezca una.',
            ephemeral: true
        })
        return
    }

    if (butterfly.caught) {
        await interaction.reply({
            content: 'Alguien ya atrapo esta mariposa. La proxima vez se mas rapido.',
            ephemeral: true
        })
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
        await interaction.update({ embeds: [caughtEmbed], components: [disabledRow] })
    } catch (error) {
        console.error('[butterflyService] interaction.update() failed:', error.message)
        try {
            const msg = await interaction.channel.messages.fetch(butterfly.messageId)
            await msg.edit({ embeds: [caughtEmbed], components: [disabledRow] })
        } catch {
            // message may have been deleted
        }
    }

    try {
        await addCandies(
            interaction.user.id,
            interaction.guildId,
            interaction.user.username,
            reward,
            'Atrapo una mariposa morada!'
        )
    } catch (error) {
        console.error('[butterflyService] Database error while rewarding:', error.message)
    }

    try {
        await interaction.followUp({
            content: `Atrapaste la mariposa morada! Ganaste **${reward} Candies**`,
            ephemeral: true
        })
    } catch {
        // interaction may have already been responded to
    }
}

module.exports = { handleButterflyCatch }
