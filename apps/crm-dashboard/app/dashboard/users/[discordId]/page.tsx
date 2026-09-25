import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { TransactionRow } from '@/components/TransactionRow'
import { UserActionModals } from '@/components/UserActionModals'
import { getActiveGuildId, getItemsCatalog, getUserDetails } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function UserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ discordId: string }>
  searchParams?: Promise<{ guild?: string }>
}) {
  const { discordId } = await params
  const { guild } = (await searchParams) ?? {}
  const guildId = await getActiveGuildId(guild)

  const [user, itemsCatalog] = await Promise.all([
    getUserDetails(guildId, discordId),
    getItemsCatalog(),
  ])

  if (!user) notFound()

  const totalDuels = user.polymorphiaWins + user.polymorphiaLosses
  const winRate = totalDuels > 0 ? Math.round((user.polymorphiaWins / totalDuels) * 100) : 0
  const isHexed = Boolean(user.state?.isActive)

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link href="/dashboard/users" className="hover:text-zinc-300 transition-colors">
          Jugadores
        </Link>
        <span>/</span>
        <span className="text-zinc-300 font-mono text-[11px]">{user.discordId}</span>
      </div>

      <Header
        title={user.globalName || user.username || user.discordId}
        subtitle={`ID Discord: ${user.discordId}`}
        guildId={guildId}
      />

      {/* User Summary Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-200">
              {user.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={user.avatarUrl} alt={user.username} className="h-full w-full rounded-full object-cover" />
              ) : (
                user.username.slice(0, 2).toUpperCase()
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-zinc-100">
                  {user.globalName || user.username}
                </span>
                {isHexed && (
                  <span className="rounded bg-violet-950/70 border border-violet-800/40 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                    Hex: {user.state?.currentForm}
                  </span>
                )}
              </div>
              <p className="font-mono text-xs text-zinc-500">{user.discordId}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-right">
            <div>
              <span className="text-[10px] uppercase font-medium text-zinc-500 block">Saldo Actual</span>
              <span className="text-xl font-bold text-zinc-100 tabular-nums">
                {user.candies.toLocaleString()} candies
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-4 sm:grid-cols-4 text-xs">
          <div>
            <span className="text-zinc-500 block">Total Ganado</span>
            <span className="font-semibold text-zinc-200 tabular-nums">
              +{user.totalEarned.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Total Gastado</span>
            <span className="font-semibold text-zinc-200 tabular-nums">
              -{user.totalSpent.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Duelos (V/D)</span>
            <span className="font-semibold text-zinc-200 tabular-nums">
              {user.polymorphiaWins} / {user.polymorphiaLosses} ({winRate}%)
            </span>
          </div>
          <div>
            <span className="text-zinc-500 block">Racha Diaria</span>
            <span className="font-semibold text-zinc-200 tabular-nums">
              {user.dailyStreak || 0} días
            </span>
          </div>
        </div>
      </div>

      {/* Moderation Controls */}
      <UserActionModals
        discordId={user.discordId}
        guildId={guildId}
        currentCandies={user.candies}
        isHexed={isHexed}
        currentForm={user.state?.currentForm}
        availableItems={itemsCatalog}
      />

      {/* Two Column Section: Inventory & Achievements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inventory */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Inventario ({user.items.length})
          </h2>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60">
            {user.items.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">Sin objetos en inventario.</p>
            ) : (
              user.items.map(userItem => (
                <div key={userItem.id} className="flex items-center justify-between py-2.5 px-3.5 text-xs">
                  <div>
                    <span className="font-medium text-zinc-200">{userItem.item.name}</span>
                    <span className="ml-2 text-[11px] text-zinc-500 capitalize">{userItem.item.rarity}</span>
                  </div>
                  <span className="font-mono font-medium text-zinc-300">
                    x{userItem.quantity}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Achievements */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-100">
            Logros Desbloqueados ({user.achievements?.length || 0})
          </h2>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60">
            {!user.achievements || user.achievements.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">Sin logros desbloqueados.</p>
            ) : (
              user.achievements.map(ua => (
                <div key={ua.id} className="py-2.5 px-3.5 text-xs">
                  <span className="font-medium text-zinc-200">{ua.achievement.name}</span>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{ua.achievement.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* User Transactions Audit */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-100">
          Historial de Movimientos ({user.transactions.length})
        </h2>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60">
          {user.transactions.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">Sin transacciones registradas.</p>
          ) : (
            user.transactions.map(t => (
              <TransactionRow
                key={t.id}
                transaction={{
                  ...t,
                  user: {
                    discordId: user.discordId,
                    username: user.globalName || user.username,
                    avatarUrl: user.avatarUrl,
                  },
                }}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
