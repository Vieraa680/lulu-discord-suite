import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => {
  const mp: any = {
    activityRoleRule: {
      findMany: vi.fn(),
    },
    user: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    userChannelActivity: {
      upsert: vi.fn(),
      aggregate: vi.fn(),
    },
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

const activityRoles = require('../activityRoles')

beforeEach(() => {
  activityRoles.clearRulesCache()
  vi.clearAllMocks()
})

describe('activityRoles.processActivityMessage', () => {
  it('should ignore bot messages', async () => {
    const message = {
      author: { bot: true, id: 'bot-1' },
      guild: { id: 'guild-1' },
      member: {},
    }

    await activityRoles.processActivityMessage(message)
    expect(mockPrisma.activityRoleRule.findMany).not.toHaveBeenCalled()
  })

  it('should ignore messages without guild or member', async () => {
    await activityRoles.processActivityMessage({ author: { bot: false } })
    expect(mockPrisma.activityRoleRule.findMany).not.toHaveBeenCalled()
  })

  it('should do nothing if no rules are configured for the guild', async () => {
    mockPrisma.activityRoleRule.findMany.mockResolvedValue([])

    const message = {
      author: { bot: false, id: 'user-1', username: 'Tester' },
      guild: { id: 'guild-1', name: 'Test Guild' },
      channel: { id: 'channel-1', name: 'general' },
      member: {
        roles: { cache: new Map() },
      },
    }

    await activityRoles.processActivityMessage(message)
    expect(mockPrisma.activityRoleRule.findMany).toHaveBeenCalledWith({
      where: { guildId: 'guild-1', isEnabled: true },
    })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('should do nothing if member already has all matching roles', async () => {
    const rolesMap = new Map([['role-veteran', { id: 'role-veteran' }]])

    mockPrisma.activityRoleRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        guildId: 'guild-1',
        roleId: 'role-veteran',
        roleName: 'Veterano',
        channelId: null,
        messagesReq: 10,
        cooldownSec: 60,
        isEnabled: true,
      },
    ])

    const message = {
      author: { bot: false, id: 'user-1', username: 'Tester' },
      guild: { id: 'guild-1', name: 'Test Guild' },
      channel: { id: 'channel-1', name: 'general' },
      member: {
        roles: { cache: rolesMap },
      },
    }

    await activityRoles.processActivityMessage(message)
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('should increment message counts and award role when threshold is met', async () => {
    const rolesCache = new Map()
    const mockRole = { id: 'role-123', name: 'Activo', color: 0x9900ee, position: 2 }
    const addRoleMock = vi.fn().mockResolvedValue(undefined)
    const channelSendMock = vi.fn().mockResolvedValue({})

    mockPrisma.activityRoleRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        guildId: 'guild-1',
        roleId: 'role-123',
        roleName: 'Activo',
        channelId: null,
        messagesReq: 5,
        cooldownSec: 5,
        isEnabled: true,
      },
    ])

    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-user-1' })
    mockPrisma.user.update.mockResolvedValue({ messageCount: 5 })
    mockPrisma.userChannelActivity.upsert.mockResolvedValue({ messageCount: 5 })

    const message = {
      author: { bot: false, id: 'user-1', username: 'Tester' },
      guild: {
        id: 'guild-1',
        name: 'Test Guild',
        members: {
          me: {
            permissions: { has: vi.fn().mockReturnValue(true) },
            roles: { highest: { position: 10 } },
          },
        },
        roles: {
          cache: new Map([['role-123', mockRole]]),
          fetch: vi.fn().mockResolvedValue(mockRole),
        },
      },
      channel: { id: 'channel-1', name: 'general', send: channelSendMock },
      member: {
        roles: {
          cache: rolesCache,
          add: addRoleMock,
        },
      },
    }

    await activityRoles.processActivityMessage(message)

    expect(mockPrisma.user.update).toHaveBeenCalled()
    expect(addRoleMock).toHaveBeenCalledWith('role-123', 'Activity role threshold reached')
    expect(channelSendMock).toHaveBeenCalled()
  })

  it('should enforce anti-spam cooldown and skip rapid consecutive messages', async () => {
    mockPrisma.activityRoleRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        guildId: 'guild-1',
        roleId: 'role-123',
        roleName: 'Activo',
        channelId: null,
        messagesReq: 10,
        cooldownSec: 60,
        isEnabled: true,
      },
    ])

    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-user-1' })
    mockPrisma.user.update.mockResolvedValue({ messageCount: 1 })
    mockPrisma.userChannelActivity.upsert.mockResolvedValue({ messageCount: 1 })

    const message = {
      author: { bot: false, id: 'user-spammer', username: 'Spammer' },
      guild: {
        id: 'guild-1',
        name: 'Test Guild',
        members: {
          me: {
            permissions: { has: vi.fn().mockReturnValue(true) },
            roles: { highest: { position: 10 } },
          },
        },
        roles: {
          cache: new Map(),
          fetch: vi.fn(),
        },
      },
      channel: { id: 'channel-1', name: 'general', send: vi.fn() },
      member: {
        roles: {
          cache: new Map(),
          add: vi.fn(),
        },
      },
    }

    // First message - should process
    await activityRoles.processActivityMessage(message)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)

    // Immediate second message (within 60s cooldown) - should be skipped!
    await activityRoles.processActivityMessage(message)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
  })

  it('should match and aggregate messages across multiple specified channels', async () => {
    const rolesCache = new Map()
    const mockRole = { id: 'role-multi', name: 'Chatter', color: 0x00ff00, position: 2 }
    const addRoleMock = vi.fn().mockResolvedValue(undefined)

    mockPrisma.activityRoleRule.findMany.mockResolvedValue([
      {
        id: 'rule-multi',
        guildId: 'guild-1',
        roleId: 'role-multi',
        roleName: 'Chatter',
        channelId: null,
        channelIds: ['channel-1', 'channel-2'],
        messagesReq: 10,
        cooldownSec: 5,
        isEnabled: true,
      },
    ])

    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-user-1' })
    mockPrisma.user.update.mockResolvedValue({ messageCount: 15 })
    mockPrisma.userChannelActivity.upsert.mockResolvedValue({ messageCount: 6 })
    // Aggregation of messages in channel-1 and channel-2 totals 10
    mockPrisma.userChannelActivity.aggregate.mockResolvedValue({
      _sum: { messageCount: 10 },
    })

    const message = {
      author: { bot: false, id: 'user-multi', username: 'MultiChatter' },
      guild: {
        id: 'guild-1',
        name: 'Test Guild',
        members: {
          me: {
            permissions: { has: vi.fn().mockReturnValue(true) },
            roles: { highest: { position: 10 } },
          },
        },
        roles: {
          cache: new Map([['role-multi', mockRole]]),
          fetch: vi.fn().mockResolvedValue(mockRole),
        },
      },
      channel: { id: 'channel-2', name: 'memes', send: vi.fn().mockResolvedValue({}) },
      member: {
        roles: {
          cache: rolesCache,
          add: addRoleMock,
        },
      },
    }

    await activityRoles.processActivityMessage(message)

    expect(mockPrisma.userChannelActivity.aggregate).toHaveBeenCalledWith({
      where: {
        userId: 'db-user-1',
        channelId: { in: ['channel-1', 'channel-2'] },
      },
      _sum: { messageCount: true },
    })
    expect(addRoleMock).toHaveBeenCalledWith('role-multi', 'Activity role threshold reached')
  })
})

