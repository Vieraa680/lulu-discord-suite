const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responde con Pong! para verificar si el bot responde.'),

    async execute(interaction, client) {
        await interaction.reply('Pong!')
    }
}