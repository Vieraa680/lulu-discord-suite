const { describe, it, expect, vi } = require('vitest')

const banCommand = require('../commands/admin/ban')

function makeInteraction({ moderator = { id: 'mod1', tag: 'Mod#0001' }, target = { id: 't1', tag: 'Target#0001' }, reason = 'because', guildOverrides = {} } = {}) {
  const replies = []

  const ch = {
    isTextBased: true,
    send: vi.fn(async (payload) => { replies.push(['channelSend', payload]); return {} })
  }

  const guild = {
    id: guildOverrides.id || 'g1',
    members: { ban: vi.fn(async () => true) },
    channels: { fetch: vi.fn(async () => ch) }
  }

  const interaction = {
    user: moderator,
    options: {
      getUser: () => target,
      getString: () => reason,
    },
    guild,
    replied: false,
    deferred: false,
    deferReply: async () => { interaction.deferred = true },
    editReply: async (p) => { replies.push(['editReply', p]); },
    reply: async (p) => { replies.push(['reply', p]); },
  }

  return { interaction, replies, ch }
}

describe('admin-ban command', () => {
  it('bans a user and logs to channel when configured', async () => {
    const { interaction, replies, ch } = makeInteraction()

    // mock getGuildConfig from bot-utils to return a logChannelId
    const botUtils = require('@lulu-discord/bot-utils')
    const originalGuildConfig = botUtils.guildConfig
    botUtils.guildConfig = { getGuildConfig: async () => ({ logChannelId: '123' }) }

    await banCommand.execute(interaction)

    expect(interaction.guild.members.ban).toHaveBeenCalledWith('t1', expect.any(Object))
    expect(ch.send).toHaveBeenCalled()
    expect(replies.some(r => r[0] === 'editReply')).toBe(true)

    // restore
    botUtils.guildConfig = originalGuildConfig
  })
})
