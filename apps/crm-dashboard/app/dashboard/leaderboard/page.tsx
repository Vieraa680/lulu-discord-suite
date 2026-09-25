import Link from 'next/link'
import { Header } from '@/components/Header'
import { LeaderboardTable } from '@/components/LeaderboardTable'
import { getActiveGuildId, getLeaderboard, type LeaderboardCategory } from '@/lib/dashboard-data'

export const dynamic = 'force-dynamic'

const categories: Array<{ key: LeaderboardCategory; label: string }> = [
  { key: 'candies', label: 'Caramelos' },
  { key: 'wins', label: 'Victorias en Duelo' },
  { key: 'defenses', label: 'Defensas Exitosas' },
  { key: 'earned', label: 'Histórico Ganado' },
  { key: 'streak', label: 'Racha Diaria' },
]

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: LeaderboardCategory; guild?: string }>
}) {
  const { category, guild } = await searchParams
  const guildId = await getActiveGuildId(guild)
  const selected = categories.some(item => item.key === category) ? category! : 'candies'
  const rows = await getLeaderboard(guildId, selected, 50)
  const currentCategory = categories.find(item => item.key === selected)
  const label = currentCategory?.label ?? 'Valor'

  return (
    <div className="space-y-5">
      <Header
        title="Clasificación"
        subtitle="Rankings por balance de economía, récord de combate y constancia"
        guildId={guildId}
      />

      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(item => {
          const active = selected === item.key
          return (
            <Link
              key={item.key}
              href={`/dashboard/leaderboard?category=${item.key}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>

      <LeaderboardTable rows={rows} label={label} />
    </div>
  )
}
