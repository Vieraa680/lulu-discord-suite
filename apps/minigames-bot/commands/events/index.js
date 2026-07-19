const { SlashCommandBuilder } = require('discord.js')
const eventManager = require('#services/EventManager')
const adminService = require('#services/admin')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('Manage limited-time events (admin only)')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create an event (select from available types)')
        .addStringOption(o =>
          o
            .setName('type')
            .setDescription('Event type to create')
            .setRequired(true)
            .addChoices(
              { name: 'Doble Gominolas (recompensas de duelo)', value: 'double_candies' },
              { name: 'Doble Mariposas (recompensas de mariposa)', value: 'double_butterflies' },
              { name: 'Torneo (competición programada)', value: 'tournament' },
              { name: 'Jefe (boss especial)', value: 'boss' }
            )
        )
        .addIntegerOption(o => o.setName('duration').setDescription('Duration minutes').setRequired(true))
        .addNumberOption(o => o.setName('multiplier').setDescription('Optional multiplier for event (e.g. 1.5)'))
    )
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
      const ends = new Date(ev.endsAt).toLocaleString()
      const niceType = {
        double_candies: 'Doble Gominolas',
        double_butterflies: 'Doble Mariposas',
        tournament: 'Torneo',
        boss: 'Jefe'
      }[ev.type] ?? ev.type

      const multiplierText = ev.payload?.multiplier ? `${ev.payload.multiplier}×` : 'N/A'
      const message = `✅ Evento creado: **${niceType}**\n• Duración: **${duration} minutos**\n• Multiplicador: **${multiplierText}**\n• Termina: ${ends}`
      await interaction.editReply({ content: message })

      // Announce in configured guild log channel if present
      try {
        const { getGuildConfig } = require('#services/guildConfig')
        const cfg = await getGuildConfig(interaction.guild.id)
        if (cfg && cfg.logChannelId) {
          try {
            const ch = interaction.guild.channels.cache.get(cfg.logChannelId) || await interaction.guild.channels.fetch(cfg.logChannelId)
            if (ch && typeof ch.send === 'function') {
              await ch.send({ content: `📣 **Nuevo evento activado:** **${niceType}** — termina ${ends} — multiplicador: ${multiplierText}` })
            }
          } catch (err) {
            const logger = require('#utils/logger').child({ service: 'events' })
            logger.warn({ err }, 'No se pudo anunciar el evento en logChannelId')
          }
        }
      } catch (err) {
        // ignore errors announcing
      }
      return
    }

    if (sub === 'stop') {
      const id = interaction.options.getString('id')
      await interaction.deferReply({ ephemeral: true })
      const ev = await eventManager.stopEvent(id)
      await interaction.editReply(`✅ Evento detenido: **${ev.id}** — tipo: **${ev.type}**`)

      // Announce stop in log channel
      try {
        const { getGuildConfig } = require('#services/guildConfig')
        const cfg = await getGuildConfig(interaction.guild.id)
        if (cfg && cfg.logChannelId) {
          try {
            const ch = interaction.guild.channels.cache.get(cfg.logChannelId) || await interaction.guild.channels.fetch(cfg.logChannelId)
            if (ch && typeof ch.send === 'function') {
              await ch.send({ content: `🛑 Evento detenido: **${ev.type}** (id: ${ev.id})` })
            }
          } catch (err) {
            const logger = require('#utils/logger').child({ service: 'events' })
            logger.warn({ err }, 'No se pudo anunciar la detención del evento en logChannelId')
          }
        }
      } catch (err) {
        // ignore
      }
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
