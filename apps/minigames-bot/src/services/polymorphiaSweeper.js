const { prisma } = require('#services/database')
const { PermissionFlagsBits } = require('discord.js')
const logger = require('#utils/logger')

const SWEEP_INTERVAL_MS = parseInt(process.env.POLYMORPHIA_SWEEP_INTERVAL_MS, 10) || 60_000

async function sweepExpiredPolymorphia(client) {
    const now = new Date()

    let expiredStates
    try {
        expiredStates = await prisma.polymorphiaState.findMany({
            where: {
                isActive: true,
                endsAt: { lte: now }
            },
            include: { user: true }
        })
    } catch (error) {
        const logger = require('#utils/logger')
        logger.error({ err: error }, '[Sweeper] Database query failed')
        return 0
    }

    if (expiredStates.length === 0) return 0

    const logger = require('#utils/logger')
    logger.info({ count: expiredStates.length }, 'Found expired polymorphia state(s). Reverting...')

    let revertedCount = 0

    for (const state of expiredStates) {
        try {
            const guild = client.guilds.cache.get(state.guildId)
            if (!guild) {
                logger.warn({ guildId: state.guildId, stateId: state.id }, 'Guild not found (bot left?). Marking state inactive')
                await markInactive(state.id)
                revertedCount++
                continue
            }

            const botMember = guild.members.me
            const canManage = botMember.permissions.has(PermissionFlagsBits.ManageNicknames)

            let member
            try {
                member = await guild.members.fetch(state.user.discordId)
            } catch {
                logger.warn({ discordId: state.user.discordId, guildId: state.guildId, stateId: state.id }, 'Member no longer in guild. Marking state inactive')
                await markInactive(state.id)
                revertedCount++
                continue
            }

            if (canManage && botMember.roles.highest.comparePositionTo(member.roles.highest) > 0) {
                const originalNickname = state.previousNickname || null
                await member.setNickname(originalNickname, 'Polymorphia effect expired naturally.')
            } else if (!canManage) {
                logger.warn({ guildId: state.guildId, stateId: state.id }, 'Missing ManageNicknames permission. State marked inactive; nickname NOT reverted')
            } else {
                logger.warn({ guildId: state.guildId, discordId: state.user.discordId, stateId: state.id }, "Bot's role is lower than user's role. Nickname NOT reverted")
            }
        } catch (discordError) {
            logger.error({ err: discordError, stateId: state.id, discordId: state.user?.discordId ?? 'unknown' }, 'Failed to process state')
        }

        await markInactive(state.id)
        revertedCount++
    }

    return revertedCount
}

async function markInactive(stateId) {
    try {
        await prisma.polymorphiaState.update({
            where: { id: stateId },
            data: {
                isActive: false,
                currentForm: '',
                startedAt: null,
                endsAt: null
            }
        })
    } catch (error) {
        const logger = require('#utils/logger')
        logger.error({ err: error, stateId }, 'Failed to mark state as inactive')
    }
}

function startSweeper(client) {
    logger.info({ intervalMs: SWEEP_INTERVAL_MS }, 'Starting polymorphia sweeper')

    sweepExpiredPolymorphia(client).then(count => {
        if (count > 0) {
            logger.info({ count }, 'Initial sweep reverted states')
        }
    })

    const intervalId = setInterval(() => {
        sweepExpiredPolymorphia(client).catch(error => {
            logger.error({ err: error }, 'Interval sweep error')
        })
    }, SWEEP_INTERVAL_MS)

    if (intervalId.unref) {
        intervalId.unref()
    }

    return intervalId
}

module.exports = { startSweeper, sweepExpiredPolymorphia }
