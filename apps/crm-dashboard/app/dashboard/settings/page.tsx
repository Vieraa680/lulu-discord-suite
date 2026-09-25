import { Header } from '@/components/Header'
import { SettingsForm } from '@/components/SettingsForm'
import { getActiveGuildId, getGuildConfig } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ guild?: string }>
}) {
  const { guild } = (await searchParams) ?? {}
  const guildId = await getActiveGuildId(guild)
  const config = await getGuildConfig(guildId)

  return (
    <div className="space-y-5">
      <Header
        title="Configuración"
        subtitle="Multiplicadores de economía, reglas de duelos y canales de Discord"
        guildId={guildId}
      />

      <SettingsForm config={config} />
    </div>
  )
}
