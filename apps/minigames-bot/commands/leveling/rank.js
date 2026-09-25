const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
const { prisma } = require('#services/database')
const { getLevelProgress } = require('#services/leveling/xpCalculator')
const logger = require('#utils/logger').child({ command: 'rank' })

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mira tu nivel, puntos de XP y progreso en el servidor.')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario a consultar (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply()

    try {
      const targetUser = interaction.options.getUser('usuario') || interaction.user
      const guildId = interaction.guildId

      const userRecord = await prisma.user.findUnique({
        where: {
          discordId_guildId: {
            discordId: targetUser.id,
            guildId,
          },
        },
      })

      const totalXp = userRecord?.xp || 0
      const progress = getLevelProgress(totalXp)

      const higherCount = await prisma.user.count({
        where: {
          guildId,
          xp: { gt: totalXp },
        },
      })
      const rankPosition = higherCount + 1

      const totalRanked = await prisma.user.count({
        where: {
          guildId,
          xp: { gt: 0 },
        },
      })

      const embed = new EmbedBuilder()
        .setAuthor({
          name: targetUser.displayName || targetUser.username,
          iconURL: targetUser.displayAvatarURL({ dynamic: true }),
        })
        .setColor(0xA020F0)
        .addFields(
          {
            name: '⭐ Nivel',
            value: `**${progress.level}**`,
            inline: true,
          },
          {
            name: '🏆 Puesto',
            value: `#**${rankPosition}**${totalRanked > 0 ? ` / ${totalRanked}` : ''}`,
            inline: true,
          },
          {
            name: '✨ XP Total',
            value: `${progress.totalXp.toLocaleString()} XP`,
            inline: true,
          },
          {
            name: '🎯 Progreso',
            value: `${progress.progressBar} **${progress.progressPercent}%**\n` +
                   `${progress.currentLevelXp.toLocaleString()} / ${progress.neededLevelXp.toLocaleString()} XP ` +
                   `*(faltan ${progress.remainingXp.toLocaleString()})*`,
            inline: false,
          },
          {
            name: '💬 Actividad',
            value: `${userRecord?.messageCount || 0} mensajes • 🎙️ ${userRecord?.voiceMinutesTotal || 0} min en voz`,
            inline: false,
          }
        )

      await interaction.editReply({ embeds: [embed] })
    } catch (err) {
      logger.error({ err: err.message, guildId: interaction.guildId }, 'Error executing /rank')
      await interaction.editReply('No pude consultar el nivel en este momento, probá en un ratito.')
    }
  },
}
