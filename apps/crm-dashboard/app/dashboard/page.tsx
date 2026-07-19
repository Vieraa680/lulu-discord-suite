import { LeaderboardTable } from '@/components/LeaderboardTable'
import { StatCard } from '@/components/StatCard'
import { TransactionRow } from '@/components/TransactionRow'
import { getDashboardStats, getGuildId, getLeaderboard, getRecentTransactions } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const guildId = getGuildId()

  if (!guildId) {
    return <EmptyState message="Set GUILD_ID in the dashboard environment to load CRM data." />
  }

  const [stats, leaderboard, transactions] = await Promise.all([
    getDashboardStats(guildId),
    getLeaderboard(guildId, 'candies', 5),
    getRecentTransactions(guildId, 6),
  ])

  return (
    <div className="space-y-8">
      <Header title="Dashboard" subtitle={`Guild ${guildId}`} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Users" value={stats.totalUsers.toLocaleString()} icon="SHIELD" helper="Profiles in this guild" />
        <StatCard title="Candies" value={stats.totalCandies.toLocaleString()} icon="CANDY" tone="text-pink-500" helper="Current economy supply" />
        <StatCard title="Duels" value={stats.totalDuels.toLocaleString()} icon="SWORDS" tone="text-purple-500" helper={`${stats.activePolymorphiaCount} active polymorphia`} />
        <StatCard title="Butterflies" value={stats.butterfliesCaught.toLocaleString()} icon="SPARKLES" tone="text-amber-500" helper="Caught through minigames" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Top candy holders</h2>
          <LeaderboardTable rows={leaderboard} label="Candies" />
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <div className="mt-2">
            {transactions.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)}
          </div>
        </section>
      </div>
    </div>
  )
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header>
      <p className="text-sm font-medium text-indigo-500">Lulu Discord Suite</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-zinc-500">{subtitle}</p>
    </header>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-zinc-500 dark:border-zinc-800">{message}</div>
}
