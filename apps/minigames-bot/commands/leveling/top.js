const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { prisma } = require('#services/database')
const logger = require('#utils/logger').child({ command: 'top' })

const MEDALS = ['🥇', '🥈', '🥉']

module.exports = {
  data: new SlashCommandBuilder()
    .setName('top')
    .setDescription('Ranking de niveles y XP del servidor.')
    .addIntegerOption(option =>
      option
        .setName('pagina')
        .setDescription('Número de página')
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply()

    try {
      const guildId = interaction.guildId
      const page = interaction.options.getInteger('pagina') || 1
      const pageSize = 10

      const totalUsers = await prisma.user.count({
        where: {
          guildId,
          xp: { gt: 0 },
        },
      })

      if (totalUsers === 0) {
        await interaction.editReply(
          'Nadie sumó XP todavía. ¡Mandá un mensaje o entrá a voz para inaugurar el ranking!'
        )
        return
      }

      const totalPages = Math.ceil(totalUsers / pageSize)
      const currentPage = Math.min(page, totalPages)
      const skip = (currentPage - 1) * pageSize

      const leaderboard = await prisma.user.findMany({
        where: {
          guildId,
          xp: { gt: 0 },
        },
        orderBy: [{ xp: 'desc' }, { messageCount: 'desc' }],
        skip,
        take: pageSize,
      })

      const lines = leaderboard.map((user, index) => {
        const globalRank = skip + index + 1
        const medal = globalRank <= 3 ? MEDALS[globalRank - 1] : `\`#${globalRank}\``
        const displayName = user.globalName || user.username || user.discordId

        return `${medal} **${displayName}** (<@${user.discordId}>)\n` +
               `┗ ⭐ **Nivel ${user.level}** • ✨ **${user.xp.toLocaleString()} XP**`
      })

      const embed = new EmbedBuilder()
        .setTitle('🏆 Ranking de Niveles y XP')
        .setColor(0xA020F0)
        .setDescription(lines.join('\n\n'))
        .setFooter({
          text: `Página ${currentPage} de ${totalPages}`,
          iconURL: interaction.guild?.iconURL() || undefined,
        })

      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      logger.error({ err: err.message, guildId: interaction.guildId }, 'Error executing /top')
      await interaction.editReply('No pude cargar el ranking ahora mismo, probá en un ratito.')
    }
  },
}
