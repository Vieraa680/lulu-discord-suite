const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('polymorphia')
        .setDescription('League of Legends themed minigame — Polymorphia.')
        .addUserOption(option =>
            option
                .setName('target')
                .setDescription('The user to challenge to a Polymorphia duel')
                .setRequired(true)
        ),

    /**
     * Executes the Polymorphia minigame slash command.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {import('discord.js').Client} client
     */
    async execute(interaction, client) {
        const target = interaction.options.getUser('target')

        if (target.id === interaction.user.id) {
            await interaction.reply({
                content: 'You cannot challenge yourself to Polymorphia! Pick another summoner.',
                ephemeral: true
            })
            return
        }

        if (target.bot) {
            await interaction.reply({
                content: 'Bots cannot participate in Polymorphia. Challenge a real summoner!',
                ephemeral: true
            })
            return
        }

        await interaction.reply(
            `${interaction.user} has challenged ${target} to a **Polymorphia** duel! ⚔️\n` +
            'The minigame is coming soon — stay tuned, summoners!'
        )
    }
}