interface StatCardProps {
  title: string
  value: string | number
  helper?: string
}

export function StatCard({
  title,
  value,
  helper,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
      <p className="text-xs font-medium text-zinc-400">
        {title}
      </p>
      <div className="mt-2 flex items-baseline">
        <span className="text-2xl font-bold tracking-tight text-zinc-100 tabular-nums">
          {value}
        </span>
      </div>
      {helper && (
        <p className="mt-1 text-xs text-zinc-400">
          {helper}
        </p>
      )}
    </div>
  )
}
