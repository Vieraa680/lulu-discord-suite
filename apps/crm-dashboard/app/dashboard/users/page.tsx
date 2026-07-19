import Link from 'next/link'
import { getGuildId, searchUsers } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const guildId = getGuildId()
  const users = guildId ? await searchUsers(guildId, q ?? '') : []

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Users</h1>
        <p className="mt-2 text-zinc-500">Search Discord profiles, inventory, balances, and active forms.</p>
      </header>
      <form className="flex max-w-xl gap-3">
        <input name="q" defaultValue={q ?? ''} placeholder="Search by username or Discord ID" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:border-zinc-800 dark:bg-zinc-950" />
        <button className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Search</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {users.map(user => (
          <Link key={user.id} href={`/dashboard/users/${user.discordId}`} className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{user.username || user.discordId}</h2>
                <p className="text-xs text-zinc-500">{user.discordId}</p>
              </div>
              <span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-semibold text-pink-600 dark:bg-pink-950/30">{user.candies.toLocaleString()} 🍬</span>
            </div>
            <p className="mt-4 text-sm text-zinc-500">
              W/L/S: {user.polymorphiaWins}/{user.polymorphiaLosses}/{user.polymorphiaSaved} · Items: {user.items.length}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
