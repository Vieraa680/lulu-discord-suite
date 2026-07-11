module.exports = {
    name: 'ping',
    description: 'Replies with Pong! to check if the bot is responsive.',

    /**
     * Executes the ping command.
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     * @param {import('discord.js').Client} client
     */
    execute(message, args, client) {
        message.reply('Pong!')
    }
}