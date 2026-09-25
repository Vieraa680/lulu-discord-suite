'use client'

import { useState } from 'react'
import { adjustUserCandies, dispelPolymorphia, applyPolymorphia, grantItem } from '@/app/actions'

interface ItemOption {
  id: string
  name: string
  emoji: string
  category: string
  rarity: string
}

interface UserActionModalsProps {
  discordId: string
  guildId: string
  currentCandies: number
  isHexed: boolean
  currentForm?: string
  availableItems: ItemOption[]
}

export function UserActionModals({
  discordId,
  guildId,
  currentCandies,
  isHexed,
  currentForm,
  availableItems,
}: UserActionModalsProps) {
  const [activeTab, setActiveTab] = useState<'candies' | 'polymorphia' | 'grant'>('candies')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)

  // Candies form state
  const [amount, setAmount] = useState<number>(100)
  const [reason, setReason] = useState<string>('')

  // Polymorphia form state
  const [selectedForm, setSelectedForm] = useState('Forma Yuumi')
  const [duration, setDuration] = useState('30')

  // Grant item state
  const [selectedItemId, setSelectedItemId] = useState(availableItems[0]?.id || '')
  const [quantity, setQuantity] = useState(1)

  const handleAdjustCandies = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    const formData = new FormData()
    formData.append('discordId', discordId)
    formData.append('guildId', guildId)
    formData.append('amount', amount.toString())
    formData.append('reason', reason || 'Ajuste administrativo')

    const res = await adjustUserCandies(formData)
    setFeedback(res)
    setLoading(false)
    if (res.success) setReason('')
  }

  const handlePolymorphiaToggle = async () => {
    setLoading(true)
    setFeedback(null)
    const formData = new FormData()
    formData.append('discordId', discordId)
    formData.append('guildId', guildId)

    let res
    if (isHexed) {
      res = await dispelPolymorphia(formData)
    } else {
      formData.append('form', selectedForm)
      formData.append('durationMinutes', duration)
      res = await applyPolymorphia(formData)
    }
    setFeedback(res)
    setLoading(false)
  }

  const handleGrantItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback(null)
    const formData = new FormData()
    formData.append('discordId', discordId)
    formData.append('guildId', guildId)
    formData.append('itemId', selectedItemId)
    formData.append('quantity', quantity.toString())

    const res = await grantItem(formData)
    setFeedback(res)
    setLoading(false)
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Acciones de Moderación</h2>
          <p className="text-xs text-zinc-500">Operaciones con registro permanente en auditoría</p>
        </div>

        {/* Tab Selector */}
        <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
          <button
            onClick={() => { setActiveTab('candies'); setFeedback(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'candies' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Caramelos
          </button>
          <button
            onClick={() => { setActiveTab('polymorphia'); setFeedback(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'polymorphia' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Polymorphia
          </button>
          <button
            onClick={() => { setActiveTab('grant'); setFeedback(null); }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === 'grant' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Otorgar Ítem
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-4 rounded-lg border p-3 text-xs font-medium ${
            feedback.success
              ? 'border-emerald-800/50 bg-emerald-950/20 text-emerald-300'
              : 'border-red-800/50 bg-red-950/20 text-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Candies Tab */}
      {activeTab === 'candies' && (
        <form onSubmit={handleAdjustCandies} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-zinc-400">
                Cantidad (positivo o negativo)
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(parseInt(e.target.value, 10) || 0)}
                placeholder="ej. 250 o -100"
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                required
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Saldo actual: <span className="text-zinc-200 font-semibold tabular-nums">{currentCandies.toLocaleString()}</span>
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400">
                Motivo del ajuste
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="ej. Corrección de saldo, evento"
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-600"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || amount === 0}
              className="rounded-lg bg-zinc-100 text-zinc-950 px-4 py-2 text-xs font-semibold hover:bg-white transition disabled:opacity-50"
            >
              {loading ? 'Aplicando...' : 'Aplicar Ajuste'}
            </button>
          </div>
        </form>
      )}

      {/* Polymorphia Tab */}
      {activeTab === 'polymorphia' && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <div>
              <span className="text-xs text-zinc-400">Estado</span>
              <p className="font-semibold text-xs text-zinc-200 mt-0.5">
                {isHexed ? `Transformado en: ${currentForm}` : 'Forma normal'}
              </p>
            </div>

            {isHexed && (
              <button
                type="button"
                onClick={handlePolymorphiaToggle}
                disabled={loading}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:text-white transition disabled:opacity-50"
              >
                {loading ? 'Disipando...' : 'Disipar Metamorfosis'}
              </button>
            )}
          </div>

          {!isHexed && (
            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              <div>
                <label className="text-xs font-medium text-zinc-400">
                  Forma
                </label>
                <select
                  value={selectedForm}
                  onChange={e => setSelectedForm(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                >
                  <option value="Forma Yuumi">Forma Yuumi</option>
                  <option value="Forma Teemo">Forma Teemo</option>
                  <option value="Forma Poro">Forma Poro</option>
                  <option value="Forma Gato Lunar">Forma Gato Lunar</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">
                  Duración
                </label>
                <select
                  value={duration}
                  onChange={e => setDuration(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                >
                  <option value="15">15 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="60">1 hora</option>
                  <option value="120">2 horas</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handlePolymorphiaToggle}
                  disabled={loading}
                  className="rounded-lg bg-zinc-100 text-zinc-950 px-4 py-2 text-xs font-semibold hover:bg-white transition disabled:opacity-50"
                >
                  {loading ? 'Aplicando...' : 'Aplicar Metamorfosis'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grant Item Tab */}
      {activeTab === 'grant' && (
        <form onSubmit={handleGrantItem} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-zinc-400">
                Ítem
              </label>
              <select
                value={selectedItemId}
                onChange={e => setSelectedItemId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-zinc-200 outline-none focus:border-zinc-600"
                required
              >
                {availableItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.rarity})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400">
                Cantidad
              </label>
              <input
                type="number"
                min="1"
                max="99"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
                className="mt-1.5 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs text-white outline-none focus:border-zinc-600"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading || !selectedItemId}
              className="rounded-lg bg-zinc-100 text-zinc-950 px-4 py-2 text-xs font-semibold hover:bg-white transition disabled:opacity-50"
            >
              {loading ? 'Otorgando...' : 'Otorgar al Inventario'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
