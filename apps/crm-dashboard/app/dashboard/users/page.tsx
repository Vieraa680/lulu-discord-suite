import Link from 'next/link'
import { Header } from '@/components/Header'
import { getActiveGuildId, searchUsers } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; guild?: string }>
}) {
  const { q, filter, guild } = await searchParams
  const guildId = await getActiveGuildId(guild)
  let users = await searchUsers(guildId, q ?? '', 60)

  if (filter === 'candies') {
    users = users.filter(u => u.candies > 0)
  } else if (filter === 'hexed') {
    users = users.filter(u => u.state?.isActive)
  } else if (filter === 'items') {
    users = users.filter(u => u.items.length > 0)
  }

  return (
    <div className="space-y-5">
      <Header
        title="Jugadores"
        subtitle="Directorio de miembros, balances de economía y estado de duelos"
        guildId={guildId}
      />

      {/* Search & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex w-full max-w-sm gap-2" method="GET">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Buscar por nombre o Snowflake ID..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-700"
          />
          {filter && <input type="hidden" name="filter" value={filter} />}
          <button
            type="submit"
            className="rounded-lg bg-zinc-100 text-zinc-950 px-3.5 py-1.5 text-xs font-semibold hover:bg-white transition shrink-0"
          >
            Buscar
          </button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/dashboard/users${q ? `?q=${q}` : ''}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              !filter
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            Todos ({users.length})
          </Link>
          <Link
            href={`/dashboard/users?filter=hexed${q ? `&q=${q}` : ''}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === 'hexed'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            Metamorfosis activa
          </Link>
          <Link
            href={`/dashboard/users?filter=candies${q ? `&q=${q}` : ''}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === 'candies'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            Con saldo
          </Link>
          <Link
            href={`/dashboard/users?filter=items${q ? `&q=${q}` : ''}`}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === 'items'
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            Con inventario
          </Link>
        </div>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-12 text-center text-xs text-zinc-500">
          No se encontraron jugadores que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/70 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-2.5 pl-4 pr-3">Invocador</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3 text-right">Caramelos</th>
                <th className="py-2.5 px-3 text-right">Duelos (V/D)</th>
                <th className="py-2.5 px-3 text-right">Ratio</th>
                <th className="py-2.5 px-3 text-right">Ítems</th>
                <th className="py-2.5 pr-4 pl-3 text-right w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map(user => {
                const totalDuels = user.polymorphiaWins + user.polymorphiaLosses
                const winRate = totalDuels > 0 ? Math.round((user.polymorphiaWins / totalDuels) * 100) : 0
                const isHexed = user.state?.isActive

                return (
                  <tr key={user.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-300">
                          {user.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={user.avatarUrl} alt={user.username} className="h-full w-full rounded-full object-cover" />
                          ) : (
                            user.username.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/users/${user.discordId}`}
                            className="font-medium text-zinc-200 hover:text-white"
                          >
                            {user.globalName || user.username}
                          </Link>
                          <span className="block font-mono text-[10px] text-zinc-500">
                            {user.discordId}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      {isHexed ? (
                        <span className="rounded bg-violet-950/60 px-1.5 py-0.2 text-[10px] text-violet-300 border border-violet-800/40">
                          {user.state?.currentForm}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">Normal</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-zinc-200 tabular-nums">
                      {user.candies.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right text-zinc-300 tabular-nums">
                      {user.polymorphiaWins} / {user.polymorphiaLosses}
                    </td>

                    <td className="py-3 px-3 text-right text-zinc-300 tabular-nums">
                      {totalDuels > 0 ? `${winRate}%` : '—'}
                    </td>

                    <td className="py-3 px-3 text-right text-zinc-400 tabular-nums">
                      {user.items.length}
                    </td>

                    <td className="py-3 pr-4 pl-3 text-right">
                      <Link
                        href={`/dashboard/users/${user.discordId}`}
                        className="text-[11px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
