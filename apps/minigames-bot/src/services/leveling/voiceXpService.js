const { EmbedBuilder } = require('discord.js')
const { prisma, getOrCreateUser } = require('#services/database')
const { getGuildConfig } = require('../guildConfig')
const { getLevelFromTotalXp, calculateRoleMultiplier } = require('./xpCalculator')
const { applyLevelRoleRewards } = require('./levelRoleService')
const logger = require('#utils/logger')

let voiceIntervalTimer = null

async function sendVoiceLevelUpNotification(member, newLevel, guildConfig, roleRewards = null) {
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
    .setDescription(`¡<@${member.id}> subió al **Nivel ${newLevel}** por estar en voz! 🎙️✨${roleText}`)
    .setColor(0xA020F0)

  const avatarUrl = member.user?.displayAvatarURL ? member.user.displayAvatarURL({ dynamic: true }) : null
  if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.startsWith('http')) {
    embed.setThumbnail(avatarUrl)
  }

  try {
    if (destination === 'dm') {
      await member.send({ embeds: [embed] }).catch(() => null)
      return
    }

    if (destination && destination !== '' && destination !== 'default') {
      const channel =
        member.guild.channels.cache.get(destination) ||
        (await member.guild.channels.fetch(destination).catch(() => null))

      if (channel && channel.isTextBased()) {
        await channel.send({ embeds: [embed] })
        return
      }
    }

    if (member.guild.systemChannel && member.guild.systemChannel.isTextBased()) {
      await member.guild.systemChannel.send({ embeds: [embed] })
    } else {
      await member.send({ embeds: [embed] }).catch(() => null)
    }
  } catch (err) {
    logger.warn({ err: err.message, guildId: member.guild.id }, 'Could not send voice level up notification')
  }
}

async function processVoiceTick(client) {
  if (!client?.guilds?.cache) return

  for (const [, guild] of client.guilds.cache) {
    try {
      const guildConfig = await getGuildConfig(guild.id)
      if (!guildConfig.voiceXpEnabled) continue

      const rawChannels = guild.channels?.cache
      const voiceChannels = rawChannels?.filter
        ? Array.from(rawChannels.filter(c => c.isVoiceBased && c.isVoiceBased()).values())
        : Array.from(rawChannels?.values() || []).filter(c => c.isVoiceBased && c.isVoiceBased())

      for (const channel of voiceChannels) {
        if (
          Array.isArray(guildConfig.xpExcludedChannels) &&
          guildConfig.xpExcludedChannels.includes(channel.id)
        ) {
          continue
        }

        const rawMembers = channel.members
        const activeMembers = rawMembers?.filter
          ? Array.from(rawMembers.filter(m => !m.user?.bot).values())
          : Array.from(rawMembers?.values() || []).filter(m => !m.user?.bot)

        const minMembers = Number(guildConfig.voiceXpMinMembers) || 2
        if (activeMembers.length < minMembers) {
          continue
        }

        for (const member of activeMembers) {
          if (member.voice.deaf || member.voice.selfDeaf) {
            continue
          }

          if (
            guildConfig.voiceXpRequiresUnmuted &&
            (member.voice.mute || member.voice.selfMute)
          ) {
            continue
          }

          const multiplier = calculateRoleMultiplier(
            member.roles,
            guildConfig.xpRoleMultipliers
          )
          const baseRate = Number(guildConfig.voiceXpPerMinute) || 10
          const xpEarned = Math.round(baseRate * multiplier)

          if (xpEarned <= 0) continue

          const user = await getOrCreateUser(
            member.id,
            guild.id,
            member.user.username
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
              lastVoiceXpAt: new Date(),
              voiceMinutesTotal: { increment: 1 },
              username: member.user.username,
              globalName: member.user.globalName || null,
              avatarUrl: member.user.displayAvatarURL(),
            },
          })

          if (newLevel > oldLevel) {
            const roleRewards = await applyLevelRoleRewards(member, newLevel, guild)
            await sendVoiceLevelUpNotification(member, newLevel, guildConfig, roleRewards)
          }
        }
      }
    } catch (err) {
      logger.error({ err: err.message, guildId: guild.id }, 'Error during voice XP cycle')
    }
  }
}

function startVoiceXpTicker(client, intervalMs = 60_000) {
  if (voiceIntervalTimer) {
    clearInterval(voiceIntervalTimer)
  }

  voiceIntervalTimer = setInterval(() => {
    processVoiceTick(client).catch(err => {
      logger.error({ err: err.message }, 'Unhandled error in voice XP ticker')
    })
  }, intervalMs)
}

function stopVoiceXpTicker() {
  if (voiceIntervalTimer) {
    clearInterval(voiceIntervalTimer)
    voiceIntervalTimer = null
  }
}

module.exports = {
  processVoiceTick,
  startVoiceXpTicker,
  stopVoiceXpTicker,
  sendVoiceLevelUpNotification,
}
