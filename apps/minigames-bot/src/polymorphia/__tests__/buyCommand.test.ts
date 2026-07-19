import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock purchaseItem and database helpers
const mockDb = vi.hoisted(() => {
  const m: any = {
    purchaseItem: vi.fn(),
    prisma: {
      item: { findUnique: vi.fn() }
    },
    getOrCreateUser: vi.fn()
  }
  // Install as module mock target
  vi.doMock('#services/database', () => m)
  vi.doMock('#services/database/polymorphia', () => ({ createPolymorphiaState: vi.fn() }))
  return m
})

// Minimal interaction mock
function makeInteraction({ itemName = 'Forma Yuumi', nickname = 'Old' } = {}) {
  const user = { id: 'uid', username: 'bob' }
  const member = {
    nickname: nickname,
    displayName: nickname,
    user: { username: 'bob' },
    roles: { highest: { comparePositionTo: () => 1 } },
    setNickname: vi.fn()
  }
  const guild = {
    id: 'gid',
    members: {
      fetch: vi.fn().mockResolvedValue(member),
      me: { permissions: { has: () => true }, roles: { highest: { comparePositionTo: () => 1 } } }
    }
  }

  const interaction = {
    user,
    guild,
    options: { getString: () => itemName },
    deferReply: vi.fn().mockResolvedValue(null),
    editReply: vi.fn().mockResolvedValue(null),
    followUp: vi.fn().mockResolvedValue(null),
    reply: vi.fn().mockResolvedValue(null)
  }
  return { interaction, member }
}

describe('polymorphia buy command', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('applies form after successful purchase', async () => {
    const { interaction, member } = makeInteraction()
    const db = require('#services/database')
    db.purchaseItem.mockResolvedValue({ success: true, item: { name: 'Forma Yuumi', category: 'form', rarity: 'common' } })
    db.getOrCreateUser.mockResolvedValue({ id: 'u1' })
    const pol = require('#services/database/polymorphia')
    pol.createPolymorphiaState.mockResolvedValue({})

    const cmd = require('../../../commands/polymorphia/index.js')
    await cmd.__testHandleBuy(interaction)

    expect(db.purchaseItem).toHaveBeenCalled()
    expect(pol.createPolymorphiaState).toHaveBeenCalled()
    expect(member.setNickname).toHaveBeenCalled()
  })
})
