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
    bonus += Math.min(userStats.polymorphiaWins || 0, 5)
    bonus += (userStats.veteranBonus || 0)
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
    bonus += Math.min(userStats.polymorphiaSaved || 0, 3)
    bonus += (userStats.veteranBonus || 0)
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
 */
function resolveDuel(attackerStats, defenderStats, defenseItemName) {
    const defenseItem = defenseItemName ? DEFENSE_ITEMS[defenseItemName] : null

    const attackerMod = getAttackerModifier(attackerStats)
    const defenderMod = getDefenderModifier(defenderStats, defenseItem)

    const rawAttackerRoll = rollD20()
    const rawDefenderRoll = rollD20()

    console.log(`[Polymorphia Duel] 🎲 Dados — Atacante: dado=${rawAttackerRoll} + mod=${attackerMod} = ${rawAttackerRoll + attackerMod} | Defensor: dado=${rawDefenderRoll} + mod=${defenderMod} = ${rawDefenderRoll + defenderMod}`)

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

    if (attackerTotal > defenderTotal) {
        result.winner = 'attacker'
    } else {
        result.winner = 'defender'
    }

    return result
}

function resolveBestOfThree(attackerStats, defenderStats, defenseItemName) {
    const defenseItem = defenseItemName ? DEFENSE_ITEMS[defenseItemName] : null
    const rounds = []
    let attackerWins = 0
    let defenderWins = 0
    let seriesWinner = null
    let blockedByShield = false

    for (let round = 1; round <= 3; round++) {
        const roundResult = resolveDuel(attackerStats, defenderStats, defenseItemName)
        roundResult.round = round

        rounds.push(roundResult)

        if (roundResult.winner === 'attacker') {
            attackerWins++
        } else {
            defenderWins++
        }

        console.log(
            `[BestOf3] 🏆 Ronda ${round}: Atacante=${roundResult.attackerRoll} (d20+${roundResult.attackerModifier}) ` +
            `vs Defensor=${roundResult.defenderRoll} (d20+${roundResult.defenderModifier}) → ` +
            `${roundResult.winner} (${attackerWins}-${defenderWins})`
        )

        if (attackerWins >= 2 || defenderWins >= 2) {
            break
        }
    }

    seriesWinner = attackerWins >= 2 ? 'attacker' : 'defender'

    if (seriesWinner === 'attacker' && defenseItem && defenseItem.effect === 'block') {
        blockedByShield = Math.random() < defenseItem.blockChance
        console.log(`[BestOf3] 🛡️ Escudo de Banshee: ${blockedByShield ? 'BLOQUEÓ' : 'no bloqueó'} el cambio de apodo`)
    }

    return {
        winner: seriesWinner,
        blockedByShield,
        rounds,
        attackerWins,
        defenderWins,
        attackerRoll: rounds[rounds.length - 1].attackerRoll,
        defenderRoll: rounds[rounds.length - 1].defenderRoll,
        attackerModifier: rounds[0].attackerModifier,
        defenderModifier: rounds[0].defenderModifier,
        defenseItemUsed: defenseItemName || null
    }
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
    resolveBestOfThree,
    rollD20,
    getAttackerModifier,
    getDefenderModifier,
    getRandomDuration,
    getDefenseItemConfig
}
