const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')
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
    .addSubcommand(sub => sub.setName('stop-type').setDescription('Stop all events of a given type in this guild').addStringOption(o => o.setName('type').setDescription('Event type to stop').setRequired(true).addChoices(
      { name: 'Doble Gominolas', value: 'double_candies' },
      { name: 'Doble Mariposas', value: 'double_butterflies' },
      { name: 'Torneo', value: 'tournament' },
      { name: 'Jefe', value: 'boss' }
    )))
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
      // Count existing active events of same type for informational message
      const existing = (await eventManager.getActiveEvents(interaction.guild.id)).filter(e => e.type === type)
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
      // If there were existing events of the same type, show a friendly note
      const note = existing.length > 0 ? `\nNota: ya había **${existing.length}** evento(s) activos de este tipo; el nuevo coexistirá con ellos.` : ''
      await interaction.editReply({ content: message + note })

      // Announce in configured guild log channel if present (embed)
      try {
        const { getGuildConfig } = require('#services/guildConfig')
        const cfg = await getGuildConfig(interaction.guild.id)
        if (cfg && cfg.logChannelId) {
          try {
            const ch = interaction.guild.channels.cache.get(cfg.logChannelId) || await interaction.guild.channels.fetch(cfg.logChannelId)
            if (ch && typeof ch.send === 'function') {
              const { EmbedBuilder } = require('discord.js')
              const map = {
                double_candies: { emoji: '🍬', color: 0xE67E22 },
                double_butterflies: { emoji: '🦋', color: 0x9B59B6 },
                tournament: { emoji: '🏆', color: 0x2ECC71 },
                boss: { emoji: '👹', color: 0xE74C3C }
              }
              const meta = map[ev.type] || { emoji: '🎫', color: 0x95A5A6 }
              const emb = new EmbedBuilder()
                .setTitle('📣 Nuevo evento activado')
                .setDescription(`**${niceType}** ha sido activado en este servidor.`)
                .addFields(
                  { name: 'Tipo', value: `${meta.emoji} ${niceType}`, inline: true },
                  { name: 'Duración', value: `${duration} minutos`, inline: true },
                  { name: 'Multiplicador', value: `${multiplierText}`, inline: true },
                  { name: 'Termina', value: `${ends}`, inline: false },
                  { name: 'ID', value: ev.id, inline: false }
                )
                .setTimestamp()
                .setColor(meta.color)

              await ch.send({ embeds: [emb] })
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
      // Reply to admin
      await interaction.editReply({ content: undefined, embeds: [
        new (require('discord.js').EmbedBuilder)()
          .setTitle('🛑 Evento detenido')
          .setDescription(`Se detuvo el evento **${ev.type}**`)
          .addFields({ name: 'ID', value: ev.id, inline: false })
          .setTimestamp()
      ] })

      // Announce stop in log channel (embed)
      try {
        const { getGuildConfig } = require('#services/guildConfig')
        const cfg = await getGuildConfig(interaction.guild.id)
        if (cfg && cfg.logChannelId) {
          try {
            const ch = interaction.guild.channels.cache.get(cfg.logChannelId) || await interaction.guild.channels.fetch(cfg.logChannelId)
            if (ch && typeof ch.send === 'function') {
              const emb = new (require('discord.js').EmbedBuilder)()
                .setTitle('🛑 Evento detenido')
                .setDescription(`El evento **${ev.type}** ha sido detenido.`)
                .addFields({ name: 'ID', value: ev.id, inline: false })
                .setTimestamp()
              await ch.send({ embeds: [emb] })
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

    if (sub === 'stop-type') {
      const type = interaction.options.getString('type')
      await interaction.deferReply({ ephemeral: true })
      const count = await eventManager.stopEventsByType(interaction.guild.id, type)
      await interaction.editReply({ embeds: [new (require('discord.js').EmbedBuilder)().setTitle('🛑 Eventos detenidos').setDescription(`Se detuvieron **${count}** evento(s) del tipo **${type}** en este servidor.`).setTimestamp()] })

      // announce in log channel if present (embed)
      try {
        const { getGuildConfig } = require('#services/guildConfig')
        const cfg = await getGuildConfig(interaction.guild.id)
        if (cfg && cfg.logChannelId) {
          try {
            const ch = interaction.guild.channels.cache.get(cfg.logChannelId) || await interaction.guild.channels.fetch(cfg.logChannelId)
            if (ch && typeof ch.send === 'function') {
              const emb = new (require('discord.js').EmbedBuilder)()
                .setTitle('🛑 Eventos detenidos')
                .setDescription(`Se detuvieron **${count}** evento(s) del tipo **${type}** en este servidor.`)
                .setTimestamp()
              await ch.send({ embeds: [emb] })
            }
          } catch (err) {
            const logger = require('#utils/logger').child({ service: 'events' })
            logger.warn({ err }, 'No se pudo anunciar la detención por tipo en logChannelId')
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
      if (!events || events.length === 0) { await interaction.editReply('No hay eventos activos'); return }

      const niceTypeMap = {
        double_candies: { label: 'Doble Gominolas', emoji: '🍬', color: 0xE67E22 },
        double_butterflies: { label: 'Doble Mariposas', emoji: '🦋', color: 0x9B59B6 },
        tournament: { label: 'Torneo', emoji: '🏆', color: 0x2ECC71 },
        boss: { label: 'Jefe', emoji: '👹', color: 0xE74C3C }
      }

      function formatRemaining(endsAt) {
        const now = Date.now()
        const delta = new Date(endsAt).getTime() - now
        if (delta <= 0) return 'finalizado'
        const mins = Math.floor(delta / 60000)
        if (mins < 60) return `${mins}m restante`
        const hrs = Math.floor(mins / 60)
        const rem = mins % 60
        return `${hrs}h ${rem}m restante`
      }

      // Pagination
      const pageSize = 3
      const pages = []
      for (let i = 0; i < events.length; i += pageSize) {
        const slice = events.slice(i, i + pageSize)
        const embed = new EmbedBuilder()
          .setTitle('Eventos activos')
          .setDescription(`Hay **${events.length}** evento(s) activo(s) en este servidor`)
          .setTimestamp()

        for (const e of slice) {
          const meta = niceTypeMap[e.type] || { label: e.type, emoji: '🎫', color: 0x95A5A6 }
          const starts = `<t:${Math.floor(new Date(e.startsAt).getTime() / 1000)}:f>`
          const ends = `<t:${Math.floor(new Date(e.endsAt).getTime() / 1000)}:f>`
          const remaining = formatRemaining(e.endsAt)
          const multiplier = e.payload?.multiplier ? `${e.payload.multiplier}×` : 'N/A'

          embed.addFields({ name: `${meta.emoji} ${meta.label} — ${e.id.slice(0, 8)}`, value: `**Inicio:** ${starts}\n**Fin:** ${ends} (${remaining})\n**Multiplicador:** ${multiplier}`, inline: false })
          if (!embed.data.color) embed.setColor(meta.color)
        }

        pages.push(embed)
      }

      const pageCount = pages.length
      const buildRow = (pageIndex) => {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
        const row = new ActionRowBuilder()
        if (pageCount > 1) {
          const prev = new ButtonBuilder().setCustomId(`events_nav:${interaction.guild.id}:${Math.max(0, pageIndex - 1)}:${interaction.user.id}`).setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 0)
          const next = new ButtonBuilder().setCustomId(`events_nav:${interaction.guild.id}:${Math.min(pageCount - 1, pageIndex + 1)}:${interaction.user.id}`).setLabel('Siguiente ▶️').setStyle(ButtonStyle.Primary).setDisabled(pageIndex === pageCount - 1)
          row.addComponents(prev, next)
        }
        return row
      }

      // send first page
      const initial = pages[0]
      const row = buildRow(0)
      const components = pageCount > 1 ? [row] : []
      const sent = await interaction.editReply({ embeds: [initial], components })

      try {
        const { scheduleDisable } = require('#services/eventPagination')
        const ttl = parseInt(process.env.EVENT_PAGINATION_TTL_MS, 10) || 15 * 60 * 1000
        const message = sent && sent.id ? sent : await interaction.fetchReply()
        scheduleDisable(message, ttl)
      } catch (err) {
        // ignore scheduling errors
      }
      return
    }
  }
}
