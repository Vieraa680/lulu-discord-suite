const { EmbedBuilder } = require('discord.js')
const { prisma, getOrCreateUser } = require('#services/database')
const { getGuildConfig } = require('../guildConfig')
const {
  getLevelFromTotalXp,
  calculateRoleMultiplier,
  generateRandomXp,
} = require('./xpCalculator')
const { applyLevelRoleRewards } = require('./levelRoleService')
const logger = require('#utils/logger')

const cooldownMap = new Map()

function clearXpCooldowns() {
  cooldownMap.clear()
}

async function sendLevelUpNotification(message, newLevel, guildConfig, roleRewards = null) {
  const destination = guildConfig.xpLevelUpChannelId
  if (destination === 'none') return

  let roleText = ''
  if (roleRewards && roleRewards.grantedRoles && roleRewards.grantedRoles.length > 0) {
    const rolesList = roleRewards.grantedRoles.map(r => `**${r.name}**`).join(', ')
    roleText = `\n\n🎖️ ¡Has desbloqueado el rol ${rolesList}!`
    if (roleRewards.removedRoles && roleRewards.removedRoles.length > 0) {
      const removedList = roleRewards.removedRoles.map(r => `**${r.name}**`).join(', ')
      roleText += ` *(se retiró ${removedList})*`
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('✨ ¡Level UP!')
    .setDescription(`¡<@${message.author.id}> subió al **Nivel ${newLevel}**! 🪄${roleText}`)
    .setColor(0xA020F0)

  const avatarUrl = message.author.displayAvatarURL ? message.author.displayAvatarURL({ dynamic: true }) : null
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('http')) {
    embed.setThumbnail(avatarUrl)
  }

  try {
    if (destination === 'dm') {
      await message.author.send({ embeds: [embed] }).catch(() => null)
      return
    }

    if (destination && destination !== '' && destination !== 'default') {
      const channel =
        message.guild.channels.cache.get(destination) ||
        (await message.guild.channels.fetch(destination).catch(() => null))

      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] })
        return
      }
    }

    await message.channel.send({ embeds: [embed] })
  } catch (err) {
    logger.warn({ err: err.message, guildId: message.guild.id }, 'Could not send level up notification')
  }
}

async function processTextMessage(message) {
  if (!message || message.author?.bot || !message.guild || !message.member) {
    return
  }

  try {
    const guildId = message.guild.id
    const guildConfig = await getGuildConfig(guildId)

    if (!guildConfig.xpEnabled) return

    if (Array.isArray(guildConfig.xpExcludedChannels) && guildConfig.xpExcludedChannels.includes(message.channel.id)) {
      return
    }

    const key = `${guildId}:${message.author.id}`
    const now = Date.now()
    const cooldownSec = guildConfig.xpCooldownSec ?? 60
    const cooldownMs = cooldownSec * 1000
    const lastXpAt = cooldownMap.get(key) || 0

    if (cooldownMs > 0 && now - lastXpAt < cooldownMs) {
      return
    }

    cooldownMap.set(key, now)

    const multiplier = calculateRoleMultiplier(message.member.roles, guildConfig.xpRoleMultipliers)
    const xpEarned = generateRandomXp(
      guildConfig.xpPerMessageMin,
      guildConfig.xpPerMessageMax,
      multiplier
    )

    if (xpEarned <= 0) return

    const user = await getOrCreateUser(
      message.author.id,
      guildId,
      message.author.username
    )

    const currentXp = user.xp || 0
    const oldLevel = user.level || 0
    const newTotalXp = currentXp + xpEarned
    const newLevel = getLevelFromTotalXp(newTotalXp)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: { increment: xpEarned },
        level: newLevel,
        lastMessageXpAt: new Date(now),
        username: message.author.username,
        globalName: message.author.globalName || null,
        avatarUrl: message.author.displayAvatarURL(),
      },
    })

    if (newLevel > oldLevel) {
      const roleRewards = await applyLevelRoleRewards(message.member, newLevel, message.guild)
      await sendLevelUpNotification(message, newLevel, guildConfig, roleRewards)
    }
  } catch (err) {
    logger.error({ err: err.message, guildId: message.guild?.id }, 'Error processing text XP')
  }
}

module.exports = {
  processTextMessage,
  sendLevelUpNotification,
  clearXpCooldowns,
  cooldownMap,
}
