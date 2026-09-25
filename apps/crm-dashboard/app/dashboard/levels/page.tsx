import { Header } from '@/components/Header'
import { LevelingForm } from '@/components/LevelingForm'
import { SeasonManager } from '@/components/SeasonManager'
import {
  getActiveGuildId,
  getGuildConfig,
  fetchGuildRoles,
  fetchGuildChannels,
  getSeasonsData,
} from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function LevelsPage({
  searchParams,
}: {
  searchParams?: Promise<{ guild?: string }>
}) {
  const { guild } = (await searchParams) ?? {}
  const guildId = await getActiveGuildId(guild)
  const [config, roles, channels, seasonsData] = await Promise.all([
    getGuildConfig(guildId),
    fetchGuildRoles(guildId),
    fetchGuildChannels(guildId),
    getSeasonsData(guildId),
  ])

  return (
    <div className="space-y-8">
      <Header
        title="Niveles y Temporadas"
        subtitle="Temporadas mensuales, roles de evento y configuración de experiencia"
        guildId={guildId}
      />

      <SeasonManager
        guildId={guildId}
        seasonsData={seasonsData}
        roles={roles}
      />

      <LevelingForm
        guildId={guildId}
        config={config}
        roles={roles}
        channels={channels}
      />
    </div>
  )
}

