import { TransactionRow } from '@/components/TransactionRow'
import { getGuildId, getRecentTransactions } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const guildId = getGuildId()
  const transactions = guildId ? await getRecentTransactions(guildId, 50) : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Transactions</h1>
        <p className="mt-2 text-zinc-500">Recent candy movement across the guild economy.</p>
      </header>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        {transactions.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} />)}
      </section>
    </div>
  )
}
