import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist a mocked prisma before requiring modules so prisma.js picks it up
const mockPrisma = vi.hoisted(() => {
  const mp: any = {
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    }
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

// Load module under test after mock is installed
const eventManager = require('../EventManager')

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

describe('EventManager', () => {
  it('getActiveEvents filters only currently active events', async () => {
    const now = Date.now()
    const past = new Date(now - 1000 * 60 * 60)
    const future = new Date(now + 1000 * 60 * 60)
    const future2 = new Date(now + 1000 * 60 * 60 * 2)

    mockPrisma.event.findMany.mockResolvedValue([
      { id: 'a', guildId: 'G1', type: 'double_candies', startsAt: past, endsAt: future2, isActive: true, payload: {} },
      { id: 'b', guildId: 'G1', type: 'boss', startsAt: future, endsAt: future2, isActive: true, payload: {} }, // not started yet
      { id: 'c', guildId: 'G1', type: 'tournament', startsAt: past, endsAt: new Date(now - 1000), isActive: true, payload: {} } // already ended
    ])

    const active = await eventManager.getActiveEvents('G1')
    expect(Array.isArray(active)).toBe(true)
    // should only include the one that started and hasn't ended
    expect(active.map(e => e.id)).toEqual(['a'])
    expect(mockPrisma.event.findMany).toHaveBeenCalled()
  })

  it('createEvent adds default multiplier for double types and refreshes cache', async () => {
    const created = { id: 'new1', guildId: 'G1', type: 'double_candies', payload: { multiplier: 2 }, startsAt: new Date(), endsAt: new Date(Date.now() + 1000 * 60 * 60), isActive: true }
    mockPrisma.event.create.mockResolvedValue(created)
    // ensure refresh after create will call findMany
    mockPrisma.event.findMany.mockResolvedValue([created])

    const ev = await eventManager.createEvent('G1', 'double_candies', 60, {})
    expect(ev).toHaveProperty('id', 'new1')
    // multiplier should be set by createEvent logic
    expect(ev.payload).toHaveProperty('multiplier', 2)
    expect(mockPrisma.event.create).toHaveBeenCalled()
    expect(mockPrisma.event.findMany).toHaveBeenCalled()
  })

  it('stopEvent updates event and refreshes cache', async () => {
    const updated = { id: 'x1', guildId: 'G1', type: 'boss', isActive: false }
    mockPrisma.event.update.mockResolvedValue(updated)
    mockPrisma.event.findMany.mockResolvedValue([updated])

    const res = await eventManager.stopEvent('x1')
    expect(res).toHaveProperty('id', 'x1')
    expect(res.isActive).toBe(false)
    expect(mockPrisma.event.update).toHaveBeenCalledWith({ where: { id: 'x1' }, data: { isActive: false } })
    expect(mockPrisma.event.findMany).toHaveBeenCalled()
  })

  it('stopEventsByType updates many and returns count', async () => {
    mockPrisma.event.updateMany.mockResolvedValue({ count: 2 })
    mockPrisma.event.findMany.mockResolvedValue([])

    const count = await eventManager.stopEventsByType('G1', 'double_butterflies')
    expect(count).toBe(2)
    expect(mockPrisma.event.updateMany).toHaveBeenCalled()
  })
})
