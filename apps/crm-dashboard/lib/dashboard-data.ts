import { prisma } from '@lulu-discord/database'

export const DEFAULT_GUILD_ID = process.env.GUILD_ID ?? ''

export const LEADERBOARD_FIELDS = {
  candies: 'candies',
  wins: 'polymorphiaWins',
  defenses: 'polymorphiaSaved',
  earned: 'totalEarned',
  losses: 'polymorphiaLosses',
} as const

export type LeaderboardCategory = keyof typeof LEADERBOARD_FIELDS

export function getGuildId(searchGuildId?: string | null) {
  return searchGuildId || DEFAULT_GUILD_ID
}

export async function getDashboardStats(guildId: string) {
  const [
    totalUsers,
    totalCandies,
    totalEarned,
    totalSpent,
    totalWins,
    totalLosses,
    totalSaved,
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
    prisma.transaction.count({ where: { user: { guildId }, description: { contains: 'mariposa' } } }),
  ])

  return {
    totalUsers,
    totalCandies: totalCandies._sum.candies ?? 0,
    totalEarned: totalEarned._sum.totalEarned ?? 0,
    totalSpent: totalSpent._sum.totalSpent ?? 0,
    totalDuels: (totalWins._sum.polymorphiaWins ?? 0) + (totalLosses._sum.polymorphiaLosses ?? 0),
    totalWins: totalWins._sum.polymorphiaWins ?? 0,
    totalLosses: totalLosses._sum.polymorphiaLosses ?? 0,
    totalSaved: totalSaved._sum.polymorphiaSaved ?? 0,
    activePolymorphiaCount,
    totalTransactions,
    butterfliesCaught,
  }
}

export async function getLeaderboard(guildId: string, category: LeaderboardCategory = 'candies', limit = 10) {
  const field = LEADERBOARD_FIELDS[category] ?? LEADERBOARD_FIELDS.candies

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
      candies: true,
      polymorphiaWins: true,
      polymorphiaSaved: true,
      totalEarned: true,
      polymorphiaLosses: true,
    },
  })

  return users.map((user, index) => ({
    rank: index + 1,
    discordId: user.discordId,
    username: user.username || user.discordId,
    value: user[field],
  }))
}

export async function searchUsers(guildId: string, query = '', limit = 25) {
  return prisma.user.findMany({
    where: {
      guildId,
      ...(query
        ? {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
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
}

export async function getUserDetails(guildId: string, discordId: string) {
  return prisma.user.findUnique({
    where: { discordId_guildId: { discordId, guildId } },
    include: {
      state: true,
      items: { include: { item: true }, where: { quantity: { gt: 0 } } },
      transactions: { orderBy: { createdAt: 'desc' }, take: 25 },
    },
  })
}

export async function getRecentTransactions(guildId: string, limit = 25) {
  return prisma.transaction.findMany({
    where: { user: { guildId } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { discordId: true, username: true } } },
  })
}
