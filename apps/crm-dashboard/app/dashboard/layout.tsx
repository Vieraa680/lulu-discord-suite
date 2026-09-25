import { Sidebar } from '@/components/Sidebar'
import { getActiveGuildId, getAvailableGuilds } from '@/lib/dashboard-data'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [guildId, availableGuilds] = await Promise.all([
    getActiveGuildId(),
    getAvailableGuilds(),
  ])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Sidebar guildId={guildId} availableGuilds={availableGuilds} />

      <main className="lg:pl-64 transition-all">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
