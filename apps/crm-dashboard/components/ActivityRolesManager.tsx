'use client'

import { useState } from 'react'
import {
  createActivityRoleRule,
  toggleActivityRoleRule,
  deleteActivityRoleRule,
  createDiscordRole,
  ActionResponse,
} from '@/app/actions'
import { DiscordGuildRole, DiscordGuildChannel } from '@/lib/dashboard-data'
import { Icon } from './Icon'
import { Checkbox } from './Checkbox'
import { Input } from './Input'
import { RoleSelect } from './RoleSelect'
import { matchesDiscordChannel } from '@/lib/discord-text'

interface ActivityRoleRuleItem {
  id: string
  guildId: string
  name: string | null
  roleId: string
  roleName: string | null
  roleColor: string | null
  channelId: string | null
  channelName: string | null
  channelIds?: string[]
  messagesReq: number
  cooldownSec: number
  isEnabled: boolean
  createdAt: Date
}

interface ActivityRolesManagerProps {
  guildId: string
  rules: ActivityRoleRuleItem[]
  availableRoles: DiscordGuildRole[]
  availableChannels: DiscordGuildChannel[]
}

export function ActivityRolesManager({
  guildId,
  rules,
  availableRoles: initialRoles,
  availableChannels,
}: ActivityRolesManagerProps) {
  const [rolesList, setRolesList] = useState<DiscordGuildRole[]>(initialRoles)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<ActionResponse | null>(null)

  // Creation of Discord Role inside modal
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#a855f7')
  const [newRoleHoist, setNewRoleHoist] = useState(false)
  const [creatingRoleLoading, setCreatingRoleLoading] = useState(false)

  // Rule Form state
  const [selectedRoleId, setSelectedRoleId] = useState(rolesList[0]?.id || '')
  const [channelMode, setChannelMode] = useState<'all' | 'specific'>('all')
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([])
  const [channelSearchQuery, setChannelSearchQuery] = useState('')
  const [messagesReq, setMessagesReq] = useState<number>(50)
  const [cooldownSec, setCooldownSec] = useState<number>(60)
  const [ruleName, setRuleName] = useState('')

  // Quick channel toggle helper
  const handleToggleChannel = (chanId: string) => {
    setSelectedChannelIds(prev =>
      prev.includes(chanId) ? prev.filter(id => id !== chanId) : [...prev, chanId]
    )
  }

  const isChannelSearching = channelSearchQuery.trim().length > 0
  const filteredChannels = isChannelSearching
    ? availableChannels.filter(c => matchesDiscordChannel(c.name, channelSearchQuery))
    : availableChannels

  // Channel selection helpers (contextual to search filter)
  const isAllChannelsSelected = isChannelSearching
    ? filteredChannels.length > 0 && filteredChannels.every(c => selectedChannelIds.includes(c.id))
    : availableChannels.length > 0 && selectedChannelIds.length === availableChannels.length

  const isSomeChannelsSelected = isChannelSearching
    ? filteredChannels.some(c => selectedChannelIds.includes(c.id)) && !isAllChannelsSelected
    : selectedChannelIds.length > 0 && selectedChannelIds.length < availableChannels.length

  const handleToggleAllChannels = () => {
    if (isChannelSearching) {
      if (isAllChannelsSelected) {
        const filteredIds = new Set(filteredChannels.map(c => c.id))
        setSelectedChannelIds(prev => prev.filter(id => !filteredIds.has(id)))
      } else {
        const combined = new Set([...selectedChannelIds, ...filteredChannels.map(c => c.id)])
        setSelectedChannelIds(Array.from(combined))
      }
    } else {
      if (isAllChannelsSelected) {
        setSelectedChannelIds([])
      } else {
        setSelectedChannelIds(availableChannels.map(c => c.id))
      }
    }
  }

  // Create role on Discord API directly from CRM
  const handleCreateDiscordRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoleName.trim()) {
      setFeedback({ success: false, message: 'Ingresa un nombre para el nuevo rol.' })
      return
    }

    setCreatingRoleLoading(true)
    setFeedback(null)

    const formData = new FormData()
    formData.append('guildId', guildId)
    formData.append('name', newRoleName.trim())
    formData.append('color', newRoleColor)
    formData.append('hoist', newRoleHoist ? 'true' : 'false')

    const res = await createDiscordRole(formData)
    setCreatingRoleLoading(false)
    setFeedback(res)

    if (res.success && res.role) {
      const createdRole = res.role
      setRolesList(prev => [createdRole, ...prev])
      setSelectedRoleId(createdRole.id)
      setIsCreatingRole(false)
      setNewRoleName('')
    }
  }

  // Create rule in database
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const roleObj = rolesList.find(r => r.id === selectedRoleId)

    if (!ruleName.trim()) {
      setFeedback({ success: false, message: 'El nombre de la regla es obligatorio.' })
      setLoading(false)
      return
    }

    if (!selectedRoleId || !roleObj) {
      setFeedback({ success: false, message: 'Debes seleccionar un rol de Discord.' })
      setLoading(false)
      return
    }

    if (channelMode === 'specific' && selectedChannelIds.length === 0) {
      setFeedback({
        success: false,
        message: 'Por favor selecciona al menos un canal para la regla.',
      })
      setLoading(false)
      return
    }

    let effectiveChannelName: string = 'Todo el servidor'
    let effectiveChannelIds: string[] = []

    if (channelMode === 'specific') {
      effectiveChannelIds = selectedChannelIds
      if (selectedChannelIds.length === 1) {
        const chan = availableChannels.find(c => c.id === selectedChannelIds[0])
        effectiveChannelName = chan ? `#${chan.name}` : 'Canal seleccionado'
      } else {
        effectiveChannelName = `${selectedChannelIds.length} canales`
      }
    }

    const formData = new FormData()
    formData.append('guildId', guildId)
    formData.append('name', ruleName.trim())
    formData.append('roleId', roleObj.id)
    formData.append('roleName', roleObj.name)
    if (roleObj.hexColor) formData.append('roleColor', roleObj.hexColor)
    formData.append('channelName', effectiveChannelName)
    formData.append('channelIds', JSON.stringify(effectiveChannelIds))
    formData.append('messagesReq', messagesReq.toString())
    formData.append('cooldownSec', cooldownSec.toString())

    const res = await createActivityRoleRule(formData)
    setFeedback(res)
    setLoading(false)

    if (res.success) {
      setIsModalOpen(false)
      setRuleName('')
      setSelectedChannelIds([])
      setChannelSearchQuery('')
      setChannelMode('all')
      setMessagesReq(50)
      setCooldownSec(60)
    }
  }

  const handleToggle = async (ruleId: string, currentStatus: boolean) => {
    const formData = new FormData()
    formData.append('id', ruleId)
    formData.append('isEnabled', (!currentStatus).toString())
    const res = await toggleActivityRoleRule(formData)
    setFeedback(res)
  }

  const handleDelete = async (ruleId: string, roleDisplayName: string) => {
    if (!confirm(`¿Estás seguro de eliminar la regla para el rol "${roleDisplayName}"?`)) {
      return
    }

    const formData = new FormData()
    formData.append('id', ruleId)
    const res = await deleteActivityRoleRule(formData)
    setFeedback(res)
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Reglas de Asignación Automática</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Otorga roles de Discord a los miembros a medida que chatean en la comunidad.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true)
            setIsCreatingRole(false)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 transition-all hover:bg-purple-500 active:scale-[0.98]"
        >
          <Icon icon="mdi:plus" className="h-4 w-4" />
          <span>Añadir Nueva Regla</span>
        </button>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-xl border p-3.5 text-xs font-medium ${
            feedback.success
              ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-300'
              : 'border-red-800/50 bg-red-950/20 text-red-300'
          }`}
        >
          <Icon
            icon={feedback.success ? 'mdi:check-circle' : 'mdi:alert-circle'}
            className="h-4 w-4 shrink-0"
          />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-purple-400 shadow-inner">
            <Icon icon="mdi:shield-star-outline" className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-zinc-200">No hay reglas de roles activas</h3>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Crea roles con colores personalizados y define en qué canales debe chatear la gente para ganarlos.
          </p>
          <button
            onClick={() => {
              setIsModalOpen(true)
              setIsCreatingRole(false)
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 hover:text-white"
          >
            <Icon icon="mdi:plus" className="h-4 w-4" />
            Crear primera regla
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map(rule => {
            const roleColorHex = rule.roleColor || '#a855f7'
            const hasMultipleChannels = rule.channelIds && rule.channelIds.length > 0

            return (
              <div
                key={rule.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all ${
                  rule.isEnabled
                    ? 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 shadow-sm'
                    : 'border-zinc-900 bg-zinc-950/40 opacity-60'
                }`}
              >
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-100 truncate">
                      {rule.name || rule.roleName || 'Regla de Rol'}
                    </h3>

                    <button
                      onClick={() => handleToggle(rule.id, rule.isEnabled)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                        rule.isEnabled
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/50'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                      }`}
                      title={rule.isEnabled ? 'Pausar regla' : 'Activar regla'}
                    >
                      {rule.isEnabled ? 'Activo' : 'Pausado'}
                    </button>
                  </div>

                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border shadow-xs"
                      style={{
                        backgroundColor: `${roleColorHex}15`,
                        borderColor: `${roleColorHex}40`,
                        color: roleColorHex,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: roleColorHex }}
                      />
                      <span className="truncate max-w-[190px] font-medium">
                        {rule.roleName || 'Rol de Discord'}
                      </span>
                    </span>
                  </div>

                  {/* Details */}
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <Icon icon="mdi:message-text-outline" className="h-3.5 w-3.5" />
                        Requerimiento:
                      </span>
                      <span className="font-semibold text-zinc-200">
                        {rule.messagesReq.toLocaleString()} {rule.messagesReq === 1 ? 'mensaje' : 'mensajes'}
                      </span>
                    </div>

                    <div className="flex items-start justify-between text-zinc-400 gap-2">
                      <span className="flex items-center gap-1.5 text-zinc-500 shrink-0">
                        <Icon icon="mdi:pound" className="h-3.5 w-3.5" />
                        Canales:
                      </span>
                      <span className="font-medium text-zinc-300 text-right truncate max-w-[170px]">
                        {hasMultipleChannels ? (
                          rule.channelIds!.length === 1 ? (
                            availableChannels.find(c => c.id === rule.channelIds![0]) ? (
                              `#${availableChannels.find(c => c.id === rule.channelIds![0])!.name}`
                            ) : (
                              'Canal seleccionado'
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] text-zinc-300 border border-zinc-700">
                              <Icon icon="mdi:layers-outline" className="h-3 w-3" />
                              {rule.channelIds!.length} canales
                            </span>
                          )
                        ) : rule.channelName ? (
                          rule.channelName
                        ) : (
                          'Todo el servidor'
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-1.5 text-zinc-500">
                        <Icon icon="mdi:timer-sand" className="h-3.5 w-3.5" />
                        Anti-spam:
                      </span>
                      <span className="text-zinc-300">
                        {rule.cooldownSec}s de espera
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-zinc-800/60 pt-3 text-[11px] text-zinc-500">
                  <span>
                    {new Date(rule.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>

                  <button
                    onClick={() => handleDelete(rule.id, rule.roleName || 'este rol')}
                    className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                    title="Eliminar regla"
                  >
                    <Icon icon="mdi:trash-can-outline" className="h-3.5 w-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Main Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-950/60 text-purple-400 border border-purple-800/40">
                  <Icon icon="mdi:medal" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Nueva Regla de Rol por Actividad</h3>
                  <p className="text-[11px] text-zinc-500">Configura la meta, rol y canales de conteo</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setChannelSearchQuery('')
                }}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
              >
                <Icon icon="mdi:close" className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-form: Create Discord Role with Color Picker */}
            {isCreatingRole ? (
              <div className="mt-5 rounded-2xl border border-purple-800/50 bg-purple-950/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
                    <Icon icon="mdi:palette-outline" className="h-4 w-4 text-purple-400" />
                    <span>Crear Nuevo Rol en Discord</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingRole(false)}
                    className="text-[11px] text-zinc-400 hover:text-white"
                  >
                    Volver a lista
                  </button>
                </div>

                <form onSubmit={handleCreateDiscordRole} className="mt-3.5 space-y-3.5">
                  <Input
                    label="Nombre del Rol"
                    type="text"
                    required
                    placeholder="Ej. Invocador Fanático"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    leftIcon="mdi:shield-account-outline"
                  />

                  {/* Color Picker */}
                  <div>
                    <label className="text-[11px] font-medium text-zinc-300">
                      Color del Rol
                    </label>
                    <div className="mt-1.5 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2">
                      <div
                        className="h-6 w-6 rounded-full shrink-0 border border-white/20 shadow-sm"
                        style={{ backgroundColor: newRoleColor }}
                      />
                      <input
                        type="color"
                        value={newRoleColor}
                        onChange={e => setNewRoleColor(e.target.value)}
                        className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                        title="Abrir paleta de colores"
                      />
                      <span className="text-xs text-zinc-400">Haz clic para elegir el color</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Checkbox
                      checked={newRoleHoist}
                      onChange={setNewRoleHoist}
                      label="Mostrar miembros de este rol por separado"
                      description="Agrupa a los miembros en una categoría visual en la lista de Discord"
                      size="sm"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreatingRole(false)}
                      className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creatingRoleLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-900/40 hover:bg-purple-500 disabled:opacity-50"
                    >
                      {creatingRoleLoading ? (
                        <>
                          <Icon icon="mdi:loading" className="h-3.5 w-3.5 animate-spin" />
                          <span>Creando en Discord...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="mdi:check" className="h-3.5 w-3.5" />
                          <span>Crear Rol</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : null}

            {/* Rule Configuration Form */}
            <form onSubmit={handleCreateRule} className="mt-5 space-y-4">
              <Input
                label="Nombre de la Regla"
                type="text"
                required
                placeholder="Ej. Invocadores Activos de General y Memes"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                leftIcon="mdi:tag-outline"
              />

              {/* Role Selection with Searchable Combobox */}
              <RoleSelect
                label="Rol de Discord a Otorgar"
                roles={rolesList}
                value={selectedRoleId}
                onChange={setSelectedRoleId}
                onCreateNew={!isCreatingRole ? () => setIsCreatingRole(true) : undefined}
                placeholder="Selecciona un rol de Discord..."
              />

              {/* Channel Scope Selection: All vs Specific (Multiple) */}
              <div>
                <label className="text-xs font-medium text-zinc-300">
                  Ámbito de Conteo de Mensajes
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChannelMode('all')
                      setSelectedChannelIds([])
                      setChannelSearchQuery('')
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                      channelMode === 'all'
                        ? 'border-purple-500 bg-purple-950/30 text-white font-semibold'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <Icon icon="mdi:earth" className="h-4 w-4 text-purple-400" />
                    <span>Todo el servidor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannelMode('specific')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                      channelMode === 'specific'
                        ? 'border-purple-500 bg-purple-950/30 text-white font-semibold'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                    }`}
                  >
                    <Icon icon="mdi:pound" className="h-4 w-4 text-purple-400" />
                    <span>Varios canales</span>
                  </button>
                </div>

                {/* Multiple Channel Selector Box with Search */}
                {channelMode === 'specific' && (
                  <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2.5">
                    {/* Search Filter Bar */}
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                        <Icon icon="mdi:magnify" className="h-3.5 w-3.5" />
                      </div>
                      <input
                        type="text"
                        value={channelSearchQuery}
                        onChange={e => setChannelSearchQuery(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Escape') setChannelSearchQuery('')
                        }}
                        placeholder="Buscar canal por nombre..."
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 py-1.5 pl-8 pr-7 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500 focus:bg-zinc-950"
                      />
                      {channelSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setChannelSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500 hover:text-zinc-300"
                          title="Limpiar búsqueda (Esc)"
                        >
                          <Icon icon="mdi:close-circle" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Header with Contextual Select All / Deselect All */}
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                      <Checkbox
                        checked={isAllChannelsSelected}
                        indeterminate={isSomeChannelsSelected}
                        onChange={handleToggleAllChannels}
                        label={
                          <span className="text-[11px] font-medium text-zinc-300">
                            {isChannelSearching ? `Seleccionar visibles (${filteredChannels.length})` : 'Seleccionar todos'}
                          </span>
                        }
                        size="sm"
                        disabled={filteredChannels.length === 0}
                      />
                      <span className="text-[11px] font-medium text-purple-300 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-md tabular-nums">
                        {selectedChannelIds.length} de {availableChannels.length} seleccionados
                      </span>
                    </div>

                    {/* Channels List */}
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                      {availableChannels.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-3 text-center">No se encontraron canales de texto en el servidor.</p>
                      ) : filteredChannels.length === 0 ? (
                        <div className="py-5 text-center">
                          <p className="text-xs text-zinc-400">
                            No hay canales que coincidan con <span className="font-semibold text-zinc-200">«{channelSearchQuery}»</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => setChannelSearchQuery('')}
                            className="mt-1.5 text-[11px] font-medium text-purple-400 hover:text-purple-300 hover:underline"
                          >
                            Limpiar búsqueda
                          </button>
                        </div>
                      ) : (
                        filteredChannels.map(chan => {
                          const checked = selectedChannelIds.includes(chan.id)
                          return (
                            <Checkbox
                              key={chan.id}
                              checked={checked}
                              onChange={() => handleToggleChannel(chan.id)}
                              label={
                                <span className="flex items-center gap-1.5 font-medium text-xs">
                                  <span className="text-zinc-500 font-mono">#</span>
                                  <span>{chan.name}</span>
                                </span>
                              }
                              size="sm"
                              containerClassName={`w-full flex items-center rounded-lg px-2.5 py-1.5 transition-colors ${
                                checked
                                  ? 'bg-purple-950/30 border border-purple-800/30 text-purple-200'
                                  : 'hover:bg-zinc-800/70 border border-transparent text-zinc-300'
                              }`}
                            />
                          )
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement & Anti-Spam Cooldown */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Mensajes Requeridos"
                  description="Mínimo acumulado para rol"
                  type="number"
                  min={1}
                  max={100000}
                  step={10}
                  required
                  value={messagesReq}
                  onChange={e => setMessagesReq(Math.max(1, parseInt(e.target.value) || 1))}
                  leftIcon="mdi:message-text-outline"
                />

                <Input
                  label="Espera Anti-Spam"
                  description="Enfriamiento entre mensajes"
                  type="number"
                  min={5}
                  max={3600}
                  step={5}
                  required
                  value={cooldownSec}
                  onChange={e => setCooldownSec(Math.max(5, parseInt(e.target.value) || 5))}
                  leftIcon="mdi:timer-sand"
                  suffix="seg"
                />
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-zinc-800/80 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setChannelSearchQuery('')
                  }}
                  className="rounded-xl border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-900/30 hover:bg-purple-500 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Icon icon="mdi:loading" className="h-4 w-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Crear Regla</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
