const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! to check if the bot is responsive.'),

    async execute(interaction, client) {
        await interaction.reply('Pong!')
    }
}
