'use client'

import { useState } from 'react'
import { updateGuildConfig } from '@/app/actions'
import { Icon } from './Icon'

interface SettingsFormProps {
  config: {
    id: string
    guildId: string
    veteranRoleName: string
    butterflyMultiplier: number
    candyMultiplier: number
    polymorphiaMinBet: number
    polymorphiaMaxBet: number
    adminRoleId: string | null
    logChannelId: string | null
    butterflyExcludedChannels: string[]
  }
}

export function SettingsForm({ config }: SettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  const [veteranRole, setVeteranRole] = useState(config.veteranRoleName)
  const [candyMulti, setCandyMulti] = useState(config.candyMultiplier)
  const [butterflyMulti, setButterflyMulti] = useState(config.butterflyMultiplier)
  const [minBet, setMinBet] = useState(config.polymorphiaMinBet)
  const [maxBet, setMaxBet] = useState(config.polymorphiaMaxBet)
  const [adminRole, setAdminRole] = useState(config.adminRoleId || '')
  const [logChannel, setLogChannel] = useState(config.logChannelId || '')
  const [excludedChannels, setExcludedChannels] = useState(config.butterflyExcludedChannels.join(', '))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const formData = new FormData()
    formData.append('guildId', config.guildId)
    formData.append('veteranRoleName', veteranRole)
    formData.append('candyMultiplier', candyMulti.toString())
    formData.append('butterflyMultiplier', butterflyMulti.toString())
    formData.append('polymorphiaMinBet', minBet.toString())
    formData.append('polymorphiaMaxBet', maxBet.toString())
    formData.append('adminRoleId', adminRole)
    formData.append('logChannelId', logChannel)
    formData.append('butterflyExcludedChannels', excludedChannels)

    const res = await updateGuildConfig(formData)
    setFeedback(res)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-medium flex items-center gap-2 ${
            feedback.success
              ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-300'
              : 'border-red-800/50 bg-red-950/20 text-red-300'
          }`}
        >
          <Icon icon={feedback.success ? 'mdi:check-circle' : 'mdi:alert-circle'} className="h-4 w-4 shrink-0" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Section 1: Multipliers */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Economía y Multiplicadores</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Factor de recompensas base del servidor</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-400">
              Multiplicador de Caramelos
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10.0"
              value={candyMulti}
              onChange={e => setCandyMulti(parseFloat(e.target.value) || 1.0)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              Multiplicador de Mariposas
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="10.0"
              value={butterflyMulti}
              onChange={e => setButterflyMulti(parseFloat(e.target.value) || 1.0)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Polymorphia Rules */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Límites de Apuestas en Polymorphia</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Rango de apuestas permitido para duelos entre miembros</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-400">
              Apuesta Mínima
            </label>
            <input
              type="number"
              min="1"
              value={minBet}
              onChange={e => setMinBet(parseInt(e.target.value, 10) || 1)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              Apuesta Máxima
            </label>
            <input
              type="number"
              min="1"
              value={maxBet}
              onChange={e => setMaxBet(parseInt(e.target.value, 10) || 1000)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Roles & Channels */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-sm font-semibold text-zinc-100">Roles y Canales de Discord</h2>
        <p className="text-xs text-zinc-500 mt-0.5">Identificadores de Discord para auditoría y restricciones</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-zinc-400">
              Rol de Invocador Veterano
            </label>
            <input
              type="text"
              value={veteranRole}
              onChange={e => setVeteranRole(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              ID Rol Administrador
            </label>
            <input
              type="text"
              value={adminRole}
              onChange={e => setAdminRole(e.target.value)}
              placeholder="Snowflake ID de Discord"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white font-mono placeholder-zinc-600 outline-none focus:border-zinc-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-zinc-400">
              ID Canal de Logs
            </label>
            <input
              type="text"
              value={logChannel}
              onChange={e => setLogChannel(e.target.value)}
              placeholder="Snowflake ID del canal de Discord"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white font-mono placeholder-zinc-600 outline-none focus:border-zinc-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-zinc-400">
              Canales Excluidos de Mariposas (IDs separados por coma)
            </label>
            <input
              type="text"
              value={excludedChannels}
              onChange={e => setExcludedChannels(e.target.value)}
              placeholder="123456789, 987654321"
              className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white font-mono placeholder-zinc-600 outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      </section>

      {/* Submit Button */}
      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-zinc-100 text-zinc-950 px-4 py-2 text-xs font-semibold hover:bg-white transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  )
}
