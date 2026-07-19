import Link from 'next/link'
import { Icon } from '@/components/Icon'

const links = [
  { href: '/dashboard', label: 'Overview', icon: 'CHART' },
  { href: '/dashboard/leaderboard', label: 'Leaderboard', icon: 'TROPHY' },
  { href: '/dashboard/users', label: 'Users', icon: 'SHIELD' },
  { href: '/dashboard/transactions', label: 'Transactions', icon: 'CANDY' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950 lg:block">
        <div className="flex items-center gap-3 text-lg font-bold">
          <Icon icon="mdi:discord" className="h-7 w-7 text-indigo-500" />
          Lulu CRM
        </div>
        <nav className="mt-10 space-y-2">
          {links.map(link => (
            <Link key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50">
              <Icon name={link.icon} className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
