module.exports = {
    name: 'interactionCreate',

    /**
     * Routes incoming interactions to the appropriate slash command.
     * Handles ChatInputCommandInteraction (slash commands).
     * @param {import('discord.js').Interaction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
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