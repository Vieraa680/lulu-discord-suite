import Link from 'next/link'

interface TransactionProps {
  transaction: {
    id: string
    type: string
    amount: number
    balanceAfter: number
    description: string
    createdAt: Date | string
    user: {
      discordId: string
      username: string
      avatarUrl?: string | null
    }
  }
}

export function TransactionRow({ transaction }: TransactionProps) {
  const isPositive = transaction.type === 'earn' || transaction.type === 'admin'
  const dateObj = new Date(transaction.createdAt)
  const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })

  return (
    <div className="flex items-center justify-between py-2.5 px-3 text-xs hover:bg-zinc-850 transition-colors">
      <div className="min-w-0 pr-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/users/${transaction.user.discordId}`}
            className="font-medium text-zinc-200 hover:text-white truncate"
          >
            {transaction.user.username}
          </Link>
          <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] uppercase font-mono text-zinc-400">
            {transaction.type}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
          {transaction.description || 'Movimiento de economía'}
        </p>
      </div>

      <div className="text-right shrink-0">
        <span
          className={`font-semibold tabular-nums text-xs ${
            isPositive ? 'text-emerald-400' : 'text-zinc-300'
          }`}
        >
          {isPositive ? '+' : '-'}{transaction.amount.toLocaleString()}
        </span>
        <p className="text-[11px] text-zinc-500 tabular-nums">
          Saldo: {transaction.balanceAfter.toLocaleString()} · {dateFormatted} {timeFormatted}
        </p>
      </div>
    </div>
  )
}
