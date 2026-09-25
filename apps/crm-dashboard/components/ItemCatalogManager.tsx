'use client'

import { useState } from 'react'
import { toggleItemStatus, updateItemPrice } from '@/app/actions'
import { Icon } from './Icon'

interface ItemData {
  id: string
  name: string
  description?: string
  emoji: string
  price: number
  category: string
  rarity: string
  isCollectible: boolean
  isActive: boolean
  formDuration?: number | null
  ownersCount: number
}

interface ItemCatalogManagerProps {
  items: ItemData[]
}

export function ItemCatalogManager({ items }: ItemCatalogManagerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState<number>(0)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const categories = ['all', ...Array.from(new Set(items.map(i => i.category)))]

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(i => i.category === selectedCategory)

  const handleToggle = async (item: ItemData) => {
    setLoadingId(item.id)
    const formData = new FormData()
    formData.append('itemId', item.id)
    formData.append('isActive', item.isActive.toString())
    await toggleItemStatus(formData)
    setLoadingId(null)
  }

  const handleSavePrice = async (itemId: string) => {
    setLoadingId(itemId)
    const formData = new FormData()
    formData.append('itemId', itemId)
    formData.append('price', newPrice.toString())
    await updateItemPrice(formData)
    setEditingPriceId(null)
    setLoadingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-lg px-3 py-1 text-xs font-medium capitalize transition-colors ${
              selectedCategory === cat
                ? 'bg-zinc-800 text-white font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            {cat === 'all' ? 'Todos los ítems' : cat}
          </button>
        ))}
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-8 text-center text-xs text-zinc-500">
          No hay ítems registrados en este catálogo.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/30">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/70 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
              <tr>
                <th className="py-2.5 pl-4 pr-3">Ítem</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3">Rareza</th>
                <th className="py-2.5 px-3 text-right">Precio</th>
                <th className="py-2.5 px-3 text-right">Poseedores</th>
                <th className="py-2.5 pr-4 pl-3 text-right w-24">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredItems.map(item => {
                const isEditing = editingPriceId === item.id

                return (
                  <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 pl-4 pr-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-zinc-200">{item.name}</span>
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm truncate">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-zinc-400 capitalize">
                      {item.category}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] uppercase font-mono text-zinc-300">
                        {item.rarity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            value={newPrice}
                            onChange={e => setNewPrice(parseInt(e.target.value, 10) || 0)}
                            className="w-16 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-xs text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePrice(item.id)}
                            className="rounded bg-zinc-100 text-zinc-950 px-1.5 py-0.5 text-[10px] font-bold"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingPriceId(null)}
                            className="rounded bg-zinc-800 text-zinc-400 px-1.5 py-0.5 text-[10px]"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-medium text-zinc-200 tabular-nums">
                            {item.price > 0 ? `${item.price.toLocaleString()} candies` : 'Gratis'}
                          </span>
                          <button
                            onClick={() => { setEditingPriceId(item.id); setNewPrice(item.price); }}
                            className="text-zinc-500 hover:text-zinc-200 transition-colors"
                            title="Editar precio"
                          >
                            <Icon icon="mdi:pencil" className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-zinc-300 tabular-nums">
                      {item.ownersCount}
                    </td>
                    <td className="py-3 pr-4 pl-3 text-right">
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={loadingId === item.id}
                        className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                          item.isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 hover:bg-emerald-900/60'
                            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {loadingId === item.id ? '...' : item.isActive ? 'Activo' : 'Oculto'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
