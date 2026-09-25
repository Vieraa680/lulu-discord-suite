import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PermissionFlagsBits } from 'discord.js'

const mockPrisma = vi.hoisted(() => {
  const mp: any = {
    season: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    seasonWinner: {
      upsert: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    levelRoleReward: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    guildConfig: {
      findUnique: vi.fn(),
    },
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

const { rotateSeason } = require('../seasons/seasonRotationService')
const { checkExpiredSeasons } = require('../seasons/seasonScheduler')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('seasonRotationService', () => {
  it('should return error if no active season found', async () => {
    mockPrisma.season.findFirst.mockResolvedValue(null)
    const client = { guilds: { cache: new Map(), fetch: vi.fn() } }

    const res = await rotateSeason(client as any, 'guild-1')
    expect(res.success).toBe(false)
    expect(res.message).toContain('No hay temporada activa')
  })

  it('should rotate season, record winners, delete temporary roles, and reset XP', async () => {
    const mockSeason = {
      id: 'season-1',
      guildId: 'guild-1',
      name: 'Temporada Septiembre',
      rewards: [
        { id: 'rew-1', tier: 1, levelReq: 5, roleId: 'role-temp-1', isTrophy: false },
        { id: 'rew-5', tier: 5, levelReq: 30, roleId: 'role-trophy-5', roleName: 'Maestro de Septiembre', isTrophy: true },
      ],
    }
    mockPrisma.season.findFirst.mockResolvedValue(mockSeason)

    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u-1', discordId: 'user-1', username: 'LuluFan', level: 32, xp: 5000, avatarUrl: null },
    ])
    mockPrisma.seasonWinner.upsert.mockResolvedValue({})
    mockPrisma.season.update.mockResolvedValue({})
    mockPrisma.user.updateMany.mockResolvedValue({ count: 10 })
    mockPrisma.season.findFirst.mockResolvedValueOnce(mockSeason).mockResolvedValueOnce(null)
    mockPrisma.levelRoleReward.deleteMany.mockResolvedValue({})
    mockPrisma.guildConfig.findUnique.mockResolvedValue({ xpLevelUpChannelId: 'channel-logros' })

    const tempRoleDeleteMock = vi.fn().mockResolvedValue({})
    const mockGuild = {
      id: 'guild-1',
      members: {
        me: {
          permissions: { has: vi.fn().mockReturnValue(true) },
          roles: { highest: { position: 100 } },
        },
      },
      roles: {
        cache: new Map([
          ['role-temp-1', { id: 'role-temp-1', name: 'Iniciado', position: 10, delete: tempRoleDeleteMock }],
          ['role-trophy-5', { id: 'role-trophy-5', name: 'Maestro', position: 20 }],
        ]),
        fetch: vi.fn(),
      },
      channels: {
        cache: new Map([
          ['channel-logros', { isTextBased: () => true, send: vi.fn().mockResolvedValue({}) }],
        ]),
        fetch: vi.fn(),
      },
      systemChannel: null,
    }

    const client = {
      guilds: {
        cache: new Map([['guild-1', mockGuild]]),
        fetch: vi.fn().mockResolvedValue(mockGuild),
      },
    }

    const res = await rotateSeason(client as any, 'guild-1')

    expect(res.success).toBe(true)
    expect(res.winnersCount).toBe(1)
    expect(res.deletedRolesCount).toBe(1)
    expect(tempRoleDeleteMock).toHaveBeenCalled()
    expect(mockPrisma.seasonWinner.upsert).toHaveBeenCalled()
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { guildId: 'guild-1' },
      data: { xp: 0, level: 0 },
    })
    expect(mockPrisma.season.update).toHaveBeenCalledWith({
      where: { id: 'season-1' },
      data: { status: 'COMPLETED' },
    })
  })
})

describe('seasonScheduler', () => {
  it('should find expired seasons and call rotateSeason', async () => {
    const expiredSeason = {
      id: 'season-old',
      guildId: 'guild-1',
      name: 'Temporada Vencida',
      status: 'ACTIVE',
      endDate: new Date(Date.now() - 1000),
      rewards: [],
    }
    mockPrisma.season.findMany.mockResolvedValue([expiredSeason])
    mockPrisma.season.findUnique.mockResolvedValue(expiredSeason)
    mockPrisma.season.update.mockResolvedValue({})
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.user.updateMany.mockResolvedValue({})
    mockPrisma.levelRoleReward.deleteMany.mockResolvedValue({})
    mockPrisma.guildConfig.findUnique.mockResolvedValue(null)

    const client = {
      guilds: {
        cache: new Map([['guild-1', { id: 'guild-1', members: { me: { permissions: { has: () => false } } }, roles: { cache: new Map() } }]]),
        fetch: vi.fn(),
      },
    }

    await checkExpiredSeasons(client as any)

    expect(mockPrisma.season.findMany).toHaveBeenCalled()
    expect(mockPrisma.season.update).toHaveBeenCalledWith({
      where: { id: 'season-old' },
      data: { status: 'COMPLETED' },
    })
  })
})
