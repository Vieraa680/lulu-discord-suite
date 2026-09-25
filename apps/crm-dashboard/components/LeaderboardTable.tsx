import Link from 'next/link'

interface LeaderboardRow {
  rank: number
  discordId: string
  username: string
  avatarUrl?: string | null
  value: number
  wins?: number
  losses?: number
  candies?: number
  streak?: number
}

interface LeaderboardTableProps {
  rows: LeaderboardRow[]
  label: string
}

export function LeaderboardTable({ rows, label }: LeaderboardTableProps) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-xs text-zinc-500">
        No hay registros disponibles para esta categoría en este servidor.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-zinc-800 bg-zinc-900/70 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          <tr>
            <th className="py-2.5 pl-4 pr-2 w-14">#</th>
            <th className="py-2.5 px-3">Jugador</th>
            <th className="py-2.5 px-3 text-right">{label}</th>
            <th className="py-2.5 pr-4 pl-3 text-right w-20">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map(row => (
            <tr key={row.discordId} className="hover:bg-zinc-800/40 transition-colors">
              <td className="py-2.5 pl-4 pr-2 font-mono font-medium text-zinc-400 tabular-nums">
                {row.rank}
              </td>
              <td className="py-2.5 px-3">
                <Link
                  href={`/dashboard/users/${row.discordId}`}
                  className="font-medium text-zinc-200 hover:text-white transition-colors"
                >
                  {row.username}
                </Link>
                <span className="ml-2 font-mono text-[11px] text-zinc-500">
                  {row.discordId}
                </span>
              </td>
              <td className="py-2.5 px-3 text-right font-medium text-zinc-200 tabular-nums">
                {row.value.toLocaleString()}
              </td>
              <td className="py-2.5 pr-4 pl-3 text-right">
                <Link
                  href={`/dashboard/users/${row.discordId}`}
                  className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Ver CRM
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
