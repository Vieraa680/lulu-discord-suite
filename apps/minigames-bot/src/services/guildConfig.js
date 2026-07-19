const { prisma } = require('#services/database')

// Simple in-memory cache to avoid DB roundtrips for hot paths
const cache = new Map()

const DEFAULTS = {
  veteranRoleName: 'Invocador Veterano',
  butterflyExcludedChannels: [],
  butterflyMultiplier: 1.0,
  candyMultiplier: 1.0,
  polymorphiaMinBet: 1,
  polymorphiaMaxBet: 1000,
  adminRoleId: null,
  logChannelId: null,
}

function mergeWithDefaults(dbRow) {
  if (!dbRow) return { ...DEFAULTS }
  return {
    veteranRoleName: dbRow.veteranRoleName ?? DEFAULTS.veteranRoleName,
    butterflyExcludedChannels: dbRow.butterflyExcludedChannels ?? DEFAULTS.butterflyExcludedChannels,
    butterflyMultiplier: dbRow.butterflyMultiplier ?? DEFAULTS.butterflyMultiplier,
    candyMultiplier: dbRow.candyMultiplier ?? DEFAULTS.candyMultiplier,
    polymorphiaMinBet: dbRow.polymorphiaMinBet ?? DEFAULTS.polymorphiaMinBet,
    polymorphiaMaxBet: dbRow.polymorphiaMaxBet ?? DEFAULTS.polymorphiaMaxBet,
    adminRoleId: dbRow.adminRoleId ?? DEFAULTS.adminRoleId,
    logChannelId: dbRow.logChannelId ?? DEFAULTS.logChannelId,
    createdAt: dbRow.createdAt,
    updatedAt: dbRow.updatedAt,
  }
}

async function getGuildConfig(guildId) {
  if (cache.has(guildId)) return cache.get(guildId)

  const row = await prisma.guildConfig.findUnique({ where: { guildId } })
  const merged = mergeWithDefaults(row)
  cache.set(guildId, merged)
  return merged
}

async function setGuildConfig(guildId, patch) {
  // Upsert so record exists
  const data = { ...patch }
  const row = await prisma.guildConfig.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  })
  const merged = mergeWithDefaults(row)
  cache.set(guildId, merged)
  return merged
}

function invalidateCache(guildId) {
  cache.delete(guildId)
}

module.exports = { getGuildConfig, setGuildConfig, invalidateCache }
