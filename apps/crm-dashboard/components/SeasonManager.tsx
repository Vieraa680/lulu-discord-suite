'use client'

import React, { useState } from 'react'
import type { SeasonsData, DiscordGuildRole } from '@/lib/dashboard-data'
import { saveSeason, triggerSeasonRotation, ActionResponse } from '@/app/actions'
import { Icon } from './Icon'
import { RoleSelect } from './RoleSelect'
import { Input } from './Input'

interface SeasonManagerProps {
  guildId: string
  seasonsData: SeasonsData
  roles: DiscordGuildRole[]
}

interface TierConfig {
  tier: number
  levelReq: number
  roleId: string
  isTrophy: boolean
}

const DEFAULT_TIERS: TierConfig[] = [
  { tier: 1, levelReq: 5, roleId: '', isTrophy: false },
  { tier: 2, levelReq: 10, roleId: '', isTrophy: false },
  { tier: 3, levelReq: 15, roleId: '', isTrophy: false },
  { tier: 4, levelReq: 20, roleId: '', isTrophy: false },
  { tier: 5, levelReq: 30, roleId: '', isTrophy: true },
]

export function SeasonManager({ guildId, seasonsData, roles }: SeasonManagerProps) {
  const { activeSeason, upcomingSeason, pastSeasons } = seasonsData

  const [modalMode, setModalMode] = useState<'create_active' | 'create_upcoming' | 'edit_active' | 'edit_upcoming' | null>(null)
  const [seasonName, setSeasonName] = useState('')
  const [endDate, setEndDate] = useState('')
  const [tiers, setTiers] = useState<TierConfig[]>(DEFAULT_TIERS)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<ActionResponse | null>(null)

  // Early rotation modal
  const [confirmRotateOpen, setConfirmRotateOpen] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [rotateFeedback, setRotateFeedback] = useState<ActionResponse | null>(null)

  // Helper to open modal for editing or creating
  const openModal = (mode: 'create_active' | 'create_upcoming' | 'edit_active' | 'edit_upcoming') => {
    setFeedback(null)
    setModalMode(mode)

    const targetSeason = mode.includes('active') ? activeSeason : upcomingSeason

    if (targetSeason) {
      setSeasonName(targetSeason.name)
      const dateStr = new Date(targetSeason.endDate).toISOString().slice(0, 16)
      setEndDate(dateStr)

      const mappedTiers: TierConfig[] = [1, 2, 3, 4, 5].map(t => {
        const found = targetSeason.rewards.find(r => r.tier === t)
        return {
          tier: t,
          levelReq: found?.levelReq ?? (t * 5 === 25 ? 30 : t * 5),
          roleId: found?.roleId ?? '',
          isTrophy: t === 5,
        }
      })
      setTiers(mappedTiers)
    } else {
      const now = new Date()
      const nextMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0))
      setSeasonName(mode === 'create_active' ? `Temporada ${getMonthName(now.getUTCMonth())}` : `Temporada ${getMonthName(now.getUTCMonth() + 1)}`)
      setEndDate(nextMonthFirst.toISOString().slice(0, 16))
      setTiers(DEFAULT_TIERS.map(t => ({ ...t, roleId: roles[0]?.id || '' })))
    }
  }

  const closeModal = () => {
    setModalMode(null)
    setFeedback(null)
  }

  const handleTierRoleChange = (tierNumber: number, roleId: string) => {
    setTiers(prev => prev.map(t => (t.tier === tierNumber ? { ...t, roleId } : t)))
  }

  const handleTierLevelChange = (tierNumber: number, levelReq: number) => {
    setTiers(prev => prev.map(t => (t.tier === tierNumber ? { ...t, levelReq } : t)))
  }

  const handleSaveSeason = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)

    const isUpcoming = modalMode?.includes('upcoming')
    const seasonId = (isUpcoming ? upcomingSeason?.id : activeSeason?.id) || ''
    const status = isUpcoming ? 'SCHEDULED' : 'ACTIVE'

    const rewardsPayload = tiers.map(t => {
      const role = roles.find(r => r.id === t.roleId)
      return {
        tier: t.tier,
        levelReq: t.levelReq,
        roleId: t.roleId,
        roleName: role?.name || '',
        roleColor: role?.hexColor || '',
        isTrophy: t.tier === 5,
      }
    })

    const formData = new FormData()
    formData.append('guildId', guildId)
    if (seasonId) formData.append('seasonId', seasonId)
    formData.append('name', seasonName)
    formData.append('status', status)
    formData.append('endDate', new Date(endDate).toISOString())
    formData.append('rewards', JSON.stringify(rewardsPayload))

    const res = await saveSeason(formData)
    setLoading(false)
    setFeedback(res)

    if (res.success) {
      setTimeout(() => {
        closeModal()
      }, 900)
    }
  }

  const handleTriggerRotation = async () => {
    if (!activeSeason) return
    setRotating(true)
    setRotateFeedback(null)

    const formData = new FormData()
    formData.append('guildId', guildId)
    formData.append('seasonId', activeSeason.id)

    const res = await triggerSeasonRotation(formData)
    setRotating(false)
    setRotateFeedback(res)

    if (res.success) {
      setTimeout(() => {
        setConfirmRotateOpen(false)
        setRotateFeedback(null)
      }, 1500)
    }
  }

  return (
    <div className="space-y-6">
      {/* Temporada Activa Card */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-lg font-semibold text-zinc-100">
                {activeSeason ? activeSeason.name : 'Temporada Mensual'}
              </h2>
              {activeSeason && (
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                  Activa
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {activeSeason
                ? `Finaliza automáticamente el ${formatDate(activeSeason.endDate)}. Al concluir, se borran los roles 1-4, el rol 5 queda permanente y la XP se reinicia a 0.`
                : 'No hay ninguna temporada activa configurada en este momento.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSeason ? (
              <>
                <button
                  type="button"
                  onClick={() => openModal('edit_active')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  <Icon icon="mdi:pencil-outline" className="h-3.5 w-3.5" />
                  Editar roles
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRotateOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-900/60 transition-colors"
                  title="Cerrar la temporada ahora y reiniciar XP"
                >
                  <Icon icon="mdi:refresh" className="h-3.5 w-3.5" />
                  Finalizar temporada ahora
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openModal('create_active')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                <Icon icon="mdi:plus" className="h-4 w-4" />
                Iniciar Temporada
              </button>
            )}
          </div>
        </div>

        {/* Roles Tiers Display */}
        {activeSeason && (
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Roles y Recompensas de la Temporada
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map(tierNum => {
                const reward = activeSeason.rewards.find(r => r.tier === tierNum)
                const isTrophy = tierNum === 5
                return (
                  <div
                    key={tierNum}
                    className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 ${
                      isTrophy
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-zinc-800 bg-zinc-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-400">
                        Tier {tierNum}
                      </span>
                      {isTrophy ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                          <Icon icon="mdi:trophy-outline" className="h-3 w-3" />
                          Permanente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/60">
                          <Icon icon="mdi:timer-sand" className="h-3 w-3" />
                          Temporal
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-zinc-200">
                        Nivel {reward?.levelReq ?? (tierNum * 5 === 25 ? 30 : tierNum * 5)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: reward?.roleColor || '#71717a' }}
                        />
                        <span className="text-xs text-zinc-100 font-medium truncate">
                          {reward?.roleName || 'Rol no asignado'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-500">
                      {isTrophy
                        ? 'Queda para siempre como trofeo'
                        : 'Se borra de Discord al terminar el mes'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Próxima Temporada (Mes siguiente) */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon icon="mdi:calendar-clock" className="h-4 w-4 text-violet-400" />
              <h2 className="text-base font-semibold text-zinc-100">
                {upcomingSeason ? upcomingSeason.name : 'Próxima Temporada (Mes Siguiente)'}
              </h2>
              {upcomingSeason && (
                <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-400 border border-violet-500/20">
                  Programada
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Deja listos los 5 roles que creaste en Discord para el mes que viene. Se activarán solos en cuanto termine la temporada actual.
            </p>
          </div>

          <div>
            {upcomingSeason ? (
              <button
                type="button"
                onClick={() => openModal('edit_upcoming')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Icon icon="mdi:pencil-outline" className="h-3.5 w-3.5" />
                Modificar roles programados
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openModal('create_upcoming')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Icon icon="mdi:plus" className="h-3.5 w-3.5" />
                Programar Próximo Mes
              </button>
            )}
          </div>
        </div>

        {upcomingSeason && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map(tierNum => {
              const reward = upcomingSeason.rewards.find(r => r.tier === tierNum)
              const isTrophy = tierNum === 5
              return (
                <div key={tierNum} className="rounded-xl border border-zinc-800/80 bg-zinc-950/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                    <span>Tier {tierNum}</span>
                    <span>Nivel {reward?.levelReq ?? (tierNum * 5 === 25 ? 30 : tierNum * 5)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: reward?.roleColor || '#71717a' }}
                    />
                    <span className="text-xs text-zinc-200 font-medium truncate">
                      {reward?.roleName || 'Rol no asignado'}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {isTrophy ? '🏆 Trofeo mensual' : '⏳ Temporal'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Salón de la Fama / Temporadas Pasadas */}
      {pastSeasons.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <Icon icon="mdi:trophy-award" className="h-4 w-4 text-amber-400" />
              Salón de la Fama (Temporadas Concluidas)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Registro histórico de invocadores que completaron el evento y ganaron el rol trofeo permanente.
            </p>
          </div>

          <div className="space-y-4">
            {pastSeasons.map(season => {
              const trophyReward = season.rewards.find(r => r.isTrophy || r.tier === 5)
              return (
                <div key={season.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-2.5">
                    <div>
                      <span className="text-sm font-semibold text-zinc-200">{season.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">
                        {formatDate(season.startDate)} - {formatDate(season.endDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <Icon icon="mdi:trophy" className="h-3.5 w-3.5" />
                      Trofeo: {trophyReward?.roleName || 'Rol Trofeo'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-medium text-zinc-400 mb-2">
                      Ganadores del Trofeo ({season.winners.length}):
                    </div>
                    {season.winners.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {season.winners.map(w => (
                          <div
                            key={w.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                          >
                            {w.avatarUrl ? (
                              <img src={w.avatarUrl} alt="" className="h-4 w-4 rounded-full" />
                            ) : (
                              <span className="h-4 w-4 rounded-full bg-zinc-800 text-[9px] flex items-center justify-center font-bold">
                                {w.username?.[0] || 'U'}
                              </span>
                            )}
                            <span className="font-medium text-zinc-200">{w.username || 'Invocador'}</span>
                            <span className="text-zinc-500 text-[10px]">Nv. {w.finalLevel}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">
                        Ningún usuario alcanzó el nivel necesario para obtener el trofeo en esta temporada.
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal: Configurar Temporada */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-semibold text-zinc-100">
                {modalMode === 'create_active' && 'Iniciar Nueva Temporada'}
                {modalMode === 'edit_active' && 'Editar Temporada Activa'}
                {modalMode === 'create_upcoming' && 'Programar Próxima Temporada'}
                {modalMode === 'edit_upcoming' && 'Editar Próxima Temporada'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSeason} className="space-y-4">
              <Input
                label="Nombre de la temporada"
                description="Ejemplo: Temporada Octubre: Aquelarre"
                value={seasonName}
                onChange={e => setSeasonName(e.target.value)}
                placeholder="Nombre de la temporada"
                required
              />

              <Input
                label="Fecha y hora de finalización"
                description="Momento exacto en que se ejecuta el reinicio y rotación (por defecto el día 1 del mes a las 00:00 UTC)"
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
              />

              <div className="space-y-3 pt-1">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Los 5 Roles de la Temporada
                </label>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {tiers.map(t => {
                    const isTrophy = t.tier === 5
                    return (
                      <div
                        key={t.tier}
                        className={`rounded-xl border p-3 space-y-2.5 ${
                          isTrophy
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-zinc-800 bg-zinc-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-zinc-300">
                            Tier {t.tier} {isTrophy ? '• 🏆 Rol Trofeo Permanente' : '• ⏳ Temporal'}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {isTrophy ? 'Se conserva para siempre' : 'Se borra a fin de mes'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          <div className="sm:col-span-1">
                            <Input
                              label="Nivel requerido"
                              type="number"
                              min={1}
                              max={100}
                              value={t.levelReq}
                              onChange={e => handleTierLevelChange(t.tier, Number(e.target.value))}
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <RoleSelect
                              label="Rol de Discord"
                              roles={roles}
                              value={t.roleId}
                              onChange={roleId => handleTierRoleChange(t.tier, roleId)}
                              placeholder="Elige el rol creado en Discord..."
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {feedback && (
                <div
                  className={`rounded-lg p-3 text-xs ${
                    feedback.success
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {feedback.message}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar temporada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Rotación Anticipada */}
      {confirmRotateOpen && activeSeason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Icon icon="mdi:alert-circle-outline" className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-semibold text-zinc-100">
                ¿Finalizar temporada anticipadamente?
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Esta acción ejecutará de inmediato el fin de la <strong>{activeSeason.name}</strong>:
            </p>

            <ul className="text-xs text-zinc-400 space-y-1.5 list-disc list-inside bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
              <li>Guardará a los ganadores del nivel 5 en el Salón de la Fama.</li>
              <li>Eliminará de Discord los roles de Tier 1 a 4.</li>
              <li>El Rol 5 permanecerá intacto para los miembros que lo ganaron.</li>
              <li>Reiniciará la experiencia y el nivel de todos los usuarios a 0.</li>
            </ul>

            {rotateFeedback && (
              <div
                className={`rounded-lg p-3 text-xs ${
                  rotateFeedback.success
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                {rotateFeedback.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmRotateOpen(false)}
                disabled={rotating}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleTriggerRotation}
                disabled={rotating}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50"
              >
                {rotating ? 'Procesando fin de temporada...' : 'Confirmar y Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getMonthName(monthIndex: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ]
  return months[(monthIndex + 12) % 12]
}

function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
