import { notFound } from 'next/navigation'
import { TransactionRow } from '@/components/TransactionRow'
import { getGuildId, getUserDetails } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function UserDetailPage({ params }: { params: Promise<{ discordId: string }> }) {
  const { discordId } = await params
  const guildId = getGuildId()
  const user = guildId ? await getUserDetails(guildId, discordId) : null

  if (!user) notFound()

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-500">{user.discordId}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{user.username || user.discordId}</h1>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge>{user.candies.toLocaleString()} candies</Badge>
          <Badge>{user.polymorphiaWins} wins</Badge>
          <Badge>{user.polymorphiaSaved} defenses</Badge>
          {user.state?.isActive ? <Badge>Active form: {user.state.currentForm}</Badge> : null}
        </div>
      </header>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {user.items.map(userItem => (
            <div key={userItem.id} className="rounded-xl border border-zinc-100 p-4 dark:border-zinc-900">
              <p className="font-medium">{userItem.item.emoji} {userItem.item.name}</p>
              <p className="text-sm text-zinc-500">Qty {userItem.quantity} · {userItem.item.rarity}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Recent transactions</h2>
        <div className="mt-2">
          {user.transactions.map(transaction => <TransactionRow key={transaction.id} transaction={{ ...transaction, user }} />)}
        </div>
      </section>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">{children}</span>
}
