interface LeaderboardRow {
  rank: number
  discordId: string
  username: string
  value: number
}

export function LeaderboardTable({ rows, label }: { rows: LeaderboardRow[]; label: string }) {
  if (rows.length === 0) {
    return <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-800">No leaderboard data yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            <th className="px-5 py-3">Rank</th>
            <th className="px-5 py-3">User</th>
            <th className="px-5 py-3 text-right">{label}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
          {rows.map(row => (
            <tr key={row.discordId}>
              <td className="px-5 py-4 font-semibold">#{row.rank}</td>
              <td className="px-5 py-4">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{row.username}</div>
                <div className="text-xs text-zinc-500">{row.discordId}</div>
              </td>
              <td className="px-5 py-4 text-right font-semibold">{row.value.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
