import { getGuildId, getUserDetails } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, context: { params: Promise<{ discordId: string }> }) {
  const { discordId } = await context.params
  const guildId = getGuildId(new URL(request.url).searchParams.get('guildId'))
  if (!guildId) return Response.json({ error: 'guildId is required' }, { status: 400 })

  const user = await getUserDetails(guildId, discordId)
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  return Response.json(user)
}
