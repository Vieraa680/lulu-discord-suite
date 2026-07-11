const DEFENSE_ITEMS = {
    'Escudo de Banshee': {
        effect: 'block',
        blockChance: 0.5,
        consumed: true,
        rollBonus: 0,
        description: '50% chance to block the nickname change'
    },
    'Cetro de Cristal': {
        effect: 'halve_duration',
        rollBonus: 1,
        consumed: false,
        description: 'Halves polymorphia duration, +1 to defense roll'
    },
    'Poción de Polvo de Hada': {
        effect: 'roll_bonus',
        rollBonus: 3,
        consumed: true,
        description: '+3 to your defense roll'
    }
}

/**
 * Roll a virtual 20-sided die.
 * @returns {number} 1–20
 */
function rollD20() {
    return Math.floor(Math.random() * 20) + 1
}

/**
 * Calculate an attacker's roll modifier.
 * @param {object} userStats - User DB record with polymorphiaWins
 * @returns {number} Total modifier
 */
function getAttackerModifier(userStats) {
    let bonus = 0
    // +1 per win, cap at +5
    bonus += Math.min(userStats.polymorphiaWins || 0, 5)
    return bonus
}

/**
 * Calculate a defender's roll modifier.
 * @param {object} userStats - User DB record with polymorphiaSaved, polymorphiaLosses
 * @param {object|null} defenseItem - Defense item config used
 * @returns {number} Total modifier
 */
function getDefenderModifier(userStats, defenseItem) {
    let bonus = 0
    // +1 per successful defense, cap at +3
    bonus += Math.min(userStats.polymorphiaSaved || 0, 3)
    // Defense item bonus
    if (defenseItem) {
        bonus += defenseItem.rollBonus || 0
    }
    return bonus
}

/**
 * Resolve a polymorphia duel between attacker and defender.
 *
 * @param {object} attackerStats - User DB record (attacker)
 * @param {object} defenderStats - User DB record (defender)
 * @param {string|null} defenseItemName - Name of the defense item used (or null)
 * @returns {object} Result object
 *
 * Result shape:
 * {
 *   winner: 'attacker' | 'defender',
 *   attackerRoll: number,
 *   defenderRoll: number,
 *   attackerModifier: number,
 *   defenderModifier: number,
 *   defenseItemUsed: string|null,
 *   blockedByShield: boolean      // true if Escudo de Banshee blocked the nickname change
 * }
 */
function resolveDuel(attackerStats, defenderStats, defenseItemName) {
    const defenseItem = defenseItemName ? DEFENSE_ITEMS[defenseItemName] : null

    const attackerMod = getAttackerModifier(attackerStats)
    const defenderMod = getDefenderModifier(defenderStats, defenseItem)

    const rawAttackerRoll = rollD20()
    const rawDefenderRoll = rollD20()

    const attackerTotal = rawAttackerRoll + attackerMod
    const defenderTotal = rawDefenderRoll + defenderMod

    const result = {
        attackerRoll: attackerTotal,
        defenderRoll: defenderTotal,
        attackerModifier: attackerMod,
        defenderModifier: defenderMod,
        defenseItemUsed: defenseItemName || null,
        blockedByShield: false
    }

    // Attacker wins on strictly higher roll
    if (attackerTotal > defenderTotal) {
        result.winner = 'attacker'

        // Check if Escudo de Banshee blocks the nickname change
        if (defenseItem && defenseItem.effect === 'block') {
            result.blockedByShield = Math.random() < defenseItem.blockChance
        }
    } else {
        // Defender wins on tie or higher
        result.winner = 'defender'
    }

    return result
}

/**
 * Generate a random polymorphia duration between 30 and 120 minutes.
 * @returns {number} Duration in minutes
 */
function getRandomDuration() {
    return Math.floor(Math.random() * (120 - 30 + 1)) + 30
}

/**
 * Get the config for a defense item by name.
 * @param {string} itemName
 * @returns {object|null}
 */
function getDefenseItemConfig(itemName) {
    return DEFENSE_ITEMS[itemName] || null
}

module.exports = {
    DEFENSE_ITEMS,
    resolveDuel,
    rollD20,
    getAttackerModifier,
    getDefenderModifier,
    getRandomDuration,
    getDefenseItemConfig
}