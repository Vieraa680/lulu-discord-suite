'use client'

import { useState } from 'react'
import { dispelPolymorphia } from '@/app/actions'
import { Icon } from './Icon'

interface HexedUser {
  id: string
  discordId: string
  username: string
  currentForm: string
  minutesRemaining: number
}

interface PolymorphiaBannerProps {
  activeHexes: HexedUser[]
  guildId: string
}

export function PolymorphiaBanner({ activeHexes, guildId }: PolymorphiaBannerProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState<string[]>([])

  if (!activeHexes.length) return null

  const visibleHexes = activeHexes.filter(h => !dismissed.includes(h.discordId))
  if (!visibleHexes.length) return null

  const handleDispel = async (discordId: string) => {
    setLoadingId(discordId)
    const formData = new FormData()
    formData.append('discordId', discordId)
    formData.append('guildId', guildId)

    try {
      await dispelPolymorphia(formData)
      setDismissed(prev => [...prev, discordId])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
            <Icon icon="mdi:magic-staff" className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-200">
                Metamorfosis Activas ({visibleHexes.length})
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Jugadores transformados actualmente en el servidor
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {visibleHexes.map(hex => (
            <div
              key={hex.discordId}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-200"
            >
              <span className="font-medium text-zinc-100">{hex.username}</span>
              <span className="text-[11px] text-zinc-400 font-mono">({hex.currentForm}, {hex.minutesRemaining}m)</span>
              <button
                onClick={() => handleDispel(hex.discordId)}
                disabled={loadingId === hex.discordId}
                className="ml-1 rounded px-2 py-0.5 text-[11px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
              >
                {loadingId === hex.discordId ? '...' : 'Disipar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
