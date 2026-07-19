const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js')
const { logger } = require('@lulu-discord/bot-utils')

// re-use guildConfig from minigames service
const { getGuildConfig } = require('../../../minigames-bot/src/services/guildConfig')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin-ban')
        .setDescription('Ban a user from the guild.')
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
        const base = logger.child({ service: 'admin-ban' })
        const targetUser = interaction.options.getUser('target')
        const reason = interaction.options.getString('reason') || 'No reason provided'

        if (!interaction.guild) {
            await interaction.reply({ content: 'This command can only be used in a guild.', ephemeral: true })
            return
        }

        const moderator = interaction.user

        try {
            await interaction.deferReply({ ephemeral: true })

            // attempt to ban by id (works even if member not cached)
            await interaction.guild.members.ban(targetUser.id, { reason: `${reason} — by ${moderator.tag}` })

            // log to configured log channel if available
            try {
                const cfg = await getGuildConfig(interaction.guild.id)
                const logChannelId = cfg?.logChannelId
                if (logChannelId) {
                    const ch = await interaction.guild.channels.fetch(logChannelId).catch(() => null)
                    if (ch && ch.isTextBased && ch.send) {
                        const embed = new EmbedBuilder()
                            .setTitle('Usuario baneado')
                            .addFields(
                                { name: 'Usuario', value: `${targetUser.tag} (<@${targetUser.id}>)`, inline: false },
                                { name: 'Moderador', value: `${moderator.tag} (<@${moderator.id}>)`, inline: false },
                                { name: 'Razón', value: reason, inline: false }
                            )
                            .setTimestamp()
                        await ch.send({ embeds: [embed] }).catch(() => {})
                    }
                }
            } catch (err) {
                base.warn({ err }, 'Failed to write to log channel')
            }

            base.info({ target: targetUser.id, moderator: moderator.id, guild: interaction.guild.id }, 'Banned user')
            await interaction.editReply({ content: `✅ Baneado ${targetUser.tag}` })
        } catch (error) {
            base.error({ err: error, target: targetUser.id }, 'Ban failed')
            const msg = error?.code === 50013 ? 'No tengo permisos para banear a ese usuario.' : 'No se pudo banear al usuario.'
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({ content: `❌ ${msg}` })
                } else {
                    await interaction.reply({ content: `❌ ${msg}`, ephemeral: true })
                }
            } catch (_) {}
        }
    }
}
