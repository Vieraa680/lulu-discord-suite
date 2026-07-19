const { handleButterflyCatch } = require('#services/butterfly')
const { handlePolymorphiaInteraction } = require('#polymorphia/polymorphiaInteractions')
const logger = require('#utils/logger')
const rateLimiter = require('#utils/RateLimiter')

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        if ((interaction.isButton() || interaction.isAnySelectMenu()) &&
            interaction.customId.startsWith('polymorphia_')) {
            return handlePolymorphiaInteraction(interaction)
        }

    if (interaction.isButton() && interaction.customId.startsWith('butterfly_catch:')) {
            return handleButterflyCatch(interaction, client)
    }

        if (interaction.isButton() && interaction.customId.startsWith('events_nav:')) {
            try {
                const parts = interaction.customId.split(':')
                const guildId = parts[1]
                let pageIndex = parseInt(parts[2], 10)
                const invokerId = parts[3]
                if (interaction.user.id !== invokerId) {
                    await interaction.reply({ content: 'Solo el autor del comando puede navegar estas páginas.', ephemeral: true })
                    return
                }

                const eventManager = require('#services/EventManager')
                const events = await eventManager.getActiveEvents(guildId)
                if (!events || events.length === 0) {
                    await interaction.update({ content: 'No hay eventos activos', embeds: [], components: [] })
                    return
                }

                const pageSize = 3
                const pages = []
                const niceTypeMap = {
                    double_candies: { label: 'Doble Gominolas', emoji: '🍬', color: 0xE67E22 },
                    double_butterflies: { label: 'Doble Mariposas', emoji: '🦋', color: 0x9B59B6 },
                    tournament: { label: 'Torneo', emoji: '🏆', color: 0x2ECC71 },
                    boss: { label: 'Jefe', emoji: '👹', color: 0xE74C3C }
                }

                function formatRemaining(endsAt) {
                    const now = Date.now()
                    const delta = new Date(endsAt).getTime() - now
                    if (delta <= 0) return 'finalizado'
                    const mins = Math.floor(delta / 60000)
                    if (mins < 60) return `${mins}m restante`
                    const hrs = Math.floor(mins / 60)
                    const rem = mins % 60
                    return `${hrs}h ${rem}m restante`
                }

                for (let i = 0; i < events.length; i += pageSize) {
                    const slice = events.slice(i, i + pageSize)
                    const { EmbedBuilder } = require('discord.js')
                    const embed = new EmbedBuilder()
                        .setTitle('Eventos activos')
                        .setDescription(`Hay **${events.length}** evento(s) activo(s) en este servidor`)
                        .setTimestamp()

                    for (const e of slice) {
                        const meta = niceTypeMap[e.type] || { label: e.type, emoji: '🎫', color: 0x95A5A6 }
                        const starts = `<t:${Math.floor(new Date(e.startsAt).getTime() / 1000)}:f>`
                        const ends = `<t:${Math.floor(new Date(e.endsAt).getTime() / 1000)}:f>`
                        const remaining = formatRemaining(e.endsAt)
                        const multiplier = e.payload?.multiplier ? `${e.payload.multiplier}×` : 'N/A'

                        embed.addFields({ name: `${meta.emoji} ${meta.label} — ${e.id.slice(0, 8)}`, value: `**Inicio:** ${starts}\n**Fin:** ${ends} (${remaining})\n**Multiplicador:** ${multiplier}`, inline: false })
                        if (!embed.data.color) embed.setColor(meta.color)
                    }
                    pages.push(embed)
                }

                const pageCount = pages.length
                if (isNaN(pageIndex) || pageIndex < 0) pageIndex = 0
                if (pageIndex >= pageCount) pageIndex = pageCount - 1

                const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
                const row = new ActionRowBuilder()
                if (pageCount > 1) {
                    row.addComponents(
                        new ButtonBuilder().setCustomId(`events_nav:${guildId}:${Math.max(0, pageIndex - 1)}:${invokerId}`).setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 0),
                        new ButtonBuilder().setCustomId(`events_nav:${guildId}:${Math.min(pageCount - 1, pageIndex + 1)}:${invokerId}`).setLabel('Siguiente ▶️').setStyle(ButtonStyle.Primary).setDisabled(pageIndex === pageCount - 1)
                    )
                }

                const components = pageCount > 1 ? [row] : []
                await interaction.update({ embeds: [pages[pageIndex]], components })

                try {
                    const msg = await interaction.fetchReply()
                    const { resetDisable } = require('#services/eventPagination')
                    const ttl = parseInt(process.env.EVENT_PAGINATION_TTL_MS, 10) || 15 * 60 * 1000
                    resetDisable(msg, ttl)
                } catch (err) {
                    try { const logger = require('#utils/logger').child({ service: 'events' }); logger.warn({ err }, 'Failed to reset pagination timer') } catch (e) {}
                }
                return
            } catch (err) {
                const logger = require('#utils/logger').child({ service: 'events' })
                logger.error({ err }, 'Error handling events_nav button')
                try { await interaction.reply({ content: 'Error interno al navegar las páginas', ephemeral: true }) } catch (e) {}
                return
            }
        }

        // ── Slash commands ──
        if (!interaction.isChatInputCommand()) return

        if (!client.commands || client.commands.size === 0) {
            logger.warn('[interactionCreate] No commands loaded. Skipping command execution.')
            return
        }

        const command = client.commands.get(interaction.commandName)

        if (!command) {
            logger.warn({ command: interaction.commandName }, 'Unknown command')
            return
        }

        try {
            // Rate limiting: check per user & command (admins bypass)
            const userId = interaction.user?.id || (interaction.member && interaction.member.user && interaction.member.user.id)
            const member = interaction.member
            const isAdmin = rateLimiter.isAdminMember(member)
            if (userId) {
                const { limited, remainingMs } = rateLimiter.isRateLimited(userId, interaction.commandName, isAdmin)
                if (limited) {
                    const remainingSec = Math.ceil(remainingMs / 1000)
                    await interaction.reply({ content: `Por favor espera ${remainingSec} segundo(s) antes de volver a usar este comando.`, ephemeral: true })
                    return
                }
                // mark usage
                rateLimiter.touch(userId, interaction.commandName)
            }

            await command.execute(interaction, client)
        } catch (error) {
            logger.error({ err: error, command: interaction.commandName }, 'Error executing command')

            const replyPayload = {
                content: 'Ocurrió un error al ejecutar ese comando. Intenta de nuevo más tarde.',
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
