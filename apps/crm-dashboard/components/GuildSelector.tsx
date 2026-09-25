'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerGuild, selectGuild } from '@/app/actions'
import { Icon } from './Icon'

export interface GuildOption {
  id: string
  name: string
  iconUrl?: string | null
  isTest?: boolean
}

interface GuildSelectorProps {
  currentGuildId: string
  availableGuilds: GuildOption[]
}

export function GuildSelector({ currentGuildId, availableGuilds }: GuildSelectorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newGuildId, setNewGuildId] = useState('')
  const [loading, setLoading] = useState(false)

  const current = availableGuilds.find(g => g.id === currentGuildId) || {
    id: currentGuildId || '',
    name: currentGuildId ? `Servidor (${currentGuildId})` : 'Sin servidor seleccionado',
    isTest: false,
  }

  const handleSelect = async (guildId: string) => {
    if (guildId === currentGuildId) {
      setOpen(false)
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('guildId', guildId)
    await selectGuild(formData)
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  const handleAddGuild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGuildId.trim()) return
    setLoading(true)
    const formData = new FormData()
    formData.append('guildId', newGuildId.trim())
    await registerGuild(formData)
    setNewGuildId('')
    setShowAdd(false)
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative mt-3">
      {/* Current Selected Guild Card / Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 transition-colors hover:border-zinc-700 hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        <div className="flex items-center gap-2.5">
          {current.iconUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={current.iconUrl}
              alt=""
              className="h-7 w-7 rounded-lg object-cover shrink-0 border border-zinc-800"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-[10px] font-semibold text-zinc-300 shrink-0 border border-zinc-700/60">
              {current.name ? current.name.slice(0, 2).toUpperCase() : '??'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="font-medium text-zinc-200 truncate max-w-[110px]">
                {current.name}
              </span>
              <span
                className={`flex items-center gap-1 text-[10px] ${
                  current.id
                    ? current.isTest
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                    : 'text-zinc-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    current.id
                      ? current.isTest
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                      : 'bg-zinc-600'
                  }`}
                />
                {current.id ? (current.isTest ? 'Pruebas' : 'Activo') : 'Inactivo'}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-zinc-500 truncate max-w-[130px]">
                {current.id || 'Selecciona o añade un ID'}
              </span>
              <Icon
                icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                className="h-3.5 w-3.5 text-zinc-500 shrink-0"
              />
            </div>
          </div>
        </div>
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-xl shadow-black/80">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Cambiar de Servidor
          </div>

          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {availableGuilds.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-zinc-500">
                No hay servidores configurados. Añade un ID a continuación.
              </p>
            ) : (
              availableGuilds.map(guild => {
                const isSelected = guild.id === currentGuildId
                return (
                  <button
                    key={guild.id}
                    type="button"
                    onClick={() => handleSelect(guild.id)}
                    disabled={loading}
                    className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-zinc-800 text-white font-medium'
                        : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      {guild.iconUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={guild.iconUrl}
                          alt=""
                          className="h-6 w-6 rounded-full object-cover shrink-0 border border-zinc-800"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-semibold text-zinc-400 shrink-0">
                          {guild.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">{guild.name}</p>
                        <p className="font-mono text-[10px] text-zinc-500 truncate">{guild.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {guild.isTest && (
                        <span className="rounded bg-amber-950/60 px-1.5 py-0.5 text-[9px] font-medium text-amber-400 border border-amber-800/40">
                          Pruebas
                        </span>
                      )}
                      {isSelected && (
                        <Icon icon="mdi:check" className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Add Server Option */}
          <div className="border-t border-zinc-800/80 mt-1.5 pt-1.5">
            {!showAdd ? (
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              >
                <Icon icon="mdi:plus" className="h-3.5 w-3.5" />
                <span>Registrar ID de servidor</span>
              </button>
            ) : (
              <form onSubmit={handleAddGuild} className="p-1 space-y-1.5">
                <input
                  type="text"
                  value={newGuildId}
                  onChange={e => setNewGuildId(e.target.value)}
                  placeholder="ID de servidor (Snowflake)"
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-mono text-white placeholder-zinc-600 outline-none focus:border-violet-500"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="rounded px-2 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !newGuildId.trim()}
                    className="rounded bg-zinc-100 text-zinc-950 px-2 py-0.5 text-[10px] font-semibold hover:bg-white disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
