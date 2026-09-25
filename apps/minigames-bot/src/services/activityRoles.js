const { EmbedBuilder, PermissionFlagsBits } = require('discord.js')
const { prisma, getOrCreateUser } = require('#services/database')
const logger = require('../utils/logger')

const cooldownMap = new Map()

const rulesCache = new Map()
const CACHE_TTL_MS = 30_000

/**
 * Fetch active activity role rules for a given guild with cache.
 * @param {string} guildId
 * @returns {Promise<Array>}
 */
async function fetchActiveRules(guildId) {
    const now = Date.now()
    const cached = rulesCache.get(guildId)
    if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.rules
    }

    try {
        const rules = await prisma.activityRoleRule.findMany({
            where: { guildId, isEnabled: true }
        })
        rulesCache.set(guildId, { rules, fetchedAt: now })
        return rules
    } catch (err) {
        logger.error({ err: err.message, guildId }, 'Failed to fetch activity role rules from database')
        return cached ? cached.rules : []
    }
}

/**
 * Clear the rules cache for a guild or entirely (useful for tests or instant reload).
 * @param {string} [guildId]
 */
function clearRulesCache(guildId) {
    if (guildId) {
        rulesCache.delete(guildId)
    } else {
        rulesCache.clear()
        cooldownMap.clear()
    }
}

/**
 * Attempt to assign the target role to the guild member.
 * @param {import('discord.js').Message} message
 * @param {object} rule
 */
async function assignActivityRole(message, rule) {
    try {
        const botMember = message.guild.members.me || (await message.guild.members.fetchMe().catch(() => null))
        if (!botMember || !botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
            logger.warn({ guildId: message.guild.id }, 'Bot lacks ManageRoles permission')
            return
        }

        const role =
            message.guild.roles.cache.get(rule.roleId) ||
            (await message.guild.roles.fetch(rule.roleId).catch(() => null))

        if (!role) {
            logger.warn({ roleId: rule.roleId, guildId: message.guild.id }, 'Target role not found in guild')
            return
        }

        if (botMember.roles.highest.position <= role.position) {
            logger.warn(
                { roleId: role.id, roleName: role.name, guildId: message.guild.id },
                'Cannot assign role: bot role position is equal to or lower than target role'
            )
            return
        }

        await message.member.roles.add(role.id, 'Activity role threshold reached')
        logger.info(
            { userId: message.author.id, roleId: role.id, roleName: role.name, guildId: message.guild.id },
            'Activity role successfully assigned'
        )

        const locationText = rule.channelName && rule.channelName !== 'Todo el servidor'
            ? `en **${rule.channelName}**`
            : rule.channelId
            ? `en **#${message.channel.name}**`
            : 'en el servidor'

        const msgText = rule.messagesReq === 1
            ? 'su primer mensaje'
            : `los **${rule.messagesReq.toLocaleString()} mensajes**`

        const embed = new EmbedBuilder()
            .setTitle(`🎉 ¡Nuevo rol para ${message.member?.displayName || message.author.username}!`)
            .setDescription(
                `¡${message.author} llegó a ${msgText} ${locationText} y desbloqueó el rol **${role.name}**! 🪄`
            )
            .setColor(role.color || 0xa020f0)
            .setFooter({ text: 'seguí chateando para más cositas 👀' })
            .setTimestamp()

        await message.channel.send({ embeds: [embed] }).catch(err => {
            logger.warn({ err: err.message }, 'Failed to send activity role unlock notification embed')
        })
    } catch (err) {
        logger.error({ err: err.message, userId: message.author.id, roleId: rule.roleId }, 'Error assigning activity role')
    }
}

/**
 * Handle incoming message for activity roles evaluation.
 * @param {import('discord.js').Message} message
 */
async function processActivityMessage(message) {
    if (!message || message.author?.bot || !message.guild || !message.member) return

    const guildId = message.guild.id
    const channelId = message.channel.id
    const userId = message.author.id

    const rules = await fetchActiveRules(guildId)
    if (!rules || rules.length === 0) return

    const matchingRules = rules.filter(r => {
        if (r.channelIds && r.channelIds.length > 0) {
            return r.channelIds.includes(channelId)
        }
        if (r.channelId) {
            return r.channelId === channelId
        }
        return true
    })
    if (matchingRules.length === 0) return

    const pendingRules = matchingRules.filter(r => !message.member.roles.cache.has(r.roleId))
    if (pendingRules.length === 0) return

    const minCooldownSec = Math.max(5, Math.min(...pendingRules.map(r => r.cooldownSec || 60)))
    const cooldownKey = `${guildId}:${userId}:${channelId}`
    const lastTimestamp = cooldownMap.get(cooldownKey) || 0
    const now = Date.now()

    if (now - lastTimestamp < minCooldownSec * 1000) {
        return
    }
    cooldownMap.set(cooldownKey, now)

    try {
        const user = await getOrCreateUser(userId, guildId, message.author.username)

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                messageCount: { increment: 1 },
                lastActiveAt: new Date()
            },
            select: { messageCount: true }
        })

        const channelActivity = await prisma.userChannelActivity.upsert({
            where: {
                userId_channelId: {
                    userId: user.id,
                    channelId
                }
            },
            update: {
                messageCount: { increment: 1 },
                lastMessageAt: new Date()
            },
            create: {
                userId: user.id,
                guildId,
                channelId,
                messageCount: 1,
                lastMessageAt: new Date()
            },
            select: { messageCount: true }
        })

        for (const rule of pendingRules) {
            let count = 0
            if (rule.channelIds && rule.channelIds.length > 0) {
                if (rule.channelIds.length === 1 && rule.channelIds[0] === channelId) {
                    count = channelActivity.messageCount
                } else {
                    const agg = await prisma.userChannelActivity.aggregate({
                        where: {
                            userId: user.id,
                            channelId: { in: rule.channelIds }
                        },
                        _sum: { messageCount: true }
                    })
                    count = agg._sum.messageCount || 0
                }
            } else if (rule.channelId) {
                count = channelActivity.messageCount
            } else {
                count = updatedUser.messageCount
            }

            if (count >= rule.messagesReq) {
                await assignActivityRole(message, rule)
            }
        }
    } catch (err) {
        logger.error({ err: err.message, userId, guildId }, 'Error processing activity role message')
    }
}

module.exports = {
    processActivityMessage,
    fetchActiveRules,
    clearRulesCache,
    assignActivityRole,
    CACHE_TTL_MS
}
