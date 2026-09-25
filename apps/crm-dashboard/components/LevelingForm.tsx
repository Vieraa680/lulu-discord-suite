'use client'

import React, { useState } from 'react'
import { updateLevelingConfig } from '@/app/actions'
import { Icon } from './Icon'
import { RoleSelect } from './RoleSelect'
import { ChannelSelect } from './ChannelSelect'
import { Input } from './Input'
import { Checkbox } from './Checkbox'
import type { DiscordGuildRole, DiscordGuildChannel } from '@/lib/dashboard-data'

export interface RoleMultiplier {
  roleId: string
  roleName: string
  multiplier: number
}

interface LevelingFormProps {
  guildId: string
  config: {
    xpEnabled: boolean
    xpPerMessageMin: number
    xpPerMessageMax: number
    xpCooldownSec: number
    xpExcludedChannels: string[]
    xpLevelUpChannelId: string | null
    voiceXpEnabled: boolean
    voiceXpPerMinute: number
    voiceXpMinMembers: number
    voiceXpRequiresUnmuted: boolean
    xpRoleMultipliers: unknown
  }
  roles: DiscordGuildRole[]
  channels: DiscordGuildChannel[]
}

export function LevelingForm({
  guildId,
  config,
  roles,
  channels,
}: LevelingFormProps) {
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  const [xpEnabled, setXpEnabled] = useState(config.xpEnabled)
  const [xpPerMessageMin, setXpPerMessageMin] = useState(config.xpPerMessageMin ?? 15)
  const [xpPerMessageMax, setXpPerMessageMax] = useState(config.xpPerMessageMax ?? 25)
  const [xpCooldownSec, setXpCooldownSec] = useState(config.xpCooldownSec ?? 60)
  const [xpLevelUpChannelId, setXpLevelUpChannelId] = useState(config.xpLevelUpChannelId || 'default')

  const [excludedChannels, setExcludedChannels] = useState<string[]>(
    Array.isArray(config.xpExcludedChannels) ? config.xpExcludedChannels : []
  )
  const [channelSearch, setChannelSearch] = useState('')

  const [voiceXpEnabled, setVoiceXpEnabled] = useState(config.voiceXpEnabled)
  const [voiceXpPerMinute, setVoiceXpPerMinute] = useState(config.voiceXpPerMinute ?? 10)
  const [voiceXpMinMembers, setVoiceXpMinMembers] = useState(config.voiceXpMinMembers ?? 2)
  const [voiceXpRequiresUnmuted, setVoiceXpRequiresUnmuted] = useState(config.voiceXpRequiresUnmuted ?? false)

  const initialMultipliers: RoleMultiplier[] = Array.isArray(config.xpRoleMultipliers)
    ? (config.xpRoleMultipliers as RoleMultiplier[])
    : []
  const [roleMultipliers, setRoleMultipliers] = useState<RoleMultiplier[]>(initialMultipliers)

  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [newMultiplier, setNewMultiplier] = useState('1.5')

  const handleAddMultiplier = () => {
    if (!selectedRoleId) return
    const targetRole = roles.find(r => r.id === selectedRoleId)
    const multNum = parseFloat(newMultiplier)
    if (isNaN(multNum) || multNum <= 0) return

    const updated = roleMultipliers.filter(m => m.roleId !== selectedRoleId)
    updated.push({
      roleId: selectedRoleId,
      roleName: targetRole ? targetRole.name : 'Rol',
      multiplier: Number(multNum.toFixed(2)),
    })

    setRoleMultipliers(updated)
    setSelectedRoleId('')
    setNewMultiplier('1.5')
  }

  const handleRemoveMultiplier = (roleId: string) => {
    setRoleMultipliers(roleMultipliers.filter(m => m.roleId !== roleId))
  }

  const handleToggleChannel = (channelId: string) => {
    if (excludedChannels.includes(channelId)) {
      setExcludedChannels(excludedChannels.filter(id => id !== channelId))
    } else {
      setExcludedChannels([...excludedChannels, channelId])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const formData = new FormData()
    formData.append('guildId', guildId)
    formData.append('xpEnabled', xpEnabled.toString())
    formData.append('xpPerMessageMin', xpPerMessageMin.toString())
    formData.append('xpPerMessageMax', xpPerMessageMax.toString())
    formData.append('xpCooldownSec', xpCooldownSec.toString())
    formData.append('xpExcludedChannels', JSON.stringify(excludedChannels))
    formData.append('xpLevelUpChannelId', xpLevelUpChannelId)
    formData.append('voiceXpEnabled', voiceXpEnabled.toString())
    formData.append('voiceXpPerMinute', voiceXpPerMinute.toString())
    formData.append('voiceXpMinMembers', voiceXpMinMembers.toString())
    formData.append('voiceXpRequiresUnmuted', voiceXpRequiresUnmuted.toString())
    formData.append('xpRoleMultipliers', JSON.stringify(roleMultipliers))

    const res = await updateLevelingConfig(formData)
    setFeedback(res)
    setLoading(false)
  }

  const filteredChannels = channels.filter(c =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase())
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium flex items-center gap-3 transition-all ${
            feedback.success
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
          }`}
        >
          <Icon
            icon={feedback.success ? 'mdi:check-circle' : 'mdi:alert-circle'}
            className="h-5 w-5 shrink-0"
          />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Chat XP */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Icon icon="mdi:message-text-outline" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">XP por Chat</h3>
              <p className="text-xs text-zinc-400">Puntos al mandar mensajes en el servidor</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={xpEnabled}
              onChange={e => setXpEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
            <span className="ml-3 text-xs text-zinc-300">
              {xpEnabled ? 'Activo' : 'Pausado'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input
            label="XP mínima por mensaje"
            type="number"
            min={1}
            max={500}
            value={xpPerMessageMin}
            onChange={e => setXpPerMessageMin(Number(e.target.value))}
            disabled={!xpEnabled}
            leftIcon="mdi:numeric"
          />

          <Input
            label="XP máxima por mensaje"
            type="number"
            min={1}
            max={1000}
            value={xpPerMessageMax}
            onChange={e => setXpPerMessageMax(Number(e.target.value))}
            disabled={!xpEnabled}
            leftIcon="mdi:numeric"
          />

          <Input
            label="Cooldown anti-spam"
            description="Segundos entre mensajes para volver a ganar puntos"
            type="number"
            min={0}
            max={3600}
            value={xpCooldownSec}
            onChange={e => setXpCooldownSec(Number(e.target.value))}
            disabled={!xpEnabled}
            leftIcon="mdi:timer-outline"
            suffix="seg"
          />
        </div>

        <div className="pt-1 max-w-md">
          <ChannelSelect
            label="Avisar al subir de nivel"
            value={xpLevelUpChannelId}
            onChange={setXpLevelUpChannelId}
            disabled={!xpEnabled}
            channels={channels}
            filterTypes={[0, 5]}
            specialOptions={[
              {
                value: 'default',
                label: 'Mismo canal donde escribió',
                icon: 'mdi:chat-processing-outline',
              },
              {
                value: 'dm',
                label: 'Por mensaje privado',
                icon: 'mdi:email-outline',
              },
              {
                value: 'none',
                label: 'No avisar',
                icon: 'mdi:bell-off-outline',
              },
            ]}
          />
        </div>
      </div>

      {/* Canales bloqueados */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-4">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Icon icon="mdi:cancel" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Canales bloqueados</h3>
            <p className="text-xs text-zinc-400">Canales donde no se puede ganar XP</p>
          </div>
        </div>

        {excludedChannels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {excludedChannels.map(channelId => {
              const ch = channels.find(c => c.id === channelId)
              return (
                <span
                  key={channelId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1 text-xs text-zinc-200"
                >
                  <Icon
                    icon={ch?.type === 2 ? 'mdi:volume-high' : 'mdi:pound'}
                    className="h-3.5 w-3.5 text-zinc-400"
                  />
                  <span>{ch ? ch.name : channelId}</span>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel(channelId)}
                    className="ml-1 text-zinc-400 hover:text-rose-400"
                  >
                    <Icon icon="mdi:close" className="h-3.5 w-3.5" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        <div className="space-y-2">
          <div className="relative max-w-sm">
            <Icon
              icon="mdi:magnify"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
            />
            <input
              type="text"
              placeholder="Buscar canal..."
              value={channelSearch}
              onChange={e => setChannelSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/50 p-2 space-y-1">
            {filteredChannels.length === 0 ? (
              <p className="p-3 text-center text-xs text-zinc-500">No hay canales con ese nombre.</p>
            ) : (
              filteredChannels.map(channel => {
                const isExcluded = excludedChannels.includes(channel.id)
                return (
                  <div
                    key={channel.id}
                    onClick={() => handleToggleChannel(channel.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      isExcluded
                        ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                        : 'hover:bg-zinc-800/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        icon={channel.type === 2 ? 'mdi:volume-high' : 'mdi:pound'}
                        className="h-4 w-4 text-zinc-400"
                      />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold uppercase ${
                        isExcluded
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {isExcluded ? 'Bloqueado' : 'Permitido'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Voice XP */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Icon icon="mdi:microphone" className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-sm">XP en Canales de Voz</h3>
              <p className="text-xs text-zinc-400">Puntos acumulados por participar en salas de voz</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={voiceXpEnabled}
              onChange={e => setVoiceXpEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            <span className="ml-3 text-xs text-zinc-300">
              {voiceXpEnabled ? 'Activo' : 'Pausado'}
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Input
            label="XP por minuto en voz"
            type="number"
            min={1}
            max={200}
            value={voiceXpPerMinute}
            onChange={e => setVoiceXpPerMinute(Number(e.target.value))}
            disabled={!voiceXpEnabled}
            leftIcon="mdi:numeric"
          />

          <Input
            label="Mínimo de personas en la sala"
            description="Evita sumar puntos estando solo en una sala vacía"
            type="number"
            min={1}
            max={20}
            value={voiceXpMinMembers}
            onChange={e => setVoiceXpMinMembers(Number(e.target.value))}
            disabled={!voiceXpEnabled}
            leftIcon="mdi:account-group"
            suffix="personas"
          />
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-300">
            <Icon icon="mdi:check-circle" className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Los usuarios ensordecidos (en Discord o por moderador) no suman puntos.</span>
          </div>

          <div className="pt-2 border-t border-zinc-800/80">
            <Checkbox
              checked={voiceXpRequiresUnmuted}
              onChange={setVoiceXpRequiresUnmuted}
              disabled={!voiceXpEnabled}
              label="Pedir micrófono abierto"
              description="También exige no estar muteado para sumar puntos"
            />
          </div>
        </div>
      </div>

      {/* Multiplicadores por Rol */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-5">
        <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Icon icon="mdi:crown-outline" className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-100 text-sm">Multiplicadores por Rol</h3>
            <p className="text-xs text-zinc-400">Bonus de XP para boosters, vips o roles especiales</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-end gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950/40">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Rol de Discord
            </label>
            <RoleSelect
              roles={roles}
              value={selectedRoleId}
              onChange={setSelectedRoleId}
              placeholder="Elegir rol..."
            />
          </div>

          <div className="w-full sm:w-36">
            <Input
              label="Multiplicador"
              type="number"
              step="0.1"
              min="1.0"
              max="10.0"
              value={newMultiplier}
              onChange={e => setNewMultiplier(e.target.value)}
              suffix="x"
              leftIcon="mdi:multiplication"
            />
          </div>

          <button
            type="button"
            onClick={handleAddMultiplier}
            disabled={!selectedRoleId}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-xs font-medium text-white transition-all cursor-pointer"
          >
            <Icon icon="mdi:plus" className="h-4 w-4" />
            <span>Agregar</span>
          </button>
        </div>

        {roleMultipliers.length === 0 ? (
          <p className="text-xs text-zinc-500 p-2 text-center">
            No hay multiplicadores asignados.
          </p>
        ) : (
          <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden">
            {roleMultipliers.map(item => {
              const roleObj = roles.find(r => r.id === item.roleId)
              const hexColor = roleObj?.hexColor || '#818cf8'

              return (
                <div
                  key={item.roleId}
                  className="flex items-center justify-between p-3 hover:bg-zinc-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: hexColor }}
                    />
                    <span className="text-xs font-medium text-zinc-200">
                      {roleObj ? roleObj.name : item.roleName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">
                      {item.multiplier}x
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMultiplier(item.roleId)}
                      className="text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Quitar"
                    >
                      <Icon icon="mdi:trash-can-outline" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Icon icon="mdi:content-save" className="h-4 w-4" />
              <span>Guardar cambios</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
