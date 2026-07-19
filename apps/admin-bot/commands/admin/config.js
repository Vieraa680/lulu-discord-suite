const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-config')
        .setDescription('View or update guild configuration (placeholder).')
        .addSubcommand(sub =>
            sub.setName('show')
                .setDescription('Show current guild configuration')
        )
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set a configuration value')
                .addStringOption(opt =>
                    opt.setName('key')
                        .setDescription('Configuration key')
                        .setRequired(true)
                )
                .addStringOption(opt =>
                    opt.setName('value')
                        .setDescription('Configuration value')
                        .setRequired(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.options.getSubcommand() === 'show') {
            await interaction.reply({
                content: '⚙️ Config show placeholder — would display guild configuration.',
                ephemeral: true
            })
            return
        }

        const key = interaction.options.getString('key')
        const value = interaction.options.getString('value')
        await interaction.reply({
            content: `⚙️ Config set placeholder — would set ${key} = ${value}.`,
            ephemeral: true
        })
    }
}
