import { describe, it, expect } from 'vitest'
const {
  getXpForLevel,
  getTotalXpForLevel,
  getLevelFromTotalXp,
  generateProgressBar,
  getLevelProgress,
  calculateRoleMultiplier,
  generateRandomXp,
} = require('../leveling/xpCalculator')

describe('xpCalculator', () => {
  describe('getXpForLevel', () => {
    it('should calculate requirement for Level 0 -> 1 (100 XP)', () => {
      expect(getXpForLevel(0)).toBe(100)
    })

    it('should calculate requirement for Level 1 -> 2 (155 XP)', () => {
      expect(getXpForLevel(1)).toBe(155)
    })

    it('should calculate requirement for Level 2 -> 3 (220 XP)', () => {
      expect(getXpForLevel(2)).toBe(220)
    })

    it('should calculate requirement for Level 5 -> 6 (475 XP)', () => {
      // 5 * 25 + 50 * 5 + 100 = 125 + 250 + 100 = 475
      expect(getXpForLevel(5)).toBe(475)
    })

    it('should handle negative or undefined levels safely', () => {
      expect(getXpForLevel(-5)).toBe(100)
      expect(getXpForLevel(null)).toBe(100)
    })
  })

  describe('getTotalXpForLevel', () => {
    it('should return 0 for level 0', () => {
      expect(getTotalXpForLevel(0)).toBe(0)
    })

    it('should match the iterative sum of getXpForLevel for levels 1 to 10', () => {
      let accumulated = 0
      for (let lvl = 0; lvl < 10; lvl++) {
        expect(getTotalXpForLevel(lvl)).toBe(accumulated)
        accumulated += getXpForLevel(lvl)
      }
      expect(getTotalXpForLevel(1)).toBe(100)
      expect(getTotalXpForLevel(2)).toBe(255)
      expect(getTotalXpForLevel(3)).toBe(475)
    })
  })

  describe('getLevelFromTotalXp', () => {
    it('should identify level boundaries correctly', () => {
      expect(getLevelFromTotalXp(0)).toBe(0)
      expect(getLevelFromTotalXp(99)).toBe(0)
      expect(getLevelFromTotalXp(100)).toBe(1)
      expect(getLevelFromTotalXp(254)).toBe(1)
      expect(getLevelFromTotalXp(255)).toBe(2)
      expect(getLevelFromTotalXp(474)).toBe(2)
      expect(getLevelFromTotalXp(475)).toBe(3)
    })

    it('should handle high amounts of XP', () => {
      const lvl20Xp = getTotalXpForLevel(20)
      expect(getLevelFromTotalXp(lvl20Xp)).toBe(20)
      expect(getLevelFromTotalXp(lvl20Xp + 50)).toBe(20)
    })
  })

  describe('getLevelProgress', () => {
    it('should return correct progress metrics for intermediate XP', () => {
      // Level 1 starts at 100 XP, Level 2 starts at 255 XP (155 XP needed)
      // At 150 total XP, user has 50 XP into Level 1
      const progress = getLevelProgress(150)
      expect(progress.level).toBe(1)
      expect(progress.totalXp).toBe(150)
      expect(progress.currentLevelXp).toBe(50)
      expect(progress.neededLevelXp).toBe(155)
      expect(progress.remainingXp).toBe(105)
      expect(progress.progressPercent).toBe(32) // Math.floor((50 / 155) * 100) = 32%
      expect(progress.progressBar).toContain('█')
    })

    it('should return 0% progress at exact level boundary', () => {
      const progress = getLevelProgress(100)
      expect(progress.level).toBe(1)
      expect(progress.currentLevelXp).toBe(0)
      expect(progress.progressPercent).toBe(0)
      expect(progress.remainingXp).toBe(155)
    })
  })

  describe('generateProgressBar', () => {
    it('should generate empty bar for 0 progress', () => {
      expect(generateProgressBar(0, 100, 10)).toBe('[░░░░░░░░░░]')
    })

    it('should generate half-filled bar for 50% progress', () => {
      expect(generateProgressBar(50, 100, 10)).toBe('[█████░░░░░]')
    })

    it('should generate completely filled bar for 100% progress', () => {
      expect(generateProgressBar(100, 100, 10)).toBe('[██████████]')
    })

    it('should handle edge cases like max <= 0', () => {
      expect(generateProgressBar(50, 0, 10)).toBe('[██████████]')
    })
  })

  describe('calculateRoleMultiplier', () => {
    const multipliers = [
      { roleId: 'role-vip', roleName: 'VIP', multiplier: 1.5 },
      { roleId: 'role-booster', roleName: 'Booster', multiplier: 2.0 },
    ]

    it('should return 1.0 when member has no matching roles', () => {
      const memberRoles = new Set(['role-member', 'role-regular'])
      expect(calculateRoleMultiplier(memberRoles, multipliers)).toBe(1.0)
    })

    it('should apply matching multiplier', () => {
      const memberRoles = new Set(['role-vip'])
      expect(calculateRoleMultiplier(memberRoles, multipliers)).toBe(1.5)
    })

    it('should select highest multiplier if member has multiple bonuses', () => {
      const memberRoles = new Set(['role-vip', 'role-booster'])
      expect(calculateRoleMultiplier(memberRoles, multipliers)).toBe(2.0)
    })

    it('should support array input and Discord.js cache format', () => {
      expect(calculateRoleMultiplier(['role-booster'], multipliers)).toBe(2.0)

      const discordMember = {
        roles: {
          cache: {
            has: (id: string) => id === 'role-vip',
          },
        },
      }
      expect(calculateRoleMultiplier(discordMember.roles, multipliers)).toBe(1.5)
    })

    it('should return 1.0 when multipliers list is null or empty', () => {
      expect(calculateRoleMultiplier(['role-vip'], null)).toBe(1.0)
      expect(calculateRoleMultiplier(['role-vip'], [])).toBe(1.0)
    })
  })

  describe('generateRandomXp', () => {
    it('should generate XP within specified range', () => {
      for (let i = 0; i < 20; i++) {
        const xp = generateRandomXp(15, 25, 1.0)
        expect(xp).toBeGreaterThanOrEqual(15)
        expect(xp).toBeLessThanOrEqual(25)
      }
    })

    it('should apply multiplier properly', () => {
      for (let i = 0; i < 20; i++) {
        const xp = generateRandomXp(10, 10, 2.0)
        expect(xp).toBe(20)
      }
    })
  })
})
