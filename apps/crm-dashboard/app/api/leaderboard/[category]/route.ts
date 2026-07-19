import { getGuildId, getLeaderboard, LEADERBOARD_FIELDS, type LeaderboardCategory } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ category: string }> }) {
  const { category } = await context.params
  if (!(category in LEADERBOARD_FIELDS)) {
    return Response.json({ error: 'Invalid leaderboard category' }, { status: 400 })
  }

  const searchParams = new URL(request.url).searchParams
  const guildId = getGuildId(searchParams.get('guildId'))
  const limit = Number(searchParams.get('limit') ?? 10)
  if (!guildId) return Response.json({ error: 'guildId is required' }, { status: 400 })

  return Response.json(await getLeaderboard(guildId, category as LeaderboardCategory, limit))
}
