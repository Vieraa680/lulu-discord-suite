const { logger, rateLimiter } = require('@lulu-discord/bot-utils')

module.exports = {
    name: 'interactionCreate',

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return

        const base = logger.child({ service: 'interaction' })

        const command = interaction.client.commands.get(interaction.commandName)
        if (!command) {
            await interaction.reply({ content: 'Command not found.', ephemeral: true })
            return
        }

        try {
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
                rateLimiter.touch(userId, interaction.commandName)
            }

            await command.execute(interaction)
        } catch (error) {
            base.error({ err: error, command: interaction.commandName }, 'Error executing command')

            const payload = { content: 'Ocurrió un error al ejecutar ese comando. Intenta de nuevo más tarde.', ephemeral: true }
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload)
            } else {
                await interaction.reply(payload)
            }
        }
    }
}
