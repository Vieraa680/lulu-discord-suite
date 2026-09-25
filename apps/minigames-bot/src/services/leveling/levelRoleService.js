const { PermissionFlagsBits } = require('discord.js')
const { prisma } = require('#services/database')
const logger = require('#utils/logger')

const rewardsCache = new Map()
const CACHE_TTL_MS = 30_000

/**
 * Fetch active level role rewards for a guild with memory cache.
 * @param {string} guildId
 * @returns {Promise<Array>}
 */
async function fetchLevelRoleRewards(guildId) {
  const now = Date.now()
  const cached = rewardsCache.get(guildId)
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.rewards
  }

  try {
    const rewards = await prisma.levelRoleReward.findMany({
      where: { guildId, isEnabled: true },
      orderBy: { levelReq: 'asc' },
    })
    rewardsCache.set(guildId, { fetchedAt: now, rewards })
    return rewards
  } catch (err) {
    logger.error({ err: err.message, guildId }, 'Error fetching level role rewards')
    return []
  }
}

/**
 * Invalidate cached rewards for a guild.
 * @param {string} guildId
 */
function invalidateLevelRoleRewardsCache(guildId) {
  if (guildId) {
    rewardsCache.delete(guildId)
  } else {
    rewardsCache.clear()
  }
}

/**
 * Apply level role rewards to a member upon reaching a new level.
 * Automatically grants the target role and removes lower-tier level roles if configured.
 * @param {import('discord.js').GuildMember} member
 * @param {number} newLevel
 * @param {import('discord.js').Guild} guild
 * @returns {Promise<{ grantedRoles: Array<{ id: string, name: string, hexColor: string }>, removedRoles: Array<{ id: string, name: string }> } | null>}
 */
async function applyLevelRoleRewards(member, newLevel, guild) {
  if (!member || !guild) return null

  try {
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null))
    if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      logger.warn({ guildId: guild.id }, 'Bot lacks ManageRoles permission to award level roles')
      return null
    }

    const allRewards = await fetchLevelRoleRewards(guild.id)
    if (!allRewards || allRewards.length === 0) return null

    const eligibleRewards = allRewards.filter(r => r.levelReq <= newLevel)
    if (eligibleRewards.length === 0) return null

    const highestLevelReq = Math.max(...eligibleRewards.map(r => r.levelReq))
    const highestTierRewards = eligibleRewards.filter(r => r.levelReq === highestLevelReq)

    const grantedRoles = []
    const removedRoles = []

    for (const reward of highestTierRewards) {
      const targetRole =
        guild.roles.cache.get(reward.roleId) ||
        (await guild.roles.fetch(reward.roleId).catch(() => null))

      if (!targetRole) {
        logger.warn({ roleId: reward.roleId, guildId: guild.id }, 'Level reward role not found in guild')
        continue
      }

      if (botMember.roles.highest.position <= targetRole.position) {
        logger.warn(
          { roleId: targetRole.id, roleName: targetRole.name, guildId: guild.id },
          'Cannot assign role: bot role position is equal to or lower than target role'
        )
        continue
      }

      if (!member.roles.cache.has(targetRole.id)) {
        await member.roles.add(targetRole.id, `Subió al nivel ${newLevel}`)
        grantedRoles.push({
          id: targetRole.id,
          name: targetRole.name,
          hexColor: targetRole.hexColor,
        })
        logger.info(
          { userId: member.id, roleId: targetRole.id, roleName: targetRole.name, newLevel, guildId: guild.id },
          'Level reward role granted'
        )
      }

      if (reward.removePrevious) {
        const lowerRewards = allRewards.filter(r => r.levelReq < highestLevelReq)
        for (const lower of lowerRewards) {
          if (member.roles.cache.has(lower.roleId) && lower.roleId !== reward.roleId) {
            const lowerRole =
              guild.roles.cache.get(lower.roleId) ||
              (await guild.roles.fetch(lower.roleId).catch(() => null))

            if (lowerRole && botMember.roles.highest.position > lowerRole.position) {
              await member.roles.remove(lower.roleId, `Reemplazado por rol de nivel ${newLevel}`)
              removedRoles.push({ id: lowerRole.id, name: lowerRole.name })
              logger.info(
                { userId: member.id, roleId: lowerRole.id, roleName: lowerRole.name, guildId: guild.id },
                'Previous tier level role removed'
              )
            }
          }
        }
      }
    }

    return { grantedRoles, removedRoles }
  } catch (err) {
    logger.error({ err: err.message, userId: member.id, guildId: guild.id }, 'Error applying level role rewards')
    return null
  }
}

module.exports = {
  fetchLevelRoleRewards,
  invalidateLevelRoleRewardsCache,
  applyLevelRoleRewards,
  CACHE_TTL_MS,
}
