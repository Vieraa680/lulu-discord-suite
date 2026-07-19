import { Icon } from '@/components/Icon'

interface StatCardProps {
  title: string
  value: string | number
  icon: string
  tone?: string
  helper?: string
}

export function StatCard({ title, value, icon, tone = 'text-indigo-500', helper }: StatCardProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{value}</p>
        </div>
        <Icon name={icon} className={`h-7 w-7 ${tone}`} />
      </div>
      {helper ? <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{helper}</p> : null}
    </section>
  )
}
