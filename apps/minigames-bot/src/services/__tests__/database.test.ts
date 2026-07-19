import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock setup ────────────────────────────────────
// Set globalThis.__MOCKED_PRISMA__ at hoist time so that prisma.js picks it up
// synchronously when cooldowns.js / stats.js do require('./prisma').
const mockPrisma = vi.hoisted(() => {
  const mp = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    polymorphiaState: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    transaction: {
      count: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

// Load modules under test ONCE — prisma.js reads globalThis.__MOCKED_PRISMA__
// at require-time and returns the mock instead of the real PrismaClient.
const cooldowns = require('../database/cooldowns')
const stats = require('../database/stats')

beforeEach(() => {
  // Clear call/result history but preserve mock implementations
  for (const svc of Object.values(mockPrisma)) {
    if (typeof svc === 'function') {
      svc.mockClear()
    } else if (typeof svc === 'object' && svc !== null) {
      for (const method of Object.values(svc)) {
        if (typeof method === 'function' && method.mockClear) method.mockClear()
      }
    }
  }
})

// ── cooldowns ──────────────────────────────────────
describe('database — cooldowns', () => {
  const discordId = '123456789'
  const guildId = '987654321'

  describe('canInitiateDuel()', () => {
    it('should return allowed if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await cooldowns.canInitiateDuel(discordId, guildId)
      expect(result).toEqual({ allowed: true })
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { discordId_guildId: { discordId, guildId } },
      })
    })

    it('should return allowed if no lastPolymorphiaUse', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        lastPolymorphiaUse: null,
        dailyDuelDate: null,
        dailyDuelCount: 0,
      })

      const result = await cooldowns.canInitiateDuel(discordId, guildId)
      expect(result).toEqual({ allowed: true })
    })

    it('should reject if on cooldown (within 10 minutes)', async () => {
      const recentUse = new Date(Date.now() - 2 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        lastPolymorphiaUse: recentUse,
        dailyDuelDate: new Date(),
        dailyDuelCount: 1,
      })

      const result = await cooldowns.canInitiateDuel(discordId, guildId)
      expect(result).toEqual({
        allowed: false,
        reason: 'cooldown',
        remainingMinutes: expect.any(Number),
      })
      expect(result.remainingMinutes).toBeGreaterThan(0)
      expect(result.remainingMinutes).toBeLessThanOrEqual(10)
    })

    it('should allow if cooldown has expired', async () => {
      const oldUse = new Date(Date.now() - 15 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        lastPolymorphiaUse: oldUse,
        dailyDuelDate: null,
        dailyDuelCount: 0,
      })

      const result = await cooldowns.canInitiateDuel(discordId, guildId)
      expect(result).toEqual({ allowed: true })
    })

    it('should reject if daily limit reached', async () => {
      const oldUse = new Date(Date.now() - 15 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        lastPolymorphiaUse: oldUse,
        dailyDuelDate: new Date(),
        dailyDuelCount: 5,
      })

      const result = await cooldowns.canInitiateDuel(discordId, guildId)
      expect(result).toEqual({
        allowed: false,
        reason: 'daily_limit',
        limit: 5,
      })
    })

    it('should allow if daily limit not yet reached', async () => {
      const oldUse = new Date(Date.now() - 15 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        lastPolymorphiaUse: oldUse,
        dailyDuelDate: new Date(),
        dailyDuelCount: 3,
      })

      const result = await cooldowns.canInitiateDuel(discordId, guildId)
      expect(result).toEqual({ allowed: true })
    })
  })

  describe('canBeTargeted()', () => {
    it('should return allowed if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await cooldowns.canBeTargeted(discordId, guildId)
      expect(result).toEqual({ allowed: true })
    })

    it('should reject if user is under protection', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        polymorphiaProtectedUntil: futureDate,
      })

      const result = await cooldowns.canBeTargeted(discordId, guildId)
      expect(result).toEqual({
        allowed: false,
        reason: 'protection',
        until: futureDate,
      })
    })

    it('should reject if user is already polymorphed', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000)
      mockPrisma.user.findUnique.mockResolvedValue({
        polymorphiaProtectedUntil: null,
      })
      mockPrisma.polymorphiaState.findFirst.mockResolvedValue({
        isActive: true,
        endsAt: futureDate,
      })

      const result = await cooldowns.canBeTargeted(discordId, guildId)
      expect(result).toEqual({
        allowed: false,
        reason: 'already_polymorphed',
        until: futureDate,
      })
    })

    it('should return allowed if no protection and not polymorphed', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        polymorphiaProtectedUntil: null,
      })
      mockPrisma.polymorphiaState.findFirst.mockResolvedValue(null)

      const result = await cooldowns.canBeTargeted(discordId, guildId)
      expect(result).toEqual({ allowed: true })
    })
  })

  describe('applyCooldowns()', () => {
    it('should update attacker and defender cooldowns', async () => {
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 })

      await cooldowns.applyCooldowns('111', '222', guildId)

      expect(mockPrisma.user.updateMany).toHaveBeenNthCalledWith(1, {
        where: { discordId: '111', guildId },
        data: { lastPolymorphiaUse: expect.any(Date) },
      })

      expect(mockPrisma.user.updateMany).toHaveBeenNthCalledWith(2, {
        where: { discordId: '222', guildId },
        data: { polymorphiaProtectedUntil: expect.any(Date) },
      })
    })
  })
})

// ── stats ──────────────────────────────────────────
describe('database — stats', () => {
  const guildId = '987654321'

  describe('getLeaderboard()', () => {
    it('should throw for invalid category', async () => {
      await expect(stats.getLeaderboard(guildId, 'invalid')).rejects.toThrow(
        'Invalid leaderboard category'
      )
    })

    it('should return mapped results for valid categories', async () => {
      const mockUsers = [
        { discordId: '1', username: 'Alice', candies: 100 },
        { discordId: '2', username: 'Bob', candies: 50 },
      ]
      mockPrisma.user.findMany.mockResolvedValue(mockUsers)

      const result = await stats.getLeaderboard(guildId, 'candies', 10)
      expect(result).toEqual([
        { discordId: '1', username: 'Alice', value: 100 },
        { discordId: '2', username: 'Bob', value: 50 },
      ])
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { guildId, candies: { gt: 0 } },
        orderBy: { candies: 'desc' },
        take: 10,
        select: { discordId: true, username: true, candies: true },
      })
    })

    it('should handle empty results', async () => {
      mockPrisma.user.findMany.mockResolvedValue([])

      const result = await stats.getLeaderboard(guildId, 'polymorphiaWins', 5)
      expect(result).toEqual([])
    })
  })

  describe('getServerStats()', () => {
    it('should return aggregated stats object', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(10)
      mockPrisma.user.aggregate
        .mockResolvedValueOnce({ _sum: { candies: 500 } })
        .mockResolvedValueOnce({ _sum: { totalEarned: 1000 } })
        .mockResolvedValueOnce({ _sum: { totalSpent: 300 } })
        .mockResolvedValueOnce({ _sum: { polymorphiaWins: 30, polymorphiaLosses: 20 } })
        .mockResolvedValueOnce({ _sum: { polymorphiaWins: 30 } })
        .mockResolvedValueOnce({ _sum: { polymorphiaLosses: 20 } })
        .mockResolvedValueOnce({ _sum: { polymorphiaSaved: 15 } })
      mockPrisma.polymorphiaState.count.mockResolvedValueOnce(3)
      mockPrisma.transaction.count.mockResolvedValueOnce(200)

      const serverStats = await stats.getServerStats(guildId)
      expect(serverStats).toEqual({
        totalUsers: 10,
        totalCandiesInEconomy: 500,
        totalEarned: 1000,
        totalSpent: 300,
        totalDuels: 50,
        totalPolymorphiaWins: 30,
        totalPolymorphiaLosses: 20,
        totalPolymorphiaSaved: 15,
        activePolymorphiaCount: 3,
        totalTransactions: 200,
      })
    })
  })

  describe('getButterflyCaughtCount()', () => {
    it('should return count of transactions mentioning mariposa', async () => {
      mockPrisma.transaction.count.mockResolvedValueOnce(42)

      const result = await stats.getButterflyCaughtCount(guildId)
      expect(result).toBe(42)
      expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
        where: {
          description: { contains: 'mariposa' },
          user: { guildId },
        },
      })
    })
  })
})
