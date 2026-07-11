const {
    canInitiateDuel,
    canBeTargeted,
    applyCooldowns,
    DUEL_COOLDOWN_MS,
    PROTECTION_MS,
    DAILY_LIMIT
} = require('#services/database')

module.exports = {
    DUEL_COOLDOWN_MS,
    PROTECTION_MS,
    DAILY_LIMIT,
    canInitiateDuel,
    canBeTargeted,
    applyCooldowns
}