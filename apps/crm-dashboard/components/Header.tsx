'use client'

import { useState } from 'react'
import { Icon } from './Icon'

interface HeaderProps {
  title: string
  subtitle: string
  guildId: string
  actionSlot?: React.ReactNode
}

export function Header({ title, subtitle, guildId, actionSlot }: HeaderProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyGuild = () => {
    if (!guildId) return
    navigator.clipboard.writeText(guildId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <header className="flex flex-col gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-100 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-xs text-zinc-400">
          {subtitle}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {guildId && (
          <button
            onClick={handleCopyGuild}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
            title="Copiar ID de Servidor"
          >
            <span className="font-mono text-[11px]">{guildId}</span>
            <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} className="h-3.5 w-3.5 text-zinc-400" />
          </button>
        )}
        {actionSlot}
      </div>
    </header>
  )
}
