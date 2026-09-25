import Link from 'next/link'
import { Header } from '@/components/Header'
import { LeaderboardTable } from '@/components/LeaderboardTable'
import { PolymorphiaBanner } from '@/components/PolymorphiaBanner'
import { StatCard } from '@/components/StatCard'
import { TransactionRow } from '@/components/TransactionRow'
import { getActiveGuildId, getActivePolymorphia, getDashboardStats, getLeaderboard, getRecentTransactions } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ guild?: string }>
}) {
  const { guild } = (await searchParams) ?? {}
  const guildId = await getActiveGuildId(guild)

  const [stats, leaderboard, transactions, activeHexes] = await Promise.all([
    getDashboardStats(guildId),
    getLeaderboard(guildId, 'candies', 8),
    getRecentTransactions(guildId, 8),
    getActivePolymorphia(guildId),
  ])

  return (
    <div className="space-y-6">
      <Header
        title="Resumen"
        subtitle="Métricas del servidor, economía y estado de metamorfosis"
        guildId={guildId}
      />

      {/* Polymorphia Active Alert */}
      <PolymorphiaBanner activeHexes={activeHexes} guildId={guildId} />

      {/* Primary Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Caramelos en Circulación"
          value={stats.totalCandies.toLocaleString()}
          helper={`Total ganado: ${stats.totalEarned.toLocaleString()}`}
        />
        <StatCard
          title="Jugadores Registrados"
          value={stats.totalUsers.toLocaleString()}
          helper="Perfiles en este servidor"
        />
        <StatCard
          title="Duelos Jugados"
          value={stats.totalDuels.toLocaleString()}
          helper={`${stats.activePolymorphiaCount} metamorfosis activas`}
        />
        <StatCard
          title="Mariposas Cazadas"
          value={stats.butterfliesCaught.toLocaleString()}
          helper="Capturas en canales activos"
        />
      </div>

      {/* Two Column Grid: Leaderboard & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Players */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Top Titulares de Caramelos</h2>
            <Link
              href="/dashboard/leaderboard"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Ver tabla completa →
            </Link>
          </div>
          <LeaderboardTable rows={leaderboard} label="Caramelos" />
        </section>

        {/* Recent Transactions */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-100">Actividad Reciente</h2>
            <Link
              href="/dashboard/transactions"
              className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Ver todos →
            </Link>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 divide-y divide-zinc-800/60 overflow-hidden">
            {transactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-zinc-500">No hay movimientos recientes.</p>
            ) : (
              transactions.map(transaction => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
