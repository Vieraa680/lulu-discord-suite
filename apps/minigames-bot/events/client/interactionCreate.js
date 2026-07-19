const { handleButterflyCatch } = require('#services/butterfly')
const { handlePolymorphiaInteraction } = require('#polymorphia/polymorphiaInteractions')
const logger = require('#utils/logger')
const rateLimiter = require('#utils/RateLimiter')

module.exports = {
    name: 'interactionCreate',

    async execute(interaction, client) {
        // ── Route polymorphia component interactions (buttons) ──
        if ((interaction.isButton() || interaction.isAnySelectMenu()) &&
            interaction.customId.startsWith('polymorphia_')) {
            return handlePolymorphiaInteraction(interaction)
        }

        // ── Route butterfly catch buttons ──
        if (interaction.isButton() && interaction.customId.startsWith('butterfly_catch:')) {
            return handleButterflyCatch(interaction, client)
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
