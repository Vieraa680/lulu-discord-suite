const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-ban')
        .setDescription('Ban a user from the guild (placeholder).')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to ban')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the ban')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('target')
        const reason = interaction.options.getString('reason') || 'No reason provided'
        await interaction.reply({
            content: `🔨 Ban placeholder — would ban ${target.tag} (reason: ${reason}).`,
            ephemeral: true
        })
    }
}
