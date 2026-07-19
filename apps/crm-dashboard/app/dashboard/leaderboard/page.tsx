import Link from 'next/link'
import { LeaderboardTable } from '@/components/LeaderboardTable'
import { getGuildId, getLeaderboard, type LeaderboardCategory } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

const categories: Array<{ key: LeaderboardCategory; label: string }> = [
  { key: 'candies', label: 'Candies' },
  { key: 'wins', label: 'Wins' },
  { key: 'defenses', label: 'Defenses' },
  { key: 'earned', label: 'Earned' },
]

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ category?: LeaderboardCategory }> }) {
  const { category } = await searchParams
  const guildId = getGuildId()
  const selected = categories.some(item => item.key === category) ? category! : 'candies'
  const rows = guildId ? await getLeaderboard(guildId, selected, 25) : []
  const label = categories.find(item => item.key === selected)?.label ?? 'Value'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-2 text-zinc-500">Rank users by economy and Polymorphia performance.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {categories.map(item => (
          <Link key={item.key} href={`/dashboard/leaderboard?category=${item.key}`} className={`rounded-full px-4 py-2 text-sm font-medium ${selected === item.key ? 'bg-indigo-600 text-white' : 'bg-white text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800'}`}>
            {item.label}
          </Link>
        ))}
      </div>
      <LeaderboardTable rows={rows} label={label} />
    </div>
  )
}
