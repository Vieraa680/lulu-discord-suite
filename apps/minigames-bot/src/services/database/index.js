const { prisma } = require('./prisma')
const { getOrCreateUser, findUserByDiscord, findUserById } = require('./users')
const { addCandies, spendCandies } = require('./economy')
const {
    createPolymorphiaState,
    expirePolymorphiaState,
    recordDuelResult,
    recordDefenderWin,
    getPolymorphiaStats,
    incrementDailyDuelCount
} = require('./polymorphia')
const {
    getUserItems,
    getUserOwnedDefenseItems,
    userOwnsItem,
    consumeUserItem,
    purchaseItem
} = require('./items')
const {
    DUEL_COOLDOWN_MS,
    PROTECTION_MS,
    DAILY_LIMIT,
    canInitiateDuel,
    canBeTargeted,
    applyCooldowns
} = require('./cooldowns')
const { getServerStats, getLeaderboard, getButterflyCaughtCount } = require('./stats')

module.exports = {
    prisma,
    getOrCreateUser,
    findUserByDiscord,
    findUserById,
    addCandies,
    spendCandies,
    createPolymorphiaState,
    expirePolymorphiaState,
    recordDuelResult,
    recordDefenderWin,
    getPolymorphiaStats,
    incrementDailyDuelCount,
    getUserItems,
    getUserOwnedDefenseItems,
    userOwnsItem,
    consumeUserItem,
    purchaseItem,
    DUEL_COOLDOWN_MS,
    PROTECTION_MS,
    DAILY_LIMIT,
    canInitiateDuel,
    canBeTargeted,
    applyCooldowns,
    getServerStats,
    getLeaderboard,
    getButterflyCaughtCount
}
