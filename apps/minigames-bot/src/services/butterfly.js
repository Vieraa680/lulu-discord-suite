const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const { addCandies } = require('#services/database')
const { detectGender, g } = require('#utils/gender')

function parseChannelId(customId) {
    const parts = customId.split(':')
    return parts.length === 2 ? parts[1] : null
}

async function handleButterflyCatch(interaction, client) {
    const channelId = parseChannelId(interaction.customId)

    if (!channelId) {
        await interaction.reply({
            content: 'error con el botón, usá `/catch` mejor',
            ephemeral: true
        })
        return
    }

    const activeButterflies = client._activeButterflies
    if (!activeButterflies) {
        await interaction.reply({
            content: 'no hay ninguna mariposa activa ahora',
            ephemeral: true
        })
        return
    }

    const butterfly = activeButterflies.get(channelId)
    if (!butterfly) {
        await interaction.reply({
            content: 'no hay mariposa en este canal, esperá a que aparezca una',
            ephemeral: true
        })
        return
    }

    if (butterfly.caught) {
        await interaction.reply({
            content: 'alguien ya la atrapó, la próxima sé más rápido',
            ephemeral: true
        })
        return
    }

    butterfly.caught = true
    activeButterflies.delete(channelId)

    const reward = butterfly.reward
    const tag = interaction.user.toString()
    const gender = detectGender(interaction.member)

    const caughtEmbed = new EmbedBuilder()
        .setTitle('¡Mariposa Atrapada!')
        .setDescription(
            `${tag} fue más rápid${g(gender, { m: 'o', f: 'a' })} que **Pix** y atrapó la Mariposa Morada!\n\n` +
            `+**${reward} Candies** añadidos a tu saldo 🍬`
        )
        .setColor(0xA020F0)
        .setFooter({ text: 'seguí chateando para que aparezca otra 👀' })
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
            'Atrapó una mariposa morada!'
        )
    } catch (error) {
        console.error('[butterflyService] Database error while rewarding:', error.message)
    }

    try {
        await interaction.followUp({
            content: `atrapaste la mariposa! +**${reward} Candies** 🍬`,
            ephemeral: true
        })
    } catch {
        // interaction may have already been responded to
    }
}

module.exports = { handleButterflyCatch }
