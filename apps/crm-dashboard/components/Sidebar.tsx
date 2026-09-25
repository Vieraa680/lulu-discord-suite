'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { GuildOption, GuildSelector } from './GuildSelector'
import { Icon } from './Icon'

interface SidebarProps {
  guildId: string
  availableGuilds: GuildOption[]
}

const navItems = [
  { href: '/dashboard', label: 'Resumen', icon: 'CHART' },
  { href: '/dashboard/users', label: 'Jugadores', icon: 'SHIELD' },
  { href: '/dashboard/leaderboard', label: 'Clasificación', icon: 'TROPHY' },
  { href: '/dashboard/transactions', label: 'Transacciones', icon: 'CANDY' },
  { href: '/dashboard/items', label: 'Catálogo', icon: 'PACKAGE' },
  { href: '/dashboard/levels', label: 'Niveles y Temporadas', icon: 'MEDAL' },
  { href: '/dashboard/settings', label: 'Configuración', icon: 'ALARM' },
]

export function Sidebar({ guildId, availableGuilds }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isExactActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Top Navigation */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 font-bold text-sm">
            L
          </div>
          <span className="font-semibold text-sm text-zinc-100">Lulu CRM</span>
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-100"
          aria-label="Abrir menú"
        >
          <Icon icon={mobileOpen ? 'mdi:close' : 'mdi:menu'} className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 p-4 transition-transform duration-150 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* App Title */}
        <div className="flex items-center justify-between px-2 py-3 border-b border-zinc-900">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 font-semibold text-xs border border-zinc-700">
              L
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-zinc-100">Lulu Suite</span>
                <span className="rounded bg-zinc-900 px-1.5 py-0.2 text-[10px] font-medium text-zinc-400 border border-zinc-800">
                  CRM
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Guild Selector Switcher */}
        <GuildSelector currentGuildId={guildId} availableGuilds={availableGuilds} />

        {/* Nav Items */}
        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = isExactActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-800/80 text-white font-semibold'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`h-4 w-4 ${active ? 'text-violet-400' : 'text-zinc-500'}`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
