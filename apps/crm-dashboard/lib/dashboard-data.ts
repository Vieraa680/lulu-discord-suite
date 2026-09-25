import { prisma } from '@lulu-discord/database'

import { cookies } from 'next/headers'

export const DEFAULT_GUILD_ID = process.env.GUILD_ID?.trim() || ''
export const DEFAULT_TEST_GUILD_ID = process.env.TEST_GUILD_ID?.trim() || ''

export interface GuildOption {
  id: string
  name: string
  iconUrl?: string | null
  isTest?: boolean
}

let botGuildsCache: { timestamp: number; data: GuildOption[] } | null = null

export async function fetchBotGuildsFromDiscord(): Promise<GuildOption[]> {
  const token = process.env.DISCORD_TOKEN?.trim()
  if (!token) return []

  if (botGuildsCache && Date.now() - botGuildsCache.timestamp < 60_000) {
    return botGuildsCache.data
  }

  try {
    const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 60 },
    })

    if (res.ok) {
      const guilds = (await res.json()) as Array<{
        id: string
        name: string
        icon: string | null
      }>

      const formatted: GuildOption[] = guilds.map(g => {
        const lower = g.name.toLowerCase()
        const isTest =
          lower.includes('test') ||
          lower.includes('prueba') ||
          lower.includes('dev') ||
          lower.includes('staging') ||
          lower.includes('beta')

        return {
          id: g.id,
          name: g.name,
          iconUrl: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null,
          isTest,
        }
      })

      botGuildsCache = { timestamp: Date.now(), data: formatted }
      return formatted
    }
  } catch (err) {
    console.error('[dashboard-data] fetchBotGuildsFromDiscord error:', err)
  }

  return []
}

export async function getAvailableGuilds(): Promise<GuildOption[]> {
  const guildMap = new Map<string, GuildOption>()

  const discordGuilds = await fetchBotGuildsFromDiscord()
  for (const g of discordGuilds) {
    guildMap.set(g.id, g)
  }

  try {
    const [configs, userGuilds] = await Promise.all([
      prisma.guildConfig.findMany({ select: { guildId: true } }),
      prisma.user.findMany({ distinct: ['guildId'], select: { guildId: true } }),
    ])

    for (const cfg of configs) {
      if (cfg.guildId && !guildMap.has(cfg.guildId)) {
        guildMap.set(cfg.guildId, {
          id: cfg.guildId,
          name: `Servidor (${cfg.guildId})`,
          isTest: false,
        })
      }
    }

    for (const u of userGuilds) {
      if (u.guildId && !guildMap.has(u.guildId)) {
        guildMap.set(u.guildId, {
          id: u.guildId,
          name: `Servidor (${u.guildId})`,
          isTest: false,
        })
      }
    }
  } catch {
    // Database fallback
  }

  const envOfficial = process.env.GUILD_ID?.trim()
  if (envOfficial && !guildMap.has(envOfficial)) {
    guildMap.set(envOfficial, {
      id: envOfficial,
      name: `Servidor (${envOfficial})`,
      isTest: false,
    })
  }

  const envTest = process.env.TEST_GUILD_ID?.trim()
  if (envTest && !guildMap.has(envTest)) {
    guildMap.set(envTest, {
      id: envTest,
      name: `Servidor de Pruebas (${envTest})`,
      isTest: true,
    })
  }

  return Array.from(guildMap.values())
}

export async function getActiveGuildId(requestedGuildId?: string | null): Promise<string> {
  if (requestedGuildId?.trim()) {
    return requestedGuildId.trim()
  }

  try {
    const cookieStore = await cookies()
    const cookieGuild = cookieStore.get('lulu_selected_guild')?.value
    if (cookieGuild?.trim()) {
      return cookieGuild.trim()
    }
  } catch {
    // cookies() unavailable in non-request contexts
  }

  const available = await getAvailableGuilds()
  if (available.length > 0) {
    return available[0].id
  }

  return ''
}

export async function getGuildId(searchGuildId?: string | null): Promise<string> {
  return getActiveGuildId(searchGuildId)
}

export const LEADERBOARD_FIELDS = {
  candies: 'candies',
  wins: 'polymorphiaWins',
  defenses: 'polymorphiaSaved',
  earned: 'totalEarned',
  streak: 'dailyStreak',
} as const

export type LeaderboardCategory = keyof typeof LEADERBOARD_FIELDS

export interface DashboardStats {
  totalUsers: number
  totalCandies: number
  totalEarned: number
  totalSpent: number
  totalDuels: number
  totalWins: number
  totalLosses: number
  totalSaved: number
  activePolymorphiaCount: number
  totalTransactions: number
  butterfliesCaught: number
  isDbConnected: boolean
}

export interface DashboardUser {
  id: string
  discordId: string
  guildId?: string
  username: string
  globalName: string | null
  avatarUrl: string | null
  candies: number
  totalEarned: number
  totalSpent: number
  polymorphiaWins: number
  polymorphiaLosses: number
  polymorphiaSaved: number
  dailyStreak: number
  createdAt: Date
  state: {
    id: string
    isActive: boolean
    currentForm: string
    isVoluntary: boolean
    startedAt: Date | null
    endsAt: Date | null
  } | null
  items: Array<{
    id: string
    quantity: number
    item: {
      id: string
      name: string
      emoji: string
      rarity: string
      category: string
      price: number
    }
  }>
}

export async function getDashboardStats(guildId: string): Promise<DashboardStats> {
  if (!guildId) {
    return {
      totalUsers: 0,
      totalCandies: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalDuels: 0,
      totalWins: 0,
      totalLosses: 0,
      totalSaved: 0,
      activePolymorphiaCount: 0,
      totalTransactions: 0,
      butterfliesCaught: 0,
      isDbConnected: true,
    }
  }

  try {
    const [
      totalUsers,
      candiesAgg,
      earnedAgg,
      spentAgg,
      winsAgg,
      lossesAgg,
      savedAgg,
      activePolymorphiaCount,
      totalTransactions,
      butterfliesCaught,
    ] = await Promise.all([
      prisma.user.count({ where: { guildId } }),
      prisma.user.aggregate({ where: { guildId }, _sum: { candies: true } }),
      prisma.user.aggregate({ where: { guildId }, _sum: { totalEarned: true } }),
      prisma.user.aggregate({ where: { guildId }, _sum: { totalSpent: true } }),
      prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaWins: true } }),
      prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaLosses: true } }),
      prisma.user.aggregate({ where: { guildId }, _sum: { polymorphiaSaved: true } }),
      prisma.polymorphiaState.count({ where: { guildId, isActive: true } }),
      prisma.transaction.count({ where: { user: { guildId } } }),
      prisma.transaction.count({ where: { user: { guildId }, description: { contains: 'mariposa', mode: 'insensitive' } } }),
    ])

    const totalWins = winsAgg._sum.polymorphiaWins ?? 0
    const totalLosses = lossesAgg._sum.polymorphiaLosses ?? 0

    return {
      totalUsers,
      totalCandies: candiesAgg._sum.candies ?? 0,
      totalEarned: earnedAgg._sum.totalEarned ?? 0,
      totalSpent: spentAgg._sum.totalSpent ?? 0,
      totalDuels: totalWins + totalLosses,
      totalWins,
      totalLosses,
      totalSaved: savedAgg._sum.polymorphiaSaved ?? 0,
      activePolymorphiaCount,
      totalTransactions,
      butterfliesCaught,
      isDbConnected: true,
    }
  } catch (error) {
    console.error('[dashboard-data] getDashboardStats error:', error)
    return {
      totalUsers: 0,
      totalCandies: 0,
      totalEarned: 0,
      totalSpent: 0,
      totalDuels: 0,
      totalWins: 0,
      totalLosses: 0,
      totalSaved: 0,
      activePolymorphiaCount: 0,
      totalTransactions: 0,
      butterfliesCaught: 0,
      isDbConnected: false,
    }
  }
}

export async function getActivePolymorphia(guildId: string) {
  if (!guildId) return []

  try {
    const states = await prisma.polymorphiaState.findMany({
      where: { guildId, isActive: true },
      include: {
        user: { select: { discordId: true, username: true, globalName: true, avatarUrl: true } },
      },
      orderBy: { endsAt: 'asc' },
    })

    return states.map(s => ({
      id: s.id,
      discordId: s.user.discordId,
      username: s.user.globalName || s.user.username || s.user.discordId,
      avatarUrl: s.user.avatarUrl,
      currentForm: s.currentForm,
      isVoluntary: s.isVoluntary,
      endsAt: s.endsAt ? s.endsAt.toISOString() : null,
      minutesRemaining: s.endsAt ? Math.max(0, Math.round((s.endsAt.getTime() - Date.now()) / 60000)) : 0,
    }))
  } catch {
    return []
  }
}

export async function getLeaderboard(guildId: string, category: LeaderboardCategory = 'candies', limit = 25) {
  const field = LEADERBOARD_FIELDS[category] ?? LEADERBOARD_FIELDS.candies
  if (!guildId) return []

  try {
    const users = await prisma.user.findMany({
      where: {
        guildId,
        [field]: { gt: 0 },
      },
      orderBy: { [field]: 'desc' },
      take: limit,
      select: {
        discordId: true,
        username: true,
        globalName: true,
        avatarUrl: true,
        candies: true,
        polymorphiaWins: true,
        polymorphiaLosses: true,
        polymorphiaSaved: true,
        totalEarned: true,
        dailyStreak: true,
      },
    })

    return users.map((user, index) => ({
      rank: index + 1,
      discordId: user.discordId,
      username: user.globalName || user.username || user.discordId,
      avatarUrl: user.avatarUrl,
      value: (user[field as keyof typeof user] as number) ?? 0,
      wins: user.polymorphiaWins,
      losses: user.polymorphiaLosses,
      candies: user.candies,
      streak: user.dailyStreak,
    }))
  } catch {
    return []
  }
}

export async function searchUsers(guildId: string, query = '', limit = 40): Promise<DashboardUser[]> {
  if (!guildId) return []

  try {
    const users = await prisma.user.findMany({
      where: {
        guildId,
        ...(query
          ? {
              OR: [
                { username: { contains: query, mode: 'insensitive' } },
                { globalName: { contains: query, mode: 'insensitive' } },
                { discordId: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        state: true,
        items: { include: { item: true } },
      },
    })

    return users.map(u => ({
      id: u.id,
      discordId: u.discordId,
      guildId: u.guildId,
      username: u.username || u.discordId,
      globalName: u.globalName,
      avatarUrl: u.avatarUrl,
      candies: u.candies,
      totalEarned: u.totalEarned,
      totalSpent: u.totalSpent,
      polymorphiaWins: u.polymorphiaWins,
      polymorphiaLosses: u.polymorphiaLosses,
      polymorphiaSaved: u.polymorphiaSaved,
      dailyStreak: u.dailyStreak,
      createdAt: u.createdAt,
      state: u.state,
      items: u.items,
    }))
  } catch {
    return []
  }
}

export async function getUserDetails(guildId: string, discordId: string) {
  if (!guildId || !discordId) return null

  try {
    const user = await prisma.user.findUnique({
      where: { discordId_guildId: { discordId, guildId } },
      include: {
        state: true,
        items: { include: { item: true }, where: { quantity: { gt: 0 } } },
        transactions: { orderBy: { createdAt: 'desc' }, take: 40 },
        achievements: { include: { achievement: true }, orderBy: { unlockedAt: 'desc' } },
      },
    })

    return user
  } catch {
    return null
  }
}

export async function getRecentTransactions(guildId: string, limit = 40, filterType?: string) {
  if (!guildId) return []

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        user: { guildId },
        ...(filterType && filterType !== 'all' ? { type: filterType } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { discordId: true, username: true, globalName: true, avatarUrl: true } } },
    })

    return transactions.map(t => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt,
      user: {
        discordId: t.user.discordId,
        username: t.user.globalName || t.user.username || t.user.discordId,
        avatarUrl: t.user.avatarUrl,
      },
    }))
  } catch {
    return []
  }
}

export async function getItemsCatalog() {
  try {
    const items = await prisma.item.findMany({
      orderBy: [{ category: 'asc' }, { price: 'asc' }],
      include: {
        _count: { select: { owners: true } },
      },
    })

    return items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      emoji: item.emoji,
      price: item.price,
      category: item.category,
      rarity: item.rarity,
      isCollectible: item.isCollectible,
      isActive: item.isActive,
      formDuration: item.formDuration,
      ownersCount: item._count.owners,
    }))
  } catch {
    return []
  }
}

export async function getGuildConfig(guildId: string) {
  if (!guildId) {
    return {
      id: 'cfg-empty',
      guildId: '',
      veteranRoleName: 'Invocador Veterano',
      butterflyExcludedChannels: [],
      butterflyMultiplier: 1.0,
      candyMultiplier: 1.0,
      polymorphiaMinBet: 1,
      polymorphiaMaxBet: 1000,
      adminRoleId: null,
      logChannelId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  try {
    let config = await prisma.guildConfig.findUnique({
      where: { guildId },
    })

    if (!config) {
      config = await prisma.guildConfig.create({
        data: {
          guildId,
          veteranRoleName: 'Invocador Veterano',
          butterflyExcludedChannels: [],
          butterflyMultiplier: 1.0,
          candyMultiplier: 1.0,
          polymorphiaMinBet: 1,
          polymorphiaMaxBet: 1000,
        },
      })
    }

    return config
  } catch {
    return {
      id: 'cfg-fallback',
      guildId,
      veteranRoleName: 'Invocador Veterano',
      butterflyExcludedChannels: [],
      butterflyMultiplier: 1.0,
      candyMultiplier: 1.0,
      polymorphiaMinBet: 1,
      polymorphiaMaxBet: 1000,
      adminRoleId: null,
      logChannelId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }
}

export interface DiscordGuildRole {
  id: string
  name: string
  color: number
  hexColor: string
  position: number
}

export interface DiscordGuildChannel {
  id: string
  name: string
  type: number
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordGuildRole[]> {
  const token = process.env.DISCORD_TOKEN?.trim()
  if (!token || !guildId) return []

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 30 },
    })

    if (res.ok) {
      const roles = (await res.json()) as Array<{
        id: string
        name: string
        color: number
        position: number
        managed?: boolean
      }>

      return roles
        .filter(r => r.name !== '@everyone' && !r.managed)
        .sort((a, b) => b.position - a.position)
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.color,
          hexColor: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#71717a',
          position: r.position,
        }))
    }
  } catch (err) {
    console.error('[dashboard-data] fetchGuildRoles error:', err)
  }

  return []
}

export async function fetchGuildChannels(guildId: string): Promise<DiscordGuildChannel[]> {
  const token = process.env.DISCORD_TOKEN?.trim()
  if (!token || !guildId) return []

  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
      next: { revalidate: 30 },
    })

    if (res.ok) {
      const channels = (await res.json()) as Array<{
        id: string
        name: string
        type: number
        position?: number
      }>

      return channels
        .filter(c => c.type === 0 || c.type === 5)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        }))
    }
  } catch (err) {
    console.error('[dashboard-data] fetchGuildChannels error:', err)
  }

  return []
}

export async function getActivityRoleRules(guildId: string) {
  if (!guildId) return []

  try {
    return await prisma.activityRoleRule.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    })
  } catch (err) {
    console.error('[dashboard-data] getActivityRoleRules error:', err)
    return []
  }
}

