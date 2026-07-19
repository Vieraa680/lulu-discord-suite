interface TransactionRowProps {
  transaction: {
    id: string
    type: string
    amount: number
    balanceAfter: number
    description: string
    createdAt: Date
    user?: { username: string; discordId: string }
  }
}

export function TransactionRow({ transaction }: TransactionRowProps) {
  const isSpend = transaction.type === 'spend'

  return (
    <article className="flex items-center justify-between gap-4 border-b border-zinc-100 py-4 last:border-b-0 dark:border-zinc-900">
      <div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{transaction.description || transaction.type}</p>
        <p className="text-xs text-zinc-500">
          {transaction.user?.username || transaction.user?.discordId || 'Unknown user'} · {transaction.createdAt.toLocaleString()}
        </p>
      </div>
      <div className="text-right">
        <p className={isSpend ? 'font-semibold text-rose-500' : 'font-semibold text-emerald-500'}>
          {isSpend ? '-' : '+'}{transaction.amount.toLocaleString()} 🍬
        </p>
        <p className="text-xs text-zinc-500">Balance {transaction.balanceAfter.toLocaleString()}</p>
      </div>
    </article>
  )
}
