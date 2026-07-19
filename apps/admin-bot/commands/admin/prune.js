const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-prune')
        .setDescription('Bulk-delete messages in a channel (placeholder).')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount') ?? 50
        await interaction.reply({
            content: `🧹 Prune placeholder — would delete ${amount} messages.`,
            ephemeral: true
        })
    }
}
