const { prisma } = require('#services/database')
const { generatePolymorphiaNickname } = require('#services/deepseek')
const { getRandomFallbackNickname } = require('./fallbackNicknames')
const { getRandomDuration } = require('./DuelEngine')
const { applyCooldowns } = require('./CooldownManager')

const DUEL_BET = 50        // Candies each player puts up
const WINNER_REWARD = 75   // Winner gets 75 (net +25)
const LOSER_REFUND = 25    // Loser gets 25 back (net -25)

/**
 * Execute the full escrow + reward flow for a polymorphia duel.
 *
 * @param {object} interaction - Discord interaction (for member fetching)
 * @param {object} duelResult - Result from DuelEngine.resolveDuel()
 * @param {object} attackerDb - User DB record (attacker, includes .user relation)
 * @param {object} defenderDb - User DB record (defender, includes .user relation)
 * @param {string} guildId
 * @returns {Promise<object>} Summary
 */
async function executeRewardFlow(interaction, duelResult, attackerDb, defenderDb, guildId) {
    const isAttackerWinner = duelResult.winner === 'attacker'
    const winnerDb = isAttackerWinner ? attackerDb : defenderDb
    const loserDb = isAttackerWinner ? defenderDb : attackerDb

    // Distribute candies
    await distributeCandies(winnerDb, loserDb, guildId)

    // Update duel stats
    await updateDuelStats(winnerDb.id, loserDb.id, duelResult)

    // Apply cooldowns
    await applyCooldowns(winnerDb.discordId, loserDb.discordId, guildId)

    // Increment daily duel count for the attacker (initiator)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isNewDay = !attackerDb.dailyDuelDate || attackerDb.dailyDuelDate < today
    await prisma.user.update({
        where: { id: attackerDb.id },
        data: {
            dailyDuelCount: isNewDay ? 1 : { increment: 1 },
            dailyDuelDate: new Date()
        }
    })

    let polymorphiaApplied = false

    // If attacker won and not blocked by shield, apply polymorphia
    if (isAttackerWinner && !duelResult.blockedByShield) {
        try {
            await applyPolymorphia(interaction, loserDb.discordId, guildId)
            polymorphiaApplied = true
        } catch (error) {
            console.error('[RewardManager] Failed to apply polymorphia:', error.message)
        }
    }

    return {
        isAttackerWinner,
        blockedByShield: duelResult.blockedByShield || false,
        polymorphiaApplied,
        winnerDb,
        loserDb
    }
}

async function distributeCandies(winnerDb, loserDb, guildId) {
    // Get fresh records to have accurate balanceBefore
    const [freshWinner, freshLoser] = await Promise.all([
        prisma.user.findUnique({ where: { discordId_guildId: { discordId: winnerDb.discordId, guildId } } }),
        prisma.user.findUnique({ where: { discordId_guildId: { discordId: loserDb.discordId, guildId } } })
    ])

    // Round 1: Deduct escrow from both
    await prisma.$transaction([
        prisma.user.update({
            where: { id: freshWinner.id },
            data: { candies: { decrement: DUEL_BET } }
        }),
        prisma.user.update({
            where: { id: freshLoser.id },
            data: { candies: { decrement: DUEL_BET } }
        })
    ])

    // Get balances after escrow deduction
    const [afterEscrowWinner, afterEscrowLoser] = await Promise.all([
        prisma.user.findUnique({ where: { id: freshWinner.id } }),
        prisma.user.findUnique({ where: { id: freshLoser.id } })
    ])

    // Round 2: Distribute rewards and log transactions
    await prisma.$transaction([
        // Winner: receives WINNER_REWARD
        prisma.user.update({
            where: { id: freshWinner.id },
            data: {
                candies: { increment: WINNER_REWARD },
                totalEarned: { increment: WINNER_REWARD }
            }
        }),
        prisma.transaction.create({
            data: {
                userId: freshWinner.id,
                type: 'earn',
                amount: WINNER_REWARD,
                balanceAfter: afterEscrowWinner.candies + WINNER_REWARD,
                description: `Won Polymorphia duel vs ${loserDb.username} (net +${WINNER_REWARD - DUEL_BET})`
            }
        }),
        // Loser: receives LOSER_REFUND
        prisma.user.update({
            where: { id: freshLoser.id },
            data: {
                candies: { increment: LOSER_REFUND },
                totalEarned: { increment: LOSER_REFUND }
            }
        }),
        prisma.transaction.create({
            data: {
                userId: freshLoser.id,
                type: 'earn',
                amount: LOSER_REFUND,
                balanceAfter: afterEscrowLoser.candies + LOSER_REFUND,
                description: `Refund from Polymorphia duel vs ${winnerDb.username} (net -${DUEL_BET - LOSER_REFUND})`
            }
        })
    ])
}

/**
 * Update polymorphia stats for both users.
 * @param {string} winnerDbId - Internal UUID of the winner
 * @param {string} loserDbId - Internal UUID of the loser
 * @param {object} duelResult
 */
async function updateDuelStats(winnerDbId, loserDbId, duelResult) {
    if (duelResult.winner === 'attacker') {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: winnerDbId },
                data: { polymorphiaWins: { increment: 1 } }
            }),
            prisma.user.update({
                where: { id: loserDbId },
                data: { polymorphiaLosses: { increment: 1 } }
            })
        ])

        if (duelResult.blockedByShield) {
            await prisma.user.update({
                where: { id: loserDbId },
                data: { polymorphiaSaved: { increment: 1 } }
            })
        }
    } else {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: winnerDbId },
                data: { polymorphiaSaved: { increment: 1 } }
            }),
            prisma.user.update({
                where: { id: loserDbId },
                data: { polymorphiaLosses: { increment: 1 } }
            })
        ])
    }
}

/**
 * Apply the polymorphia nickname effect via DeepSeek and save state.
 * @param {object} interaction - Discord interaction
 * @param {string} targetDiscordId - Discord snowflake of the loser
 * @param {string} guildId
 */
async function applyPolymorphia(interaction, targetDiscordId, guildId) {
    const member = interaction.options.resolved?.members?.get(targetDiscordId) ||
        await interaction.guild.members.fetch(targetDiscordId)

    const displayName = member.nickname || member.user.displayName || member.user.username

    // Try DeepSeek API first, fallback to local pool on failure
    let polymorphNickname
    try {
        polymorphNickname = await generatePolymorphiaNickname(displayName)
    } catch (err) {
        console.warn('[RewardManager] DeepSeek failed, using fallback nickname pool:', err.message)
        polymorphNickname = getRandomFallbackNickname(displayName)
    }

    const durationMinutes = getRandomDuration()
    const now = new Date()
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000)

    // Save previous nickname and set new one
    await member.setNickname(
        polymorphNickname,
        `Polymorphia duel: transformed by ${interaction.user.username}`
    )

    // Get or create User DB record to get internal ID
    const userDb = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId: targetDiscordId, guildId } }
    })
    if (!userDb) {
        throw new Error(`User ${targetDiscordId} not found in DB for polymorphia state creation`)
    }

    // Upsert PolymorphiaState
    await prisma.polymorphiaState.upsert({
        where: { userId: userDb.id },
        update: {
            isActive: true,
            currentForm: polymorphNickname,
            previousNickname: displayName,
            formDuration: durationMinutes,
            startedAt: now,
            endsAt,
            guildId
        },
        create: {
            userId: userDb.id,
            isActive: true,
            currentForm: polymorphNickname,
            previousNickname: displayName,
            formDuration: durationMinutes,
            startedAt: now,
            endsAt,
            guildId
        }
    })
}

module.exports = {
    DUEL_BET,
    WINNER_REWARD,
    LOSER_REFUND,
    executeRewardFlow,
    distributeCandies,
    updateDuelStats,
    applyPolymorphia
}