import { getActiveGuildId, getDashboardStats } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const guildId = await getActiveGuildId(new URL(request.url).searchParams.get('guildId'))
  if (!guildId) return Response.json({ error: 'guildId is required' }, { status: 400 })

  return Response.json(await getDashboardStats(guildId))
}
