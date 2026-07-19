module.exports = {
    name: 'interactionCreate',

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return

        const command = interaction.client.commands.get(interaction.commandName)
        if (!command) {
            await interaction.reply({ content: 'Command not found.', ephemeral: true })
            return
        }

        try {
            await command.execute(interaction)
        } catch (error) {
            console.error(`[AdminBot] Error executing /${interaction.commandName}:`, error)

            const payload = { content: 'Something went wrong while running that admin command.', ephemeral: true }
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(payload)
            } else {
                await interaction.reply(payload)
            }
        }
    }
}
