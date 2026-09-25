import { Header } from '@/components/Header'
import { ActivityRolesManager } from '@/components/ActivityRolesManager'
import {
  getActiveGuildId,
  getActivityRoleRules,
  fetchGuildRoles,
  fetchGuildChannels,
} from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function ActivityRolesPage({
  searchParams,
}: {
  searchParams?: Promise<{ guild?: string }>
}) {
  const { guild } = (await searchParams) ?? {}
  const guildId = await getActiveGuildId(guild)

  const [rules, availableRoles, availableChannels] = await Promise.all([
    getActivityRoleRules(guildId),
    fetchGuildRoles(guildId),
    fetchGuildChannels(guildId),
  ])

  return (
    <div className="space-y-5">
      <Header
        title="Roles por Actividad"
        subtitle="Reglas dinámicas de asignación de roles por mensajes en el servidor o canales individuales"
        guildId={guildId}
      />

      <ActivityRolesManager
        guildId={guildId}
        rules={rules}
        availableRoles={availableRoles}
        availableChannels={availableChannels}
      />
    </div>
  )
}
