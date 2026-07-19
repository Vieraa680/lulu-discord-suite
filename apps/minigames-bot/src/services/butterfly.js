const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const { addCandies } = require('#services/database')
const { evaluateAchievements } = require('#services/achievements')
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

    let reward = butterfly.reward
    // If a double_butterflies event is active for this guild, double the reward
    try {
        const eventManager = require('./EventManager')
        const isDouble = await eventManager.isEventActive(interaction.guild.id, 'double_butterflies')
        if (isDouble) reward = reward * 2
    } catch (err) {
        // ignore if event manager fails
    }
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

    const logger = require('#utils/logger').child({ service: 'butterfly' })
    try {
        await interaction.update({ embeds: [caughtEmbed], components: [disabledRow] })
    } catch (error) {
        logger.error({ err: error }, 'interaction.update failed')
        try {
            const msg = await interaction.channel.messages.fetch(butterfly.messageId)
            await msg.edit({ embeds: [caughtEmbed], components: [disabledRow] })
        } catch (err) {
            logger.warn({ err }, 'Failed to edit butterfly message (may have been deleted)')
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

        const unlocked = await evaluateAchievements(interaction.user.id, interaction.guildId)
        if (unlocked.length > 0) {
            const names = unlocked.map(a => `${a.emoji} **${a.name}**`).join('\n')
            try {
                await interaction.followUp({
                    content: `🎉 ¡Nuevo logro desbloqueado!\n${names}`,
                    ephemeral: true
                })
            } catch (err) {
                logger.warn({ err }, 'Failed to send achievement follow-up')
            }
        }
    } catch (error) {
        logger.error({ err: error }, 'Database error while rewarding')
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
