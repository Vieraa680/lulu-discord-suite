module.exports = {
    name: 'polymorphia',
    description: 'League of Legends themed minigame — Polymorphia.',

    /**
     * Executes the Polymorphia minigame command.
     * @param {import('discord.js').Message} message
     * @param {string[]} args
     * @param {import('discord.js').Client} client
     */
    execute(message, args, client) {
        message.reply('Polymorphia minigame is coming soon! Stay tuned.')
    }
}