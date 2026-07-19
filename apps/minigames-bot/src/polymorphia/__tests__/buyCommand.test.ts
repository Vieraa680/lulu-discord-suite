import { describe, it, expect, vi, beforeEach } from 'vitest'

// We'll override functions on the real module at runtime

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
    db.purchaseItem = vi.fn().mockResolvedValue({ success: true, item: { name: 'Forma Yuumi', category: 'form', rarity: 'common' } })
    db.getOrCreateUser = vi.fn().mockResolvedValue({ id: 'u1' })
    // mock polymorphia helper
    const pol = require('#services/database/polymorphia')
    pol.createPolymorphiaState = vi.fn().mockResolvedValue({})

    const cmd = require('../../../commands/polymorphia/index.js')
    await cmd.__testHandleBuy(interaction)

    expect(db.purchaseItem).toHaveBeenCalled()
    expect(pol.createPolymorphiaState).toHaveBeenCalled()
    expect(member.setNickname).toHaveBeenCalled()
  })
})
