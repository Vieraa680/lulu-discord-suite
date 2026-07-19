const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { getUserAchievements } = require('#services/achievements')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('achievements')
        .setDescription('Mostrá tus logros desbloqueados en el servidor.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Usuario del que querés ver los logros (por defecto, vos).')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true })

        const targetUser = interaction.options.getUser('user') || interaction.user
        const member = interaction.guild.members.cache.get(targetUser.id)
        const displayName = member?.displayName || targetUser.username

        try {
            const achievements = await getUserAchievements(targetUser.id, interaction.guildId)

            if (achievements.length === 0) {
                await interaction.editReply({
                    content: 'Todavía no hay logros configurados en este servidor.'
                })
                return
            }

            const unlocked = achievements.filter(a => a.unlocked)
            const locked = achievements.filter(a => !a.unlocked)

            const embed = new EmbedBuilder()
                .setTitle(`🏅 Logros de ${displayName}`)
                .setDescription(
                    `**${unlocked.length}/${achievements.length}** desbloqueados\n\n` +
                    unlocked.map(a => `${a.emoji} **${a.name}** — ${a.description}`).join('\n') ||
                    'Todavía no desbloqueaste ningún logro.'
                )
                .setColor(unlocked.length === achievements.length ? 0xFFD700 : 0x9B59B6)
                .setFooter({
                    text: `${locked.length} restantes — seguí participando para desbloquearlos!`
                })
                .setTimestamp()

            await interaction.editReply({ embeds: [embed] })
        } catch (error) {
            const logger = require('#utils/logger').child({ command: 'achievements' })
            logger.error({ err: error }, 'Error loading achievements')
            await interaction.editReply({
                content: 'Ups, hubo un error al cargar los logros. Intentá de nuevo más tarde.'
            })
        }
    }
}
