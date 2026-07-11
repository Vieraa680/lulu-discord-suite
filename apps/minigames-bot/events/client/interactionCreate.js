const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js')
const { addGominolas, incrementButterflyCaught } = require('../../src/services/database')

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        if (interaction.isButton() && interaction.customId.startsWith('butterfly_catch:')) {
            return handleButterflyCatch(interaction, client)
        }

        if (!interaction.isChatInputCommand()) return

        if (!client.commands || client.commands.size === 0) {
            console.warn('[interactionCreate] No commands loaded. Skipping command execution.')
            return
        }

        const command = client.commands.get(interaction.commandName)

        if (!command) {
            console.warn(`[interactionCreate] Unknown command: ${interaction.commandName}`)
            return
        }

        try {
            await command.execute(interaction, client)
        } catch (error) {
            console.error(`[interactionCreate] Error executing command "${interaction.commandName}":`, error)

            const replyPayload = {
                content: 'There was an error executing that command. Please try again later.',
                ephemeral: true
            }

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(replyPayload)
            } else {
                await interaction.reply(replyPayload)
            }
        }
    }
}

function parseChannelId(customId) {
    const parts = customId.split(':')
    return parts.length === 2 ? parts[1] : null
}

async function handleButterflyCatch(interaction, client) {
    const channelId = parseChannelId(interaction.customId)

    if (!channelId) {
        await interaction.reply({ content: '❌ Error al procesar el botón. Intenta con `/catch` en su lugar.', ephemeral: true })
        return
    }

    const activeButterflies = client._activeButterflies
    if (!activeButterflies) {
        await interaction.reply({ content: '❌ No hay ninguna mariposa activa en este momento.', ephemeral: true })
        return
    }

    const butterfly = activeButterflies.get(channelId)

    if (!butterfly) {
        await interaction.reply({ content: '🦋 No hay ninguna mariposa en este canal. ¡Espera a que aparezca una!', ephemeral: true })
        return
    }

    if (butterfly.caught) {
        await interaction.reply({ content: '😅 ¡Alguien ya atrapó esta mariposa! La próxima vez sé más rápido.', ephemeral: true })
        return
    }

    butterfly.caught = true
    activeButterflies.delete(channelId)

    const reward = butterfly.reward
    const tag = interaction.user.toString()

    const caughtEmbed = new EmbedBuilder()
        .setTitle('🦋 ¡Mariposa Atrapada!')
        .setDescription(
            `¡${tag} fue más rápido que **Pix** y atrapó la Mariposa Morada! 💜\n\n` +
            `+**${reward} Gominolas Moradas** han sido añadidas a su inventario.`
        )
        .setColor(0xA020F0)
        .setFooter({ text: '¡Sigue participando en el chat para que aparezca la siguiente!' })
        .setTimestamp()

    const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(butterfly.customId)
            .setLabel('🦋 ¡Atrapar!')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
    )

    try {
        await interaction.update({ embeds: [caughtEmbed], components: [disabledRow] })
    } catch (error) {
        console.error('[butterflyCatch] interaction.update() failed:', error.message)
        try {
            const msg = await interaction.channel.messages.fetch(butterfly.messageId)
            await msg.edit({ embeds: [caughtEmbed], components: [disabledRow] })
        } catch {
            // give up
        }
    }

    try {
        await addGominolas(interaction.user.id, interaction.user.username, reward, '¡Atrapó una mariposa morada!')
        await incrementButterflyCaught(interaction.user.id)
    } catch (error) {
        console.error('[butterflyCatch] Database error while rewarding:', error.message)
    }

    try {
        await interaction.followUp({
            content: `🦋 ¡Atrapaste la mariposa morada! Ganaste **${reward} Gominolas Moradas** 💜`,
            ephemeral: true
        })
    } catch {
        // interaction may have already been responded to
    }
}