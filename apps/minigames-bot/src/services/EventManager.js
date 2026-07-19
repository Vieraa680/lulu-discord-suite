const { prisma } = require('#services/database')

// Simple EventManager with in-memory cache refreshed periodically
const CACHE_TTL_MS = parseInt(process.env.EVENT_MANAGER_TTL_MS, 10) || 30_000

let cache = new Map() // guildId -> [events]
let lastFetch = 0

async function refreshCache() {
  const now = Date.now()
  if (now - lastFetch < CACHE_TTL_MS) return
  const events = await prisma.event.findMany({ where: { isActive: true } })
  cache = new Map()
  for (const ev of events) {
    const arr = cache.get(ev.guildId) || []
    arr.push(ev)
    cache.set(ev.guildId, arr)
  }
  lastFetch = now
}

async function getActiveEvents(guildId) {
  await refreshCache()
  const now = new Date()
  const arr = (cache.get(guildId) || []).filter(ev => ev.startsAt <= now && ev.endsAt > now && ev.isActive)
  return arr
}

async function isEventActive(guildId, type) {
  const active = await getActiveEvents(guildId)
  return active.some(e => e.type === type)
}

async function createEvent(guildId, type, durationMinutes = 60, payload = {}) {
  const now = new Date()
  const endsAt = new Date(now.getTime() + durationMinutes * 60 * 1000)
  const ev = await prisma.event.create({ data: { guildId, type, payload, startsAt: now, endsAt } })
  // refresh cache
  lastFetch = 0
  await refreshCache()
  return ev
}

async function stopEvent(eventId) {
  const ev = await prisma.event.update({ where: { id: eventId }, data: { isActive: false } })
  lastFetch = 0
  await refreshCache()
  return ev
}

module.exports = { getActiveEvents, isEventActive, createEvent, stopEvent }
