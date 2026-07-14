const { prisma, createPolymorphiaState, recordDuelResult, recordDefenderWin, incrementDailyDuelCount } = require('#services/database')
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

    // Distribute candies (complex business logic kept here)
    await distributeCandies(winnerDb, loserDb, guildId)

    // Update duel stats (delegated to database.js)
    await updateDuelStats(winnerDb.id, loserDb.id, duelResult)

    // Apply cooldowns (delegated to database.js via CooldownManager)
    await applyCooldowns(winnerDb.discordId, loserDb.discordId, guildId)

    // Increment daily duel count for the attacker (initiator)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isNewDay = !attackerDb.dailyDuelDate || attackerDb.dailyDuelDate < today
    await incrementDailyDuelCount(attackerDb.id, isNewDay)

    let polymorphiaApplied = false
    let polymorphiaFailureReason = null

    // If attacker won and not blocked by shield, apply polymorphia
    if (isAttackerWinner && !duelResult.blockedByShield) {
        try {
            await applyPolymorphia(interaction, loserDb.discordId, guildId)
            polymorphiaApplied = true
        } catch (error) {
            polymorphiaFailureReason = error.message
            console.error(`[Polymorphia Duel] ❌ Error aplicando polimorfia a ${loserDb.username}:`, error.message)
        }
    }

    return {
        isAttackerWinner,
        blockedByShield: duelResult.blockedByShield || false,
        polymorphiaApplied,
        polymorphiaFailureReason,
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
                description: `Ganó duelo de Polymorphia vs ${loserDb.username} (neto +${WINNER_REWARD - DUEL_BET})`
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
                description: `Reembolso de duelo de Polymorphia vs ${winnerDb.username} (neto -${DUEL_BET - LOSER_REFUND})`
            }
        })
    ])
}

/**
 * Update polymorphia stats for both users.
 * Delegated to database.js helpers.
 * @param {string} winnerDbId - Internal UUID of the winner
 * @param {string} loserDbId - Internal UUID of the loser
 * @param {object} duelResult
 */
async function updateDuelStats(winnerDbId, loserDbId, duelResult) {
    if (duelResult.winner === 'attacker') {
        await recordDuelResult(winnerDbId, loserDbId, duelResult.blockedByShield || false)
    } else {
        await recordDefenderWin(winnerDbId, loserDbId)
    }
}

/**
 * Apply the polymorphia nickname effect via DeepSeek and save state.
 * @param {object} interaction - Discord interaction
 * @param {string} targetDiscordId - Discord snowflake of the loser
 * @param {string} guildId
 * @throws {Error} If the nickname cannot be changed due to permissions or hierarchy
 */
async function applyPolymorphia(interaction, targetDiscordId, guildId) {
    const member = interaction.options?.resolved?.members?.get(targetDiscordId) ||
        await interaction.guild.members.fetch(targetDiscordId)

    // Pre-check: can the bot actually change this member's nickname?
    if (!member.manageable) {
        const reason = member.user?.id === interaction.guild?.ownerId
            ? 'el propietario del servidor está protegido por la magia del gremio'
            : 'el bot no tiene permiso para cambiar el apodo de este miembro'
        throw new Error(`No se pudo aplicar la polimorfia: ${reason}`)
    }

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

    // Save previous nickname and set new one
    await member.setNickname(
        polymorphNickname,
        `Polymorphia duel: transformed by ${interaction.user.username}`
    )

    // Get or create User DB record to get internal ID
    const { getOrCreateUser } = require('#services/database')
    const userDb = await getOrCreateUser(targetDiscordId, guildId, displayName)

    // Create PolymorphiaState via database.js helper
    await createPolymorphiaState(userDb.id, guildId, displayName, polymorphNickname, durationMinutes)
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