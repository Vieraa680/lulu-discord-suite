import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist a mocked prisma before requiring modules so prisma.js picks it up
const mockPrisma = vi.hoisted(() => {
  const mp: any = {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    transaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

// Load module under test after mock is installed
const daily = require('../dailyRewards')

beforeEach(() => {
  // Clear mocks
  for (const svc of Object.values(mockPrisma)) {
    if (typeof svc === 'function') {
      svc.mockClear()
    } else if (typeof svc === 'object' && svc !== null) {
      for (const fn of Object.values(svc)) {
        if (typeof fn === 'function' && fn.mockClear) fn.mockClear()
      }
    }
  }
})

describe('dailyRewards.claimDaily', () => {
  it('should award the day-1 reward for a first-time claimer', async () => {
    // getOrCreateUser -> prisma.user.upsert
    mockPrisma.user.upsert.mockResolvedValue({ id: 'user1', candies: 0, lastDailyClaim: null, dailyStreak: 0 })

    // $transaction resolves with [updatedUser, transaction]
    mockPrisma.$transaction.mockResolvedValue([{ id: 'user1', candies: 10, dailyStreak: 1 }, {}])

    const res = await daily.claimDaily('discord1', 'guild1', 'Bob')
    expect(res.amount).toBe(10)
    expect(res.streak).toBe(1)
    expect(res.user).toHaveProperty('id', 'user1')
    expect(mockPrisma.user.upsert).toHaveBeenCalled()
    expect(mockPrisma.$transaction).toHaveBeenCalled()
  })

  it('should reject if user already claimed within 24h', async () => {
    const recent = new Date().toISOString()
    mockPrisma.user.upsert.mockResolvedValue({ id: 'user2', candies: 50, lastDailyClaim: recent, dailyStreak: 2 })

    await expect(daily.claimDaily('discord2', 'guild1', 'Alice')).rejects.toMatchObject({ code: 'ALREADY_CLAIMED' })
  })

  it('should increment streak when last claim was within 48h', async () => {
    const past = new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() // 26 hours ago
    mockPrisma.user.upsert.mockResolvedValue({ id: 'user3', candies: 20, lastDailyClaim: past, dailyStreak: 2 })

    mockPrisma.$transaction.mockResolvedValue([{ id: 'user3', candies: 34, dailyStreak: 3 }, {}])

    const res = await daily.claimDaily('discord3', 'guild1', 'Carol')
    expect(res.streak).toBe(3)
    // rewardsByDay[2] === 14
    expect(res.amount).toBe(14)
  })
})
