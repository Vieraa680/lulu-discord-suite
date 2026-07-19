import { describe, it, expect } from 'vitest'
import {
  rollD20,
  getAttackerModifier,
  getDefenderModifier,
  resolveDuel,
  resolveBestOfThree,
  getRandomDuration,
  getDefenseItemConfig,
  DEFENSE_ITEMS,
} from '../DuelEngine'

describe('DuelEngine', () => {
  // ── rollD20 ──────────────────────────────────────
  describe('rollD20()', () => {
    it('should return a number between 1 and 20', () => {
      for (let i = 0; i < 1000; i++) {
        const roll = rollD20()
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(20)
        expect(Number.isInteger(roll)).toBe(true)
      }
    })

    it('should have a roughly uniform distribution', () => {
      const counts = new Array(21).fill(0)
      const trials = 200_000
      for (let i = 0; i < trials; i++) {
        counts[rollD20()]++
      }
      // Each face should appear ~5% of the time
      const minExpected = trials / 20 * 0.9 // allow 10% tolerance
      const maxExpected = trials / 20 * 1.1
      for (let face = 1; face <= 20; face++) {
        expect(counts[face]).toBeGreaterThan(minExpected)
        expect(counts[face]).toBeLessThan(maxExpected)
      }
    })
  })

  // ── getAttackerModifier ──────────────────────────
  describe('getAttackerModifier()', () => {
    it('should return 0 for a new user with no wins or veteran bonus', () => {
      expect(getAttackerModifier({ polymorphiaWins: 0 })).toBe(0)
    })

    it('should return wins capped at 5 plus veteran bonus', () => {
      expect(getAttackerModifier({ polymorphiaWins: 3, veteranBonus: 0 })).toBe(3)
      expect(getAttackerModifier({ polymorphiaWins: 7, veteranBonus: 0 })).toBe(5) // capped at 5
      expect(getAttackerModifier({ polymorphiaWins: 5, veteranBonus: 0 })).toBe(5)
    })

    it('should add veteran bonus', () => {
      expect(getAttackerModifier({ polymorphiaWins: 2, veteranBonus: 1 })).toBe(3)
      expect(getAttackerModifier({ polymorphiaWins: 5, veteranBonus: 2 })).toBe(7) // 5 capped + 2
    })

    it('should handle missing fields gracefully', () => {
      expect(getAttackerModifier({})).toBe(0)
    })
  })

  // ── getDefenderModifier ──────────────────────────
  describe('getDefenderModifier()', () => {
    it('should return 0 for a new user with no saves', () => {
      expect(getDefenderModifier({ polymorphiaSaved: 0 }, null)).toBe(0)
    })

    it('should return saves capped at 3 plus veteran bonus', () => {
      expect(getDefenderModifier({ polymorphiaSaved: 2, veteranBonus: 0 }, null)).toBe(2)
      expect(getDefenderModifier({ polymorphiaSaved: 5, veteranBonus: 0 }, null)).toBe(3) // capped
    })

    it('should add defense item roll bonus', () => {
      const item = { rollBonus: 3 }
      expect(getDefenderModifier({ polymorphiaSaved: 1, veteranBonus: 0 }, item)).toBe(4) // 1 + 3
    })

    it('should add veteran bonus', () => {
      expect(getDefenderModifier({ polymorphiaSaved: 2, veteranBonus: 2 }, null)).toBe(4) // 2 + 2
    })

    it('should handle missing fields gracefully', () => {
      expect(getDefenderModifier({}, null)).toBe(0)
      expect(getDefenderModifier({}, { rollBonus: 2 })).toBe(2)
    })
  })

  // ── resolveDuel ──────────────────────────────────
  describe('resolveDuel()', () => {
    it('should return an object with all expected keys', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveDuel(attacker, defender, null)
      expect(result).toHaveProperty('winner')
      expect(result).toHaveProperty('attackerRoll')
      expect(result).toHaveProperty('defenderRoll')
      expect(result).toHaveProperty('attackerModifier')
      expect(result).toHaveProperty('defenderModifier')
      expect(result).toHaveProperty('defenseItemUsed')
      expect(result).toHaveProperty('blockedByShield')
    })

    it('should declare a winner (attacker or defender)', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveDuel(attacker, defender, null)
      expect(['attacker', 'defender']).toContain(result.winner)
    })

    it('should use defense item config when provided', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveDuel(attacker, defender, 'Poción de Polvo de Hada')
      expect(result.defenderModifier).toBe(3) // defender gets +3 from the item
      expect(result.defenseItemUsed).toBe('Poción de Polvo de Hada')
    })

    it('should give attacker advantage with high wins', () => {
      const strongAttacker = { polymorphiaWins: 5, veteranBonus: 0 }
      const weakDefender = { polymorphiaSaved: 0, veteranBonus: 0 }
      // With a +5 advantage, attacker should win more often than not
      let attackerWins = 0
      const trials = 1000
      for (let i = 0; i < trials; i++) {
        const result = resolveDuel(strongAttacker, weakDefender, null)
        if (result.winner === 'attacker') attackerWins++
      }
      // Attacker with +5 mod should win > 60% of the time
      expect(attackerWins).toBeGreaterThan(trials * 0.6)
    })
  })

  // ── resolveBestOfThree ───────────────────────────
  describe('resolveBestOfThree()', () => {
    it('should return an object with series-level keys', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveBestOfThree(attacker, defender, null)
      expect(result).toHaveProperty('winner')
      expect(result).toHaveProperty('blockedByShield')
      expect(result).toHaveProperty('rounds')
      expect(result).toHaveProperty('attackerWins')
      expect(result).toHaveProperty('defenderWins')
      expect(result).toHaveProperty('defenseItemUsed')
    })

    it('should play 2 or 3 rounds (best of 3)', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveBestOfThree(attacker, defender, null)
      expect(result.rounds.length).toBeGreaterThanOrEqual(2)
      expect(result.rounds.length).toBeLessThanOrEqual(3)
    })

    it('should have correct total wins across rounds', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveBestOfThree(attacker, defender, null)
      const totalRounds = result.rounds.length
      // Determine winner: first to 2 wins
      if (totalRounds === 2) {
        // One side won both rounds
        const firstWinner = result.rounds[0].winner
        const secondWinner = result.rounds[1].winner
        expect(firstWinner).toBe(secondWinner)
        expect(result.attackerWins).toBe(firstWinner === 'attacker' ? 2 : 0)
        expect(result.defenderWins).toBe(firstWinner === 'defender' ? 2 : 0)
      } else {
        // 3 rounds: one side won 2, the other won 1
        expect(result.attackerWins + result.defenderWins).toBe(3)
        expect(Math.max(result.attackerWins, result.defenderWins)).toBe(2)
        expect(Math.min(result.attackerWins, result.defenderWins)).toBe(1)
      }
    })

    it('series winner should match the side with 2+ wins', () => {
      const attacker = { polymorphiaWins: 0, veteranBonus: 0 }
      const defender = { polymorphiaSaved: 0, veteranBonus: 0 }
      const result = resolveBestOfThree(attacker, defender, null)
      if (result.attackerWins >= 2) {
        expect(result.winner).toBe('attacker')
      } else {
        expect(result.winner).toBe('defender')
      }
    })
  })

  // ── getRandomDuration ────────────────────────────
  describe('getRandomDuration()', () => {
    it('should return a number between 30 and 120', () => {
      for (let i = 0; i < 100; i++) {
        const duration = getRandomDuration()
        expect(duration).toBeGreaterThanOrEqual(30)
        expect(duration).toBeLessThanOrEqual(120)
        expect(Number.isInteger(duration)).toBe(true)
      }
    })
  })

  // ── getDefenseItemConfig ─────────────────────────
  describe('getDefenseItemConfig()', () => {
    it('should return the config for a known item', () => {
      const config = getDefenseItemConfig('Escudo de Banshee')
      expect(config).toEqual(DEFENSE_ITEMS['Escudo de Banshee'])
    })

    it('should return null for an unknown item', () => {
      expect(getDefenseItemConfig('NonExistentItem')).toBeNull()
    })

    it('should return null for null/undefined input', () => {
      expect(getDefenseItemConfig(null)).toBeNull()
      expect(getDefenseItemConfig(undefined)).toBeNull()
    })
  })

  // ── DEFENSE_ITEMS ────────────────────────────────
  describe('DEFENSE_ITEMS', () => {
    it('should have exactly 3 items', () => {
      expect(Object.keys(DEFENSE_ITEMS).length).toBe(3)
    })

    it('each item should have required properties', () => {
      for (const [name, item] of Object.entries(DEFENSE_ITEMS)) {
        expect(item).toHaveProperty('effect')
        expect(item).toHaveProperty('rollBonus')
        expect(item).toHaveProperty('consumed')
        expect(item).toHaveProperty('description')
        expect(['block', 'halve_duration', 'roll_bonus']).toContain(item.effect)
        expect(typeof item.rollBonus).toBe('number')
        expect(typeof item.consumed).toBe('boolean')
      }
    })
  })
})