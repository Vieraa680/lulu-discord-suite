const { prisma } = require('#services/database')
const { PermissionFlagsBits } = require('discord.js')

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
        console.error('[Sweeper] Database query failed:', error.message)
        return 0
    }

    if (expiredStates.length === 0) return 0

    console.log(`[Sweeper] Found ${expiredStates.length} expired polymorphia state(s). Reverting...`)

    let revertedCount = 0

    for (const state of expiredStates) {
        try {
            const guild = client.guilds.cache.get(state.guildId)
            if (!guild) {
                console.warn(
                    `[Sweeper] Guild ${state.guildId} not found (bot left?). ` +
                    `Marking state ${state.id} as inactive.`
                )
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
                console.warn(
                    `[Sweeper] Member ${state.user.discordId} no longer in guild ` +
                    `${state.guildId}. Marking state as inactive.`
                )
                await markInactive(state.id)
                revertedCount++
                continue
            }

            if (canManage && botMember.roles.highest.comparePositionTo(member.roles.highest) > 0) {
                const originalNickname = state.previousNickname || null
                await member.setNickname(originalNickname, 'Polymorphia effect expired naturally.')
            } else if (!canManage) {
                console.warn(
                    `[Sweeper] Missing ManageNicknames permission in guild ${state.guildId}. ` +
                    `State ${state.id} marked inactive but nickname was NOT reverted.`
                )
            } else {
                console.warn(
                    `[Sweeper] Bot's role is lower than ${state.user.discordId}'s role in ` +
                    `guild ${state.guildId}. Nickname NOT reverted.`
                )
            }
        } catch (discordError) {
            console.error(
                `[Sweeper] Failed to process state ${state.id} for user ` +
                `${state.user?.discordId ?? 'unknown'}:`,
                discordError.message
            )
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
        console.error(`[Sweeper] Failed to mark state ${stateId} as inactive:`, error.message)
    }
}

function startSweeper(client) {
    console.log(`[Sweeper] Starting polymorphia sweeper (interval: ${SWEEP_INTERVAL_MS}ms)...`)

    sweepExpiredPolymorphia(client).then(count => {
        if (count > 0) {
            console.log(`[Sweeper] Initial sweep reverted ${count} state(s)`)
        }
    })

    const intervalId = setInterval(() => {
        sweepExpiredPolymorphia(client).catch(error => {
            console.error('[Sweeper] Interval sweep error:', error.message)
        })
    }, SWEEP_INTERVAL_MS)

    if (intervalId.unref) {
        intervalId.unref()
    }

    return intervalId
}

module.exports = { startSweeper, sweepExpiredPolymorphia }