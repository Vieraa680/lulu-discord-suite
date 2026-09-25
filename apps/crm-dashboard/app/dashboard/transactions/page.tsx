import { Header } from '@/components/Header'
import { TransactionFilters } from '@/components/TransactionFilters'
import { TransactionRow } from '@/components/TransactionRow'
import { getActiveGuildId, getRecentTransactions } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; guild?: string }>
}) {
  const { type, guild } = await searchParams
  const guildId = await getActiveGuildId(guild)
  const transactions = await getRecentTransactions(guildId, 60, type)

  return (
    <div className="space-y-5">
      <Header
        title="Transacciones"
        subtitle="Registro inmutable de movimientos económicos y acciones de staff"
        guildId={guildId}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TransactionFilters />
        <span className="text-xs text-zinc-500">
          {transactions.length} registros
        </span>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60">
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500">
            No se encontraron movimientos para el filtro seleccionado.
          </div>
        ) : (
          transactions.map(transaction => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))
        )}
      </div>
    </div>
  )
}
