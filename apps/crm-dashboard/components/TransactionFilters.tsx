'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'earn', label: 'Ganados' },
  { key: 'spend', label: 'Gastados' },
  { key: 'admin', label: 'Ajustes Staff' },
  { key: 'refund', label: 'Reembolsos' },
]

export function TransactionFilters() {
  const searchParams = useSearchParams()
  const current = searchParams.get('type') || 'all'

  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERS.map(f => {
        const active = current === f.key
        return (
          <Link
            key={f.key}
            href={`/dashboard/transactions${f.key === 'all' ? '' : `?type=${f.key}`}`}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            {f.label}
          </Link>
        )
      })}
    </div>
  )
}
