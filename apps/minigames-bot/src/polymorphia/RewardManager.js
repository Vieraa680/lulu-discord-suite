const {
    prisma,
    createPolymorphiaState,
    recordDuelResult,
    recordDefenderWin,
    incrementDailyDuelCount,
    applyCooldowns,
    getOrCreateUser
} = require('#services/database')
const { generatePolymorphiaNickname } = require('#services/deepseek')
const { getRandomFallbackNickname } = require('./fallbackNicknames')
const { getRandomDuration } = require('./DuelEngine')
const { detectGender, g } = require('#utils/gender')

/**
 * Execute the full escrow + reward flow for a polymorphia duel.
 *
 * @param {object} interaction - Discord interaction (for member fetching)
 * @param {object} duelResult - Result from DuelEngine.resolveDuel()
 * @param {object} attackerDb - User DB record (attacker, includes .user relation)
 * @param {object} defenderDb - User DB record (defender, includes .user relation)
 * @param {string} guildId
 * @param {number} betAmount - Number of candies each player wagered
 * @returns {Promise<object>} Summary
 */
async function executeRewardFlow(interaction, duelResult, attackerDb, defenderDb, guildId, betAmount) {
    const isAttackerWinner = duelResult.winner === 'attacker'
    const winnerDb = isAttackerWinner ? attackerDb : defenderDb
    const loserDb = isAttackerWinner ? defenderDb : attackerDb

    // Distribute candies — winner takes both bets, loser loses everything
    await distributeCandies(winnerDb, loserDb, guildId, betAmount)

    // Update duel stats (delegated to database.js)
    await updateDuelStats(winnerDb.id, loserDb.id, duelResult)

    // Apply cooldowns (delegated to database.js)
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

async function distributeCandies(winnerDb, loserDb, guildId, betAmount) {
    // Get fresh records to have accurate balances
    const [freshWinner, freshLoser] = await Promise.all([
        prisma.user.findUnique({ where: { discordId_guildId: { discordId: winnerDb.discordId, guildId } } }),
        prisma.user.findUnique({ where: { discordId_guildId: { discordId: loserDb.discordId, guildId } } })
    ])

    const totalPot = betAmount * 2

    // Single transaction: deduct loser's bet, add both bets to winner
    await prisma.$transaction([
        // Loser loses their bet
        prisma.user.update({
            where: { id: freshLoser.id },
            data: { candies: { decrement: betAmount } }
        }),
        // Winner receives the full pot (their own bet back + loser's bet)
        prisma.user.update({
            where: { id: freshWinner.id },
            data: {
                candies: { increment: totalPot },
                totalEarned: { increment: betAmount }
            }
        }),
        // Transaction log for winner
        prisma.transaction.create({
            data: {
                userId: freshWinner.id,
                type: 'earn',
                amount: totalPot,
                balanceAfter: freshWinner.candies + totalPot,
                description: `Ganó duelo de Polymorphia vs ${loserDb.username} (+${betAmount} neto)`
            }
        }),
        // Transaction log for loser
        prisma.transaction.create({
            data: {
                userId: freshLoser.id,
                type: 'spend',
                amount: -betAmount,
                balanceAfter: freshLoser.candies - betAmount,
                description: `Perdió duelo de Polymorphia vs ${winnerDb.username} (-${betAmount})`
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

    const targetGender = detectGender(member)

    // Pre-check: can the bot actually change this member's nickname?
    if (!member.manageable) {
        const reason = member.user?.id === interaction.guild?.ownerId
            ? 'el owner del server está protegido por la magia del gremio'
            : 'no tengo permiso para cambiarle el nombre'
        const art = g(targetGender, { m: 'al', f: 'a la' })
        throw new Error(`no se pudo aplicar la polimorfia a ${art} perdedor${g(targetGender, { m: '', f: 'a' })}: ${reason}`)
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
    const userDb = await getOrCreateUser(targetDiscordId, guildId, displayName)

    // Create PolymorphiaState via database.js helper
    await createPolymorphiaState(userDb.id, guildId, displayName, polymorphNickname, durationMinutes)
}

module.exports = {
    executeRewardFlow,
    distributeCandies,
    updateDuelStats,
    applyPolymorphia
}
