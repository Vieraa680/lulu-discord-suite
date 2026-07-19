import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoist mocks before requiring the command module
const mockAdmin = vi.hoisted(() => {
  const m: any = { isAdmin: vi.fn() }
  return m
})

const mockEventManager = vi.hoisted(() => {
  const m: any = {
    getActiveEvents: vi.fn(),
    createEvent: vi.fn(),
    stopEvent: vi.fn(),
    stopEventsByType: vi.fn()
  }
  return m
})

const mockGuildConfig = vi.hoisted(() => {
  const m: any = { getGuildConfig: vi.fn() }
  return m
})

const mockPagination = vi.hoisted(() => ({ scheduleDisable: vi.fn(), resetDisable: vi.fn(), clearDisableById: vi.fn() }))

// Provide the mocks to the module resolution
vi.mock('#services/admin', () => mockAdmin)
vi.mock('#services/EventManager', () => mockEventManager)
vi.mock('#services/guildConfig', () => mockGuildConfig)
vi.mock('#services/eventPagination', () => mockPagination)

// Now require the command under test
const eventsCmd = require('../index.js')

beforeEach(() => {
  // reset mocks
  for (const m of [mockAdmin, mockEventManager, mockGuildConfig, mockPagination]) {
    for (const fn of Object.keys(m)) {
      if (typeof m[fn] === 'function' && m[fn].mockClear) m[fn].mockClear()
    }
  }
})

function makeInteraction({ sub = 'list', userId = 'U1', guildId = 'G1', member = { roles: { cache: new Map() }, permissions: { has: () => true } } } = {}) {
  const calls: any[] = []
  const interaction: any = {
    options: { getSubcommand: () => sub, getString: (k:string) => { return (k === 'type') ? 'double_candies' : (k === 'id' ? 'eid' : undefined) }, getInteger: (k:string) => 60, getNumber: (k:string) => 2 },
    deferReply: vi.fn(async (opts:any) => { calls.push(['defer', opts]); }),
    editReply: vi.fn(async (payload:any) => { calls.push(['edit', payload]); return { id: 'm1' } }),
    fetchReply: vi.fn(async () => ({ id: 'm1' })),
    replied: false,
    deferred: false,
    user: { id: userId },
    guild: { id: guildId, channels: { cache: new Map(), fetch: async (id:string) => null } },
    member
  }
  return { interaction, calls }
}

describe('/events command', () => {
  it('create subcommand creates event and announces to log channel', async () => {
    mockAdmin.isAdmin.mockResolvedValue(true)
    // existing events count
    mockEventManager.getActiveEvents.mockResolvedValue([{ id: 'old1', type: 'double_candies' }])
    const created = { id: 'new123', type: 'double_candies', payload: { multiplier: 2 }, startsAt: new Date(), endsAt: new Date(Date.now() + 60000) }
    mockEventManager.createEvent.mockResolvedValue(created)
    mockGuildConfig.getGuildConfig.mockResolvedValue({ logChannelId: 'log1' })

    // mock channel send
    const ch = { send: vi.fn(async (p:any) => p) }
    const { interaction } = makeInteraction({ sub: 'create' })
    // ensure guild.channels.fetch returns channel
    interaction.guild.channels.fetch = async (id:string) => ch

    await eventsCmd.execute(interaction)

    expect(mockAdmin.isAdmin).toHaveBeenCalled()
    expect(mockEventManager.createEvent).toHaveBeenCalled()
    // editReply called to confirm creation
    expect(interaction.editReply).toHaveBeenCalled()
    // announce called on channel
    expect(ch.send).toHaveBeenCalled()
  })

  it('list subcommand returns embed with no components when single page', async () => {
    mockAdmin.isAdmin.mockResolvedValue(true)
    const ev = { id: 'ev1', type: 'double_candies', startsAt: new Date(Date.now()-60000), endsAt: new Date(Date.now()+60000), payload: { multiplier: 2 } }
    mockEventManager.getActiveEvents.mockResolvedValue([ev])

    const { interaction } = makeInteraction({ sub: 'list' })
    await eventsCmd.execute(interaction)

    expect(interaction.deferReply).toHaveBeenCalled()
    expect(interaction.editReply).toHaveBeenCalled()
    const payload = interaction.editReply.mock.calls[0][0]
    expect(payload).toHaveProperty('embeds')
    expect(payload.components).toEqual([])
  })

  it('list subcommand paginates and schedules disable when multiple pages', async () => {
    mockAdmin.isAdmin.mockResolvedValue(true)
    const now = Date.now()
    const events = []
    for (let i=0;i<4;i++) events.push({ id: 'e'+i, type: 'tournament', startsAt: new Date(now-1000), endsAt: new Date(now+1000000), payload: {} })
    mockEventManager.getActiveEvents.mockResolvedValue(events)

    const { interaction } = makeInteraction({ sub: 'list' })
    await eventsCmd.execute(interaction)

    expect(interaction.deferReply).toHaveBeenCalled()
    expect(interaction.editReply).toHaveBeenCalled()
    // scheduleDisable should have been called
    expect(mockPagination.scheduleDisable).toHaveBeenCalled()
  })

  it('stop subcommand stops event and announces', async () => {
    mockAdmin.isAdmin.mockResolvedValue(true)
    const stopped = { id: 'x', type: 'boss' }
    mockEventManager.stopEvent.mockResolvedValue(stopped)
    mockGuildConfig.getGuildConfig.mockResolvedValue({ logChannelId: 'log1' })

    const ch = { send: vi.fn(async (p:any) => p) }
    const { interaction } = makeInteraction({ sub: 'stop' })
    interaction.guild.channels.fetch = async (id:string) => ch

    await eventsCmd.execute(interaction)

    expect(mockEventManager.stopEvent).toHaveBeenCalled()
    expect(interaction.editReply).toHaveBeenCalled()
    expect(ch.send).toHaveBeenCalled()
  })

  it('stop-type stops events and announces', async () => {
    mockAdmin.isAdmin.mockResolvedValue(true)
    mockEventManager.stopEventsByType.mockResolvedValue(3)
    mockGuildConfig.getGuildConfig.mockResolvedValue({ logChannelId: 'log1' })

    const ch = { send: vi.fn(async (p:any) => p) }
    const { interaction } = makeInteraction({ sub: 'stop-type' })
    interaction.guild.channels.fetch = async (id:string) => ch

    await eventsCmd.execute(interaction)

    expect(mockEventManager.stopEventsByType).toHaveBeenCalled()
    expect(interaction.editReply).toHaveBeenCalled()
    expect(ch.send).toHaveBeenCalled()
  })
})
