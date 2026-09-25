import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => {
  const mp: any = {
    user: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
    guildConfig: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  }
  globalThis.__MOCKED_PRISMA__ = mp
  return mp
})

const { processTextMessage, clearXpCooldowns } = require('../leveling/textXpService')
const { processVoiceTick } = require('../leveling/voiceXpService')
const guildConfigService = require('../guildConfig')

beforeEach(() => {
  clearXpCooldowns()
  vi.clearAllMocks()
  guildConfigService.invalidateCache('guild-1')
})

describe('textXpService', () => {
  it('should ignore bot messages', async () => {
    const message = {
      author: { bot: true, id: 'bot-1' },
      guild: { id: 'guild-1' },
      member: {},
    }

    await processTextMessage(message)
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled()
  })

  it('should ignore messages from excluded channels', async () => {
    mockPrisma.guildConfig.findUnique.mockResolvedValue({
      guildId: 'guild-1',
      xpEnabled: true,
      xpExcludedChannels: ['channel-excluded'],
    })

    const message = {
      author: { bot: false, id: 'user-1', username: 'TestUser', displayAvatarURL: () => 'avatar.png' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-excluded' },
      member: { roles: { cache: new Map() } },
    }

    await processTextMessage(message)
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled()
  })

  it('should grant XP on valid message and respect anti-spam cooldown', async () => {
    mockPrisma.guildConfig.findUnique.mockResolvedValue({
      guildId: 'guild-1',
      xpEnabled: true,
      xpPerMessageMin: 20,
      xpPerMessageMax: 20,
      xpCooldownSec: 60,
      xpExcludedChannels: [],
      xpRoleMultipliers: [],
    })

    mockPrisma.user.upsert.mockResolvedValue({
      id: 'db-user-1',
      discordId: 'user-1',
      guildId: 'guild-1',
      xp: 0,
      level: 0,
    })

    mockPrisma.user.update.mockResolvedValue({})

    const message = {
      author: { bot: false, id: 'user-1', username: 'TestUser', displayAvatarURL: () => 'avatar.png' },
      guild: { id: 'guild-1' },
      channel: { id: 'channel-1', send: vi.fn() },
      member: { roles: { cache: new Map() } },
    }

    // First message: grants XP
    await processTextMessage(message)
    expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)

    // Second message immediately: blocked by anti-spam cooldown
    await processTextMessage(message)
    expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1)
  })

  it('should send level up notification when XP crosses level threshold', async () => {
    mockPrisma.guildConfig.findUnique.mockResolvedValue({
      guildId: 'guild-1',
      xpEnabled: true,
      xpPerMessageMin: 150,
      xpPerMessageMax: 150,
      xpCooldownSec: 0,
      xpExcludedChannels: [],
      xpLevelUpChannelId: null, // default: current channel
    })

    // User starts with 0 XP, Level 0. Adding 150 XP reaches Level 1 (threshold is 100 XP)
    mockPrisma.user.upsert.mockResolvedValue({
      id: 'db-user-1',
      discordId: 'user-1',
      guildId: 'guild-1',
      xp: 0,
      level: 0,
    })

    mockPrisma.user.update.mockResolvedValue({})

    const sendMock = vi.fn().mockResolvedValue({})
    const message = {
      author: { bot: false, id: 'user-1', username: 'TestUser', displayAvatarURL: () => 'avatar.png' },
      guild: { id: 'guild-1', channels: { cache: new Map() } },
      channel: { id: 'channel-1', isTextBased: () => true, send: sendMock },
      member: { roles: { cache: new Map() } },
    }

    await processTextMessage(message)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0].embeds[0].data.title).toContain('Level UP')
  })
})

describe('voiceXpService', () => {
  it('should not award XP if member is deafened (self or server deaf)', async () => {
    mockPrisma.guildConfig.findUnique.mockResolvedValue({
      guildId: 'guild-1',
      voiceXpEnabled: true,
      voiceXpMinMembers: 2,
    })

    const memberDeaf = {
      id: 'user-deaf',
      user: { bot: false, username: 'DeafUser', displayAvatarURL: () => '' },
      voice: { deaf: true, selfDeaf: false },
      roles: new Map(),
    }
    const memberNormal = {
      id: 'user-normal',
      user: { bot: false, username: 'NormalUser', displayAvatarURL: () => '' },
      voice: { deaf: false, selfDeaf: false },
      roles: new Map(),
    }

    const membersMap = new Map([
      ['user-deaf', memberDeaf],
      ['user-normal', memberNormal],
    ])

    const channel = {
      id: 'voice-1',
      isVoiceBased: () => true,
      members: membersMap,
    }

    const client = {
      guilds: {
        cache: new Map([
          [
            'guild-1',
            {
              id: 'guild-1',
              channels: {
                cache: new Map([['voice-1', channel]]),
              },
            },
          ],
        ]),
      },
    }

    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-u-1', xp: 0, level: 0 })
    mockPrisma.user.update.mockResolvedValue({})

    await processVoiceTick(client as any)

    // Only normal user should receive XP, deaf user must be skipped
    expect(mockPrisma.user.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          discordId_guildId: { discordId: 'user-normal', guildId: 'guild-1' },
        },
      })
    )
  })

  it('should not award XP if active members count is below voiceXpMinMembers', async () => {
    mockPrisma.guildConfig.findUnique.mockResolvedValue({
      guildId: 'guild-1',
      voiceXpEnabled: true,
      voiceXpMinMembers: 2,
    })

    // Only 1 member in the room
    const memberSolo = {
      id: 'user-solo',
      user: { bot: false, username: 'SoloUser', displayAvatarURL: () => '' },
      voice: { deaf: false, selfDeaf: false },
      roles: new Map(),
    }

    const channel = {
      id: 'voice-1',
      isVoiceBased: () => true,
      members: new Map([['user-solo', memberSolo]]),
    }

    const client = {
      guilds: {
        cache: new Map([
          [
            'guild-1',
            {
              id: 'guild-1',
              channels: { cache: new Map([['voice-1', channel]]) },
            },
          ],
        ]),
      },
    }

    await processVoiceTick(client as any)
    expect(mockPrisma.user.upsert).not.toHaveBeenCalled()
  })
})
