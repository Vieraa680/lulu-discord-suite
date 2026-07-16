const { PrismaClient } = require('@prisma/client')

const prisma = globalThis.__prismaClient__ ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalThis.__prismaClient__ = prisma
}

/**
 * Get or create a user record for a given Discord user in a specific guild.
 * @param {string} discordId - Discord User snowflake
 * @param {string} guildId   - Discord Server ID
 * @param {string} username  - Display name
 */
async function getOrCreateUser(discordId, guildId, username) {
    return prisma.user.upsert({
        where: {
            discordId_guildId: { discordId, guildId }
        },
        update: { username },
        create: {
            discordId,
            guildId,
            username
        }
    })
}

/**
 * Add candies to a user's balance and log the transaction.
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} username
 * @param {number} amount
 * @param {string} description
 */
async function addCandies(discordId, guildId, username, amount, description) {
    const user = await getOrCreateUser(discordId, guildId, username)

    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                candies: { increment: amount },
                totalEarned: { increment: amount }
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'earn',
                amount,
                balanceAfter: user.candies + amount,
                description
            }
        })
    ])

    return updatedUser
}

/**
 * Spend (deduct) candies from a user and log the transaction.
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} username
 * @param {number} amount
 * @param {string} description
 */
async function spendCandies(discordId, guildId, username, amount, description) {
    const user = await getOrCreateUser(discordId, guildId, username)

    const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                candies: { decrement: amount },
                totalSpent: { increment: amount }
            }
        }),
        prisma.transaction.create({
            data: {
                userId: user.id,
                type: 'spend',
                amount,
                balanceAfter: user.candies - amount,
                description
            }
        })
    ])

    return updatedUser
}

// ════════════════════════════════════════════════════════
// POLYMORPHIA DUEL HELPERS
// ════════════════════════════════════════════════════════

/**
 * Create or update a PolymorphiaState record (user is being polymorphed).
 * @param {string} userId - Internal Prisma user ID
 * @param {string} guildId - Discord server ID
 * @param {string} previousNickname - Original nickname to restore on expiry
 * @param {string} currentForm - The polymorphia form/nickname
 * @param {number} durationMinutes - How long the effect lasts
 */
async function createPolymorphiaState(userId, guildId, previousNickname, currentForm, durationMinutes) {
    const now = new Date()
    const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000)

    return prisma.polymorphiaState.upsert({
        where: { userId },
        update: {
            isActive: true,
            currentForm,
            previousNickname,
            formDuration: durationMinutes,
            startedAt: now,
            endsAt,
            guildId
        },
        create: {
            userId,
            isActive: true,
            currentForm,
            previousNickname,
            formDuration: durationMinutes,
            startedAt: now,
            endsAt,
            guildId
        }
    })
}

/**
 * Mark a PolymorphiaState as expired (inactive).
 * @param {string} stateId - PolymorphiaState record ID
 */
async function expirePolymorphiaState(stateId) {
    return prisma.polymorphiaState.update({
        where: { id: stateId },
        data: {
            isActive: false,
            currentForm: '',
            startedAt: null,
            endsAt: null
        }
    })
}

/**
 * Record duel result stats (winner gets +1 win, loser gets +1 loss).
 * If isDefended is true, also increment polymorphiaSaved for the defender.
 * @param {string} winnerId - Internal Prisma user ID of the winner
 * @param {string} loserId - Internal Prisma user ID of the loser
 * @param {boolean} isDefended - Whether the defender blocked the nickname change
 */
async function recordDuelResult(winnerId, loserId, isDefended) {
    const operations = [
        prisma.user.update({
            where: { id: winnerId },
            data: { polymorphiaWins: { increment: 1 } }
        }),
        prisma.user.update({
            where: { id: loserId },
            data: { polymorphiaLosses: { increment: 1 } }
        })
    ]

    if (isDefended) {
        operations.push(
            prisma.user.update({
                where: { id: loserId },
                data: { polymorphiaSaved: { increment: 1 } }
            })
        )
    }

    return prisma.$transaction(operations)
}

/**
 * Record a defender-win duel result.
 * Defender gets +1 saved, loser (attacker) gets +1 loss.
 * @param {string} defenderId - Internal Prisma user ID of the defender
 * @param {string} attackerId - Internal Prisma user ID of the attacker
 */
async function recordDefenderWin(defenderId, attackerId) {
    return prisma.$transaction([
        prisma.user.update({
            where: { id: defenderId },
            data: { polymorphiaSaved: { increment: 1 } }
        }),
        prisma.user.update({
            where: { id: attackerId },
            data: { polymorphiaLosses: { increment: 1 } }
        })
    ])
}

/**
 * Fetch a user's polymorphia stats including active state.
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId - Discord server ID
 */
async function getPolymorphiaStats(discordId, guildId) {
    return prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: { state: true }
    })
}

/**
 * Increment the daily duel count for the attacker (initiator).
 * Resets to 1 if it's a new day.
 * @param {string} userId - Internal Prisma user ID
 * @param {boolean} isNewDay - Whether the last duel was on a different day
 */
async function incrementDailyDuelCount(userId, isNewDay) {
    return prisma.user.update({
        where: { id: userId },
        data: {
            dailyDuelCount: isNewDay ? 1 : { increment: 1 },
            dailyDuelDate: new Date()
        }
    })
}

// ════════════════════════════════════════════════════════
// ITEM HELPERS
// ════════════════════════════════════════════════════════

/**
 * Get all items owned by a user with quantity > 0.
 * @param {string} userId - Internal Prisma user ID
 */
async function getUserItems(userId) {
    return prisma.userItem.findMany({
        where: { userId, quantity: { gt: 0 } },
        include: { item: true }
    })
}

/**
 * Get a user's owned defense/consumable items usable in polymorphia duels.
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId - Discord server ID
 */
async function getUserOwnedDefenseItems(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: {
            items: {
                where: {
                    quantity: { gt: 0 },
                    item: {
                        OR: [
                            { category: 'defense' },
                            { category: 'consumable', name: 'Poción de Polvo de Hada' }
                        ]
                    }
                },
                include: { item: true }
            }
        }
    })

    if (!user) return []

    return user.items.map(ui => ({
        name: ui.item.name,
        quantity: ui.quantity,
        category: ui.item.category,
        rarity: ui.item.rarity,
        emoji: ui.item.emoji
    }))
}

/**
 * Check if a user owns at least 1 of a specific item.
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} itemName
 */
async function userOwnsItem(discordId, guildId, itemName) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } },
        include: {
            items: {
                where: { quantity: { gt: 0 }, item: { name: itemName } }
            }
        }
    })

    return !!(user && user.items.length > 0)
}

/**
 * Consume one unit of an item (decrement quantity or delete if last).
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} itemName
 */
async function consumeUserItem(discordId, guildId, itemName) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) return

    const item = await prisma.item.findUnique({ where: { name: itemName } })
    if (!item) return

    const userItem = await prisma.userItem.findUnique({
        where: { userId_itemId: { userId: user.id, itemId: item.id } }
    })
    if (!userItem || userItem.quantity <= 0) return

    if (userItem.quantity <= 1) {
        await prisma.userItem.delete({ where: { id: userItem.id } })
    } else {
        await prisma.userItem.update({
            where: { id: userItem.id },
            data: { quantity: { decrement: 1 } }
        })
    }
}

/**
 * Purchase an item for a user (deduct candies, add to inventory).
 * @param {string} discordId
 * @param {string} guildId
 * @param {string} itemName
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function purchaseItem(discordId, guildId, itemName) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) {
        return { success: false, error: 'User not found. Use the bot first to create your profile.' }
    }

    const item = await prisma.item.findUnique({ where: { name: itemName } })
    if (!item || !item.isActive) {
        return { success: false, error: 'That item does not exist or is not available.' }
    }
    if (item.price <= 0) {
        return { success: false, error: 'That item cannot be purchased.' }
    }
    if (user.candies < item.price) {
        return {
            success: false,
            error: `You need **${item.price} 🍬 candies** to buy ${item.name}. You have ${user.candies}.`
        }
    }

    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    candies: { decrement: item.price },
                    totalSpent: { increment: item.price }
                }
            }),
            prisma.transaction.create({
                data: {
                    userId: user.id,
                    type: 'spend',
                    amount: item.price,
                    balanceAfter: user.candies - item.price,
                    description: `Purchased ${item.name}`,
                    referenceId: item.id
                }
            }),
            prisma.userItem.upsert({
                where: { userId_itemId: { userId: user.id, itemId: item.id } },
                update: { quantity: { increment: 1 } },
                create: { userId: user.id, itemId: item.id, quantity: 1 }
            })
        ])

        return { success: true }
    } catch (error) {
        console.error('[database:purchaseItem] Error:', error.message)
        return { success: false, error: 'An error occurred during purchase. Please try again.' }
    }
}

// ════════════════════════════════════════════════════════
// COOLDOWN HELPERS
// ════════════════════════════════════════════════════════

const DUEL_COOLDOWN_MS = 10 * 60 * 1000
const PROTECTION_MS = 4 * 60 * 60 * 1000
const DAILY_LIMIT = 5

/**
 * Check if a user can initiate a polymorphia duel.
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId - Discord server ID
 * @returns {Promise<{allowed: boolean, reason?: string, remainingMinutes?: number, limit?: number}>}
 */
async function canInitiateDuel(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) return { allowed: true }

    // Cooldown check (10 min)
    if (user.lastPolymorphiaUse) {
        const elapsed = Date.now() - user.lastPolymorphiaUse.getTime()
        if (elapsed < DUEL_COOLDOWN_MS) {
            const remaining = Math.ceil((DUEL_COOLDOWN_MS - elapsed) / 1000 / 60)
            return { allowed: false, reason: 'cooldown', remainingMinutes: remaining }
        }
    }

    // Daily limit check
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (user.dailyDuelDate && user.dailyDuelDate >= today && user.dailyDuelCount >= DAILY_LIMIT) {
        return { allowed: false, reason: 'daily_limit', limit: DAILY_LIMIT }
    }

    return { allowed: true }
}

/**
 * Check if a user can be targeted by a polymorphia duel (protection period + already polymorphed).
 * @param {string} discordId - Discord snowflake
 * @param {string} guildId - Discord server ID
 * @returns {Promise<{allowed: boolean, reason?: string, until?: Date}>}
 */
async function canBeTargeted(discordId, guildId) {
    const user = await prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
    if (!user) return { allowed: true }

    // Protection check (4h)
    if (user.polymorphiaProtectedUntil && user.polymorphiaProtectedUntil > new Date()) {
        return { allowed: false, reason: 'protection', until: user.polymorphiaProtectedUntil }
    }

    // Already polymorphed check
    const activeState = await prisma.polymorphiaState.findFirst({
        where: {
            user: { discordId, guildId },
            isActive: true
        }
    })
    if (activeState) {
        return { allowed: false, reason: 'already_polymorphed', until: activeState.endsAt }
    }

    return { allowed: true }
}

/**
 * Apply cooldown (attacker) and protection (defender) timers after a duel.
 * @param {string} attackerDiscordId
 * @param {string} defenderDiscordId
 * @param {string} guildId
 */
async function applyCooldowns(attackerDiscordId, defenderDiscordId, guildId) {
    const now = new Date()

    await prisma.user.updateMany({
        where: { discordId: attackerDiscordId, guildId },
        data: { lastPolymorphiaUse: now }
    })

    await prisma.user.updateMany({
        where: { discordId: defenderDiscordId, guildId },
        data: { polymorphiaProtectedUntil: new Date(now.getTime() + PROTECTION_MS) }
    })
}

/**
 * Find a user by Discord ID and Guild ID.
 * @param {string} discordId
 * @param {string} guildId
 */
async function findUserByDiscord(discordId, guildId) {
    return prisma.user.findUnique({
        where: { discordId_guildId: { discordId, guildId } }
    })
}

/**
 * Find a user by internal Prisma ID.
 * @param {string} id
 */
async function findUserById(id) {
    return prisma.user.findUnique({ where: { id } })
}

/**
 * Get server-wide aggregate statistics for a given guild.
 * @param {string} guildId - Discord Server ID
 * @returns {Promise<object>} Server stats summary
 */
async function getServerStats(guildId) {
    const [
        totalUsers,
        totalCandies,
        totalEarned,
        totalSpent,
        totalPolymorphiaDuels,
        totalPolymorphiaWins,
        totalPolymorphiaLosses,
        totalPolymorphiaSaved,
        activePolymorphiaCount,
        totalTransactions
    ] = await Promise.all([
        prisma.user.count({ where: { guildId } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { candies: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { totalEarned: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { totalSpent: true } }),
        prisma.user.aggregate({
            where: { guildId },
            _sum: { polymorphiaWins: true, polymorphiaLosses: true }
        }),
        prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaWins: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaLosses: true } }),
        prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaSaved: true } }),
        prisma.polymorphiaState.count({
            where: {
                guildId,
                isActive: true
            }
        }),
        prisma.transaction.count({
            where: {
                user: { guildId }
            }
        })
    ])

    return {
        totalUsers,
        totalCandiesInEconomy: totalCandies._sum.candies || 0,
        totalEarned: totalEarned._sum.totalEarned || 0,
        totalSpent: totalSpent._sum.totalSpent || 0,
        totalDuels: (totalPolymorphiaDuels._sum.polymorphiaWins || 0) + (totalPolymorphiaDuels._sum.polymorphiaLosses || 0),
        totalPolymorphiaWins: totalPolymorphiaWins._sum.polymorphiaWins || 0,
        totalPolymorphiaLosses: totalPolymorphiaLosses._sum.polymorphiaLosses || 0,
        totalPolymorphiaSaved: totalPolymorphiaSaved._sum.polymorphiaSaved || 0,
        activePolymorphiaCount,
        totalTransactions
    }
}

/**
 * Get a leaderboard for a specific stat category within a guild.
 * @param {string} guildId - Discord Server ID
 * @param {string} category - 'candies' | 'polymorphiaWins' | 'polymorphiaSaved' | 'totalEarned'
 * @param {number} [limit=10] - How many entries to return
 * @returns {Promise<Array<{discordId: string, username: string, value: number}>>}
 */
async function getLeaderboard(guildId, category, limit = 10) {
    const allowedFields = ['candies', 'polymorphiaWins', 'polymorphiaSaved', 'totalEarned', 'polymorphiaLosses']
    if (!allowedFields.includes(category)) {
        throw new Error(`Invalid leaderboard category: "${category}". Allowed: ${allowedFields.join(', ')}`)
    }

    const users = await prisma.user.findMany({
        where: {
            guildId,
            [category]: { gt: 0 }
        },
        orderBy: { [category]: 'desc' },
        take: limit,
        select: {
            discordId: true,
            username: true,
            [category]: true
        }
    })

    return users.map(u => ({
        discordId: u.discordId,
        username: u.username,
        value: u[category]
    }))
}

/**
 * Get total count of butterflies caught (transactions with 'butterfly' in description).
 * @param {string} guildId
 * @returns {Promise<number>}
 */
async function getButterflyCaughtCount(guildId) {
    return prisma.transaction.count({
        where: {
            description: { contains: 'mariposa' },
            user: { guildId }
        }
    })
}

module.exports = {
    // Prisma client (for advanced use cases)
    prisma,

    // Existing helpers
    getOrCreateUser,
    addCandies,
    spendCandies,

    // ── Generic user helpers ──
    findUserByDiscord,
    findUserById,

    // ── Polymorphia duel helpers ──
    createPolymorphiaState,
    expirePolymorphiaState,
    recordDuelResult,
    recordDefenderWin,
    getPolymorphiaStats,
    incrementDailyDuelCount,

    // ── Item helpers ──
    getUserItems,
    getUserOwnedDefenseItems,
    userOwnsItem,
    consumeUserItem,
    purchaseItem,

    // ── Cooldown helpers ──
    DUEL_COOLDOWN_MS,
    PROTECTION_MS,
    DAILY_LIMIT,
    canInitiateDuel,
    canBeTargeted,
    applyCooldowns,

    // ── Statistics helpers ──
    getServerStats,
    getLeaderboard,
    getButterflyCaughtCount
}