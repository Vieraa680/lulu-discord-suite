const { prisma } = require('#services/database')

// Simple in-memory cache to avoid DB roundtrips for hot paths
const cache = new Map()
const CACHE_TTL_MS = 10_000

const DEFAULTS = {
  veteranRoleName: 'Invocador Veterano',
  butterflyExcludedChannels: [],
  butterflyMultiplier: 1.0,
  candyMultiplier: 1.0,
  polymorphiaMinBet: 1,
  polymorphiaMaxBet: 1000,
  adminRoleId: null,
  logChannelId: null,
  xpEnabled: true,
  xpPerMessageMin: 15,
  xpPerMessageMax: 25,
  xpCooldownSec: 60,
  xpExcludedChannels: [],
  xpLevelUpChannelId: null,
  voiceXpEnabled: true,
  voiceXpPerMinute: 10,
  voiceXpMinMembers: 2,
  voiceXpRequiresUnmuted: false,
  xpRoleMultipliers: [],
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
    xpEnabled: dbRow.xpEnabled ?? DEFAULTS.xpEnabled,
    xpPerMessageMin: dbRow.xpPerMessageMin ?? DEFAULTS.xpPerMessageMin,
    xpPerMessageMax: dbRow.xpPerMessageMax ?? DEFAULTS.xpPerMessageMax,
    xpCooldownSec: dbRow.xpCooldownSec ?? DEFAULTS.xpCooldownSec,
    xpExcludedChannels: dbRow.xpExcludedChannels ?? DEFAULTS.xpExcludedChannels,
    xpLevelUpChannelId: dbRow.xpLevelUpChannelId ?? DEFAULTS.xpLevelUpChannelId,
    voiceXpEnabled: dbRow.voiceXpEnabled ?? DEFAULTS.voiceXpEnabled,
    voiceXpPerMinute: dbRow.voiceXpPerMinute ?? DEFAULTS.voiceXpPerMinute,
    voiceXpMinMembers: dbRow.voiceXpMinMembers ?? DEFAULTS.voiceXpMinMembers,
    voiceXpRequiresUnmuted: dbRow.voiceXpRequiresUnmuted ?? DEFAULTS.voiceXpRequiresUnmuted,
    xpRoleMultipliers: dbRow.xpRoleMultipliers ?? DEFAULTS.xpRoleMultipliers,
    createdAt: dbRow.createdAt,
    updatedAt: dbRow.updatedAt,
  }
}

async function getGuildConfig(guildId) {
  const now = Date.now()
  const cached = cache.get(guildId)
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data
  }

  const row = await prisma.guildConfig.findUnique({ where: { guildId } })
  const merged = mergeWithDefaults(row)
  cache.set(guildId, { fetchedAt: now, data: merged })
  return merged
}

async function setGuildConfig(guildId, patch) {
  const data = { ...patch }
  const row = await prisma.guildConfig.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  })
  const merged = mergeWithDefaults(row)
  cache.set(guildId, { fetchedAt: Date.now(), data: merged })
  return merged
}

function invalidateCache(guildId) {
  if (guildId) {
    cache.delete(guildId)
  } else {
    cache.clear()
  }
}

module.exports = { getGuildConfig, setGuildConfig, invalidateCache, CACHE_TTL_MS }
