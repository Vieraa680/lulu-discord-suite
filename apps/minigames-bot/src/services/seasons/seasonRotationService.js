const { EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const { prisma } = require('#services/database')
const { getGuildConfig } = require('../guildConfig')
const { invalidateLevelRoleRewardsCache } = require('../leveling/levelRoleService')
const logger = require('#utils/logger')

async function rotateSeason(client, guildId, specificSeasonId = null) {
  if (!client || !guildId) {
    throw new Error('Client and guildId are required for season rotation')
  }

  const activeSeason = specificSeasonId
    ? await prisma.season.findUnique({
        where: { id: specificSeasonId },
        include: { rewards: true },
      })
    : await prisma.season.findFirst({
        where: { guildId, status: 'ACTIVE' },
        include: { rewards: true },
      })

  if (!activeSeason) {
    logger.warn({ guildId }, '[SeasonRotation] No active season found to rotate')
    return { success: false, message: 'No hay temporada activa para rotar', winnersCount: 0, deletedRolesCount: 0, nextSeasonName: null }
  }

  const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null))
  if (!guild) {
    logger.error({ guildId }, '[SeasonRotation] Guild not found on client')
    return { success: false, message: 'Servidor no encontrado en el bot', winnersCount: 0, deletedRolesCount: 0, nextSeasonName: null }
  }

  logger.info({ guildId, seasonName: activeSeason.name }, '[SeasonRotation] Starting season rotation')

  const trophyReward = activeSeason.rewards.find(r => r.isTrophy || r.tier === 5)
  const tempRewards = activeSeason.rewards.filter(r => !r.isTrophy && r.tier !== 5)

  let winnersCount = 0
  const winnersList = []

  if (trophyReward) {
    const trophyUsers = await prisma.user.findMany({
      where: {
        guildId,
        level: { gte: trophyReward.levelReq },
      },
      select: {
        id: true,
        discordId: true,
        username: true,
        avatarUrl: true,
        level: true,
        xp: true,
      },
    })

    for (const u of trophyUsers) {
      await prisma.seasonWinner.upsert({
        where: {
          seasonId_discordId: {
            seasonId: activeSeason.id,
            discordId: u.discordId,
          },
        },
        update: {
          finalLevel: u.level,
          finalXp: u.xp,
          achievedTrophy: true,
          username: u.username,
          avatarUrl: u.avatarUrl,
        },
        create: {
          seasonId: activeSeason.id,
          guildId,
          discordId: u.discordId,
          username: u.username,
          avatarUrl: u.avatarUrl,
          finalLevel: u.level,
          finalXp: u.xp,
          achievedTrophy: true,
        },
      })

      winnersList.push(`<@${u.discordId}>`)
    }

    winnersCount = trophyUsers.length
  }

  let deletedRolesCount = 0
  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null))
  const canManageRoles = botMember?.permissions.has(PermissionFlagsBits.ManageRoles)

  if (canManageRoles) {
    for (const reward of tempRewards) {
      try {
        const discordRole =
          guild.roles.cache.get(reward.roleId) ||
          (await guild.roles.fetch(reward.roleId).catch(() => null))

        if (discordRole && botMember.roles.highest.position > discordRole.position) {
          await discordRole.delete(`Fin de temporada: ${activeSeason.name}`)
          deletedRolesCount++
          logger.info(
            { roleId: reward.roleId, roleName: discordRole.name, guildId },
            '[SeasonRotation] Temporary season role deleted from Discord'
          )
        }
      } catch (err) {
        logger.warn(
          { err: err.message, roleId: reward.roleId, guildId },
          '[SeasonRotation] Could not delete temporary season role'
        )
      }
    }
  } else {
    logger.warn({ guildId }, '[SeasonRotation] Bot lacks ManageRoles permission to delete temporary roles')
  }

  await prisma.season.update({
    where: { id: activeSeason.id },
    data: { status: 'COMPLETED' },
  })

  await prisma.user.updateMany({
    where: { guildId },
    data: {
      xp: 0,
      level: 0,
    },
  })

  const nextSeason = await prisma.season.findFirst({
    where: { guildId, status: 'SCHEDULED' },
    orderBy: { startDate: 'asc' },
    include: { rewards: true },
  })

  let nextSeasonName = null

  if (nextSeason) {
    await prisma.season.update({
      where: { id: nextSeason.id },
      data: { status: 'ACTIVE' },
    })

    nextSeasonName = nextSeason.name

    await prisma.levelRoleReward.deleteMany({ where: { guildId } })

    for (const rew of nextSeason.rewards) {
      await prisma.levelRoleReward.create({
        data: {
          guildId,
          levelReq: rew.levelReq,
          roleId: rew.roleId,
          roleName: rew.roleName,
          roleColor: rew.roleColor,
          removePrevious: true,
          isEnabled: true,
        },
      })
    }

    invalidateLevelRoleRewardsCache(guildId)
  } else {
    await prisma.levelRoleReward.deleteMany({ where: { guildId } })
    invalidateLevelRoleRewardsCache(guildId)
  }
  
  try {
    const config = await getGuildConfig(guildId)
    const destination = config.xpLevelUpChannelId

    let targetChannel = null
    if (destination && destination !== '' && destination !== 'default' && destination !== 'dm' && destination !== 'none') {
      targetChannel = guild.channels.cache.get(destination) || (await guild.channels.fetch(destination).catch(() => null))
    }

    if (!targetChannel) {
      targetChannel = guild.systemChannel
    }

    if (targetChannel && targetChannel.isTextBased()) {
      const trophyName = trophyReward?.roleName || 'Trofeo de Temporada'
      const winnersSummary =
        winnersList.length > 0
          ? winnersList.slice(0, 15).join(', ') + (winnersList.length > 15 ? ` y ${winnersList.length - 15} más` : '')
          : 'Nadie alcanzó el nivel necesario esta vez.'

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Fin de la ${activeSeason.name}`)
        .setDescription(
          `Ha concluido la temporada actual. Los niveles y puntos de experiencia se han reiniciado a cero.\n\n` +
          `**Trofeo Permanente Otorgado:**\n` +
          `🎖️ **${trophyName}**\n\n` +
          `**Invocadores que lo consiguieron:**\n` +
          `${winnersSummary}\n\n` +
          (nextSeasonName
            ? `✨ **¡Comienza la nueva temporada!**\n¡Ya está activa **${nextSeasonName}** con 5 nuevos roles por desbloquear!`
            : `✨ ¡Pronto comenzará una nueva temporada con nuevas recompensas!`)
        )
        .setColor(0xF59E0B)
        .setFooter({ text: 'Lulu Temporadas • Reinicio mensual' })
        .setTimestamp()

      await targetChannel.send({ embeds: [embed] })
    }
  } catch (err) {
    logger.warn({ err: err.message, guildId }, '[SeasonRotation] Could not send season completion announcement')
  }

  logger.info({ guildId, seasonName: activeSeason.name, winnersCount, deletedRolesCount }, '[SeasonRotation] Season rotation finished successfully')

  return {
    success: true,
    winnersCount,
    deletedRolesCount,
    nextSeasonName,
  }
}

module.exports = {
  rotateSeason,
}
