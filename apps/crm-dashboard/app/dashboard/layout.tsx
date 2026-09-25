import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { isDiscordIdAllowed } from '@/lib/auth-utils'
import { Sidebar } from '@/components/Sidebar'
import { SetupWarningBanner } from '@/components/SetupWarningBanner'
import { getActiveGuildId, getAvailableGuilds } from '@/lib/dashboard-data'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const discordId = (session.user as any).discordId || session.user.id
  const check = isDiscordIdAllowed(discordId)

  if (!check.allowed) {
    redirect('/unauthorized')
  }

  const [guildId, availableGuilds] = await Promise.all([
    getActiveGuildId(),
    getAvailableGuilds(),
  ])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {!check.isConfigured && (
        <SetupWarningBanner discordId={discordId} />
      )}
      <Sidebar
        guildId={guildId}
        availableGuilds={availableGuilds}
        user={session.user}
      />

      <main className="lg:pl-64 transition-all">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
