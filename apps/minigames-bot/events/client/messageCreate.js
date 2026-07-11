module.exports = {
    name: 'messageCreate',

    /**
     * Routes incoming messages to the appropriate command.
     * Uses the legacy prefix "!" (e.g., !ping, !polymorphia).
     * @param {import('discord.js').Message} message
     * @param {import('discord.js').Client} client
     */
    execute(message, client) {
        if (message.author.bot) return
        if (!message.guild) return
        if (!message.content.startsWith('!')) return

        const args = message.content.slice(1).trim().split(/\s+/)
        const commandName = args.shift().toLowerCase()

        if (!client.commands || client.commands.size === 0) {
            console.warn('[messageCreate] No commands loaded. Skipping command execution.')
            return
        }

        const command = client.commands.get(commandName)

        if (!command) {
            return
        }

        try {
            command.execute(message, args, client)
        } catch (error) {
            console.error(`[messageCreate] Error executing command "${commandName}":`, error)
            message.reply('There was an error executing that command. Please try again later.')
        }
    }
}