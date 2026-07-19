// Live test script: create events via EventManager and post embed(s) to a chosen guild channel
require('dotenv').config()
const Module = require('module')
const path = require('path')
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')

const ROOT = path.resolve(__dirname, '..')

// Map internal '#services/*' aliases to local files so we can require the EventManager directly
const originalResolve = Module._resolveFilename
Module._resolveFilename = function(request, parent, isMain, options) {
  if (request === '#services/EventManager') return path.resolve(ROOT, 'apps/minigames-bot/src/services/EventManager.js')
  if (request.startsWith('#services/')) {
    const rel = request.replace('#services/', '')
    const candidate = path.resolve(ROOT, 'apps/minigames-bot/src/services', rel + '.js')
    if (require('fs').existsSync(candidate)) return candidate
  }
  if (request === '#services/guildConfig') return path.resolve(ROOT, 'apps/minigames-bot/src/services/guildConfig.js')
  return originalResolve.apply(this, arguments)
}

async function run() {
  const token = process.env.DISCORD_TOKEN
  const guildId = process.env.GUILD_ID
  if (!token || !guildId) {
    console.error('DISCORD_TOKEN and GUILD_ID must be set in env')
    process.exit(1)
  }

  const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] })
  await client.login(token)
  console.log('[live-test] Logged in')

  const guild = await client.guilds.fetch(guildId)
  await guild.channels.fetch()
  // pick a channel to post test messages: prefer a channel named 'bot-testing' else first text channel
  // Use isTextBased() method and check permissions for the bot user
  const chans = Array.from(guild.channels.cache.values())
  const { PermissionFlagsBits } = require('discord.js')
  // Candidates: text-based channels where bot has ViewChannel + SendMessages
  const candidates = chans.filter(c => c.isTextBased && typeof c.isTextBased === 'function' && c.isTextBased() && c.permissionsFor && c.permissionsFor(client.user) && c.permissionsFor(client.user).has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages))
  let testChannel = candidates.find(c => c.name && c.name.includes('bot-testing')) || candidates[0]
  if (!testChannel) {
    console.error('No suitable channel found to post test messages (bot may lack permissions)')
    process.exit(1)
  }
  if (!testChannel) {
    console.error('No suitable channel found to post test messages')
    process.exit(1)
  }

  // require EventManager and create events
  const eventManager = require(path.resolve(ROOT, 'apps/minigames-bot/src/services/EventManager.js'))

  console.log('[live-test] Creating 3 test events via EventManager.createEvent')
  const ev1 = await eventManager.createEvent(guildId, 'double_candies', 120, { multiplier: 2 })
  const ev2 = await eventManager.createEvent(guildId, 'boss', 30, {})
  const ev3 = await eventManager.createEvent(guildId, 'tournament', 90, {})

  console.log('[live-test] Events created:', ev1.id, ev2.id, ev3.id)

  // Build an embed like /events list would
  const niceTypeMap = {
    double_candies: { label: 'Doble Gominolas', emoji: '🍬', color: 0xE67E22 },
    double_butterflies: { label: 'Doble Mariposas', emoji: '🦋', color: 0x9B59B6 },
    tournament: { label: 'Torneo', emoji: '🏆', color: 0x2ECC71 },
    boss: { label: 'Jefe', emoji: '👹', color: 0xE74C3C }
  }

  const events = await eventManager.getActiveEvents(guildId)
  const embed = new EmbedBuilder().setTitle('Eventos activos (live test)').setDescription(`Hay **${events.length}** evento(s) activo(s) en este servidor`).setTimestamp()
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

  for (const e of events) {
    const meta = niceTypeMap[e.type] || { label: e.type, emoji: '🎫', color: 0x95A5A6 }
    const starts = `<t:${Math.floor(new Date(e.startsAt).getTime() / 1000)}:f>`
    const ends = `<t:${Math.floor(new Date(e.endsAt).getTime() / 1000)}:f>`
    const remaining = formatRemaining(e.endsAt)
    const multiplier = e.payload?.multiplier ? `${e.payload.multiplier}×` : 'N/A'
    embed.addFields({ name: `${meta.emoji} ${meta.label} — ${e.id.slice(0, 8)}`, value: `**Inicio:** ${starts}\n**Fin:** ${ends} (${remaining})\n**Multiplicador:** ${multiplier}` })
    if (!embed.data.color) embed.setColor(meta.color)
  }

  // add simple nav buttons (for demo - won't be handled here)
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`events_nav:${guildId}:0:${process.env.OWNER_ID || 'test'}`).setLabel('◀️ Anterior').setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId(`events_nav:${guildId}:1:${process.env.OWNER_ID || 'test'}`).setLabel('Siguiente ▶️').setStyle(ButtonStyle.Primary)
  )

  let sent
  // attempt to send; if Missing Access, try other candidates
  const tryChannels = [testChannel].concat(candidates.filter(c => c.id !== testChannel.id))
  for (const ch of tryChannels) {
    try {
      sent = await ch.send({ embeds: [embed], components: [row] })
      console.log('[live-test] Posted list embed to', ch.id)
      break
    } catch (err) {
      console.warn('[live-test] failed to send to channel', ch.id, err.message)
      continue
    }
  }
  if (!sent) {
    console.error('Failed to send test message to any candidate channel')
    await client.destroy()
    process.exit(1)
  }

  // Wait a bit and then stop the events
  await new Promise(r => setTimeout(r, 2000))
  console.log('[live-test] Stopping events by type double_candies')
  const stopped = await eventManager.stopEventsByType(guildId, 'double_candies')
  console.log('[live-test] stopEventsByType returned count:', stopped)

  // announce stop manually to channel (simulate behavior)
  const stopEmb = new EmbedBuilder().setTitle('🛑 Evento detenido (live test)').setDescription(`Se detuvieron **${stopped}** evento(s) del tipo **double_candies**`).setTimestamp()
  await testChannel.send({ embeds: [stopEmb] })

  console.log('[live-test] Done. Cleaning up and exiting.')
  await client.destroy()
}

run().catch(err => { console.error(err); process.exit(1) })
