const { SlashCommandBuilder } = require('discord.js')
const eventManager = require('#services/EventManager')
const adminService = require('#services/admin')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('Manage limited-time events (admin only)')
    .addSubcommand(sub => sub.setName('create').setDescription('Create an event').addStringOption(o => o.setName('type').setDescription('Event type, e.g. double_candies, double_butterflies, tournament').setRequired(true)).addIntegerOption(o => o.setName('duration').setDescription('Duration minutes').setRequired(true)).addNumberOption(o => o.setName('multiplier').setDescription('Optional multiplier for event (e.g. 1.5)')))
    .addSubcommand(sub => sub.setName('stop').setDescription('Stop an event').addStringOption(o => o.setName('id').setDescription('Event id').setRequired(true)))
    .addSubcommand(sub => sub.setName('list').setDescription('List active events in this guild')),

  async execute(interaction) {
    // auth
    const ok = await adminService.isAdmin(interaction)
    if (!ok) { await interaction.reply({ content: 'No autorizado', ephemeral: true }); return }

    const sub = interaction.options.getSubcommand()
    if (sub === 'create') {
      const type = interaction.options.getString('type')
      const duration = interaction.options.getInteger('duration')
      const multiplier = interaction.options.getNumber('multiplier')
      await interaction.deferReply({ ephemeral: true })
      const payload = multiplier ? { multiplier } : {}
      const ev = await eventManager.createEvent(interaction.guild.id, type, duration, payload)
      await interaction.editReply(`Event created: ${ev.id} type=${ev.type} endsAt=${ev.endsAt.toISOString()} multiplier=${payload.multiplier ?? 'n/a'}`)
      return
    }

    if (sub === 'stop') {
      const id = interaction.options.getString('id')
      await interaction.deferReply({ ephemeral: true })
      const ev = await eventManager.stopEvent(id)
      await interaction.editReply(`Event stopped: ${ev.id}`)
      return
    }

    if (sub === 'list') {
      await interaction.deferReply({ ephemeral: true })
      const events = await eventManager.getActiveEvents(interaction.guild.id)
      if (!events || events.length === 0) { await interaction.editReply('No active events'); return }
      const lines = events.map(e => `${e.id} • ${e.type} • ${e.startsAt.toISOString()} → ${e.endsAt.toISOString()}`)
      await interaction.editReply(lines.join('\n'))
      return
    }
  }
}
