import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PermissionFlagsBits } from 'discord.js'

const mockPrisma = vi.hoisted(() => {
  const mp: any = {
    levelRoleReward: {
      findMany: vi.fn(),
    },
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

const {
  fetchLevelRoleRewards,
  invalidateLevelRoleRewardsCache,
  applyLevelRoleRewards,
} = require('../leveling/levelRoleService')

beforeEach(() => {
  invalidateLevelRoleRewardsCache()
  vi.clearAllMocks()
})

describe('levelRoleService', () => {
  it('should fetch and cache active rewards for a guild', async () => {
    mockPrisma.levelRoleReward.findMany.mockResolvedValue([
      { id: 'rew-1', guildId: 'guild-1', levelReq: 5, roleId: 'role-5', isEnabled: true },
    ])

    const rewards1 = await fetchLevelRoleRewards('guild-1')
    expect(rewards1).toHaveLength(1)
    expect(mockPrisma.levelRoleReward.findMany).toHaveBeenCalledTimes(1)

    // Second call should hit the cache
    const rewards2 = await fetchLevelRoleRewards('guild-1')
    expect(rewards2).toHaveLength(1)
    expect(mockPrisma.levelRoleReward.findMany).toHaveBeenCalledTimes(1)
  })

  it('should return null if bot lacks ManageRoles permission', async () => {
    const member = { id: 'user-1', roles: { cache: new Map() } }
    const guild = {
      id: 'guild-1',
      members: {
        me: {
          permissions: { has: vi.fn().mockReturnValue(false) },
        },
      },
    }

    const result = await applyLevelRoleRewards(member, 10, guild)
    expect(result).toBeNull()
  })

  it('should award new level role and remove lower tier role when removePrevious is true', async () => {
    mockPrisma.levelRoleReward.findMany.mockResolvedValue([
      { id: 'rew-5', guildId: 'guild-1', levelReq: 5, roleId: 'role-5', removePrevious: true, isEnabled: true },
      { id: 'rew-10', guildId: 'guild-1', levelReq: 10, roleId: 'role-10', removePrevious: true, isEnabled: true },
    ])

    const role5 = { id: 'role-5', name: 'Novato', position: 10, hexColor: '#aaaaaa' }
    const role10 = { id: 'role-10', name: 'Aventurero', position: 15, hexColor: '#bbbbbb' }

    const rolesMap = new Map([
      ['role-5', role5],
      ['role-10', role10],
    ])

    // Member already has role-5, now reaches level 10
    const memberRolesCache = new Map([['role-5', role5]])
    const addMock = vi.fn().mockResolvedValue({})
    const removeMock = vi.fn().mockResolvedValue({})

    const member = {
      id: 'user-1',
      roles: {
        cache: memberRolesCache,
        add: addMock,
        remove: removeMock,
      },
    }

    const guild = {
      id: 'guild-1',
      roles: {
        cache: rolesMap,
        fetch: vi.fn(id => Promise.resolve(rolesMap.get(id))),
      },
      members: {
        me: {
          permissions: { has: (perm: bigint) => perm === PermissionFlagsBits.ManageRoles },
          roles: {
            highest: { position: 50 },
          },
        },
      },
    }

    const result = await applyLevelRoleRewards(member, 10, guild)

    expect(result).not.toBeNull()
    expect(result.grantedRoles).toHaveLength(1)
    expect(result.grantedRoles[0].name).toBe('Aventurero')

    expect(result.removedRoles).toHaveLength(1)
    expect(result.removedRoles[0].name).toBe('Novato')

    expect(addMock).toHaveBeenCalledWith('role-10', expect.stringContaining('10'))
    expect(removeMock).toHaveBeenCalledWith('role-5', expect.stringContaining('10'))
  })

  it('should not remove lower tier role if removePrevious is false', async () => {
    mockPrisma.levelRoleReward.findMany.mockResolvedValue([
      { id: 'rew-5', guildId: 'guild-1', levelReq: 5, roleId: 'role-5', removePrevious: false, isEnabled: true },
      { id: 'rew-10', guildId: 'guild-1', levelReq: 10, roleId: 'role-10', removePrevious: false, isEnabled: true },
    ])

    const role5 = { id: 'role-5', name: 'Novato', position: 10, hexColor: '#aaaaaa' }
    const role10 = { id: 'role-10', name: 'Aventurero', position: 15, hexColor: '#bbbbbb' }

    const rolesMap = new Map([
      ['role-5', role5],
      ['role-10', role10],
    ])

    const memberRolesCache = new Map([['role-5', role5]])
    const addMock = vi.fn().mockResolvedValue({})
    const removeMock = vi.fn().mockResolvedValue({})

    const member = {
      id: 'user-1',
      roles: {
        cache: memberRolesCache,
        add: addMock,
        remove: removeMock,
      },
    }

    const guild = {
      id: 'guild-1',
      roles: {
        cache: rolesMap,
        fetch: vi.fn(id => Promise.resolve(rolesMap.get(id))),
      },
      members: {
        me: {
          permissions: { has: () => true },
          roles: { highest: { position: 50 } },
        },
      },
    }

    const result = await applyLevelRoleRewards(member, 10, guild)

    expect(result.grantedRoles).toHaveLength(1)
    expect(result.removedRoles).toHaveLength(0)
    expect(addMock).toHaveBeenCalledWith('role-10', expect.any(String))
    expect(removeMock).not.toHaveBeenCalled()
  })

  it('should skip role assignment if bot role position is lower than target role', async () => {
    mockPrisma.levelRoleReward.findMany.mockResolvedValue([
      { id: 'rew-10', guildId: 'guild-1', levelReq: 10, roleId: 'role-admin', removePrevious: true, isEnabled: true },
    ])

    const targetRole = { id: 'role-admin', name: 'Admin Role', position: 100 }
    const rolesMap = new Map([['role-admin', targetRole]])

    const addMock = vi.fn()
    const member = {
      id: 'user-1',
      roles: { cache: new Map(), add: addMock, remove: vi.fn() },
    }

    const guild = {
      id: 'guild-1',
      roles: {
        cache: rolesMap,
        fetch: vi.fn(id => Promise.resolve(rolesMap.get(id))),
      },
      members: {
        me: {
          permissions: { has: () => true },
          roles: { highest: { position: 50 } }, // Lower than 100!
        },
      },
    }

    const result = await applyLevelRoleRewards(member, 10, guild)
    expect(result.grantedRoles).toHaveLength(0)
    expect(addMock).not.toHaveBeenCalled()
  })
})
