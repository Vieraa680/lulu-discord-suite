'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { Icon } from './Icon'
import { matchesDiscordChannel } from '@/lib/discord-text'

export interface RoleItem {
  id: string
  name: string
  hexColor?: string | null
}

export interface RoleSelectProps {
  roles: RoleItem[]
  value: string
  onChange: (roleId: string) => void
  label?: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  onCreateNew?: (suggestedName?: string) => void
  placeholder?: string
  error?: string
  className?: string
}

export function RoleSelect({
  roles,
  value,
  onChange,
  label,
  description,
  disabled = false,
  onCreateNew,
  placeholder = 'Selecciona un rol de Discord...',
  error,
  className = '',
}: RoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()

  const selectedRole = roles.find(r => r.id === value)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  const normalizedQuery = searchQuery.trim()
  const filteredRoles = normalizedQuery
    ? roles.filter(role => matchesDiscordChannel(role.name, normalizedQuery))
    : roles

  const handleSelectRole = (roleId: string) => {
    onChange(roleId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const getRoleDotColor = (hex?: string | null) => {
    if (!hex || hex === '#000000') return '#94a3b8'
    return hex
  }

  return (
    <div ref={containerRef} className={`space-y-1.5 relative ${className}`}>
      {/* Label & Header action */}
      <div className="flex items-center justify-between">
        {label && (
          <label
            id={`${generatedId}-label`}
            onClick={() => !disabled && setIsOpen(prev => !prev)}
            className="block text-xs font-medium text-zinc-200 select-none cursor-pointer"
          >
            {label}
          </label>
        )}
        {onCreateNew && (
          <button
            type="button"
            onClick={() => onCreateNew()}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 hover:text-purple-300 hover:underline transition-colors"
          >
            <Icon icon="mdi:palette-swatch-outline" className="h-3.5 w-3.5" />
            <span>+ Crear nuevo rol</span>
          </button>
        )}
      </div>

      {/* Trigger Button */}
      <button
        type="button"
        id={generatedId}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${generatedId}-label` : undefined}
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        onKeyDown={e => {
          if (e.key === 'Escape') {
            setIsOpen(false)
            setSearchQuery('')
          }
        }}
        className={`w-full flex items-center justify-between rounded-xl border bg-zinc-900/60 px-3.5 py-2.5 text-xs text-left transition-all duration-150 ${
          error
            ? 'border-red-500/80 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
            : isOpen
            ? 'border-purple-500 ring-1 ring-purple-500/50 bg-zinc-900'
            : 'border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-900/80'
        } ${disabled ? 'opacity-40 cursor-not-allowed bg-zinc-950/40' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
          {selectedRole ? (
            <>
              <div
                className="h-3 w-3 rounded-full shrink-0 border border-white/20 shadow-sm"
                style={{ backgroundColor: getRoleDotColor(selectedRole.hexColor) }}
                aria-hidden="true"
              />
              <span className="font-medium text-zinc-100 truncate">{selectedRole.name}</span>
            </>
          ) : (
            <span className="text-zinc-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          <Icon
            icon="mdi:chevron-down"
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-purple-400' : ''}`}
          />
        </div>
      </button>

      {/* Floating Combobox Popover */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-xl border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/90 backdrop-blur-xl space-y-2 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Quick Search Bar */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-500">
              <Icon icon="mdi:magnify" className="h-3.5 w-3.5" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  setIsOpen(false)
                  setSearchQuery('')
                }
              }}
              placeholder="Buscar rol por nombre..."
              className="w-full rounded-lg border border-zinc-800/90 bg-zinc-900/90 py-1.5 pl-8 pr-7 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-zinc-500 hover:text-zinc-300"
                title="Limpiar búsqueda"
              >
                <Icon icon="mdi:close-circle" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Roles Count Badge */}
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
            <span>Roles disponibles:</span>
            <span className="font-mono text-zinc-400">{filteredRoles.length} de {roles.length}</span>
          </div>

          {/* Roles List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredRoles.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-zinc-400">
                  No se encontraron roles para <span className="font-semibold text-zinc-200">«{searchQuery}»</span>
                </p>
                {onCreateNew && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false)
                      onCreateNew(searchQuery.trim())
                    }}
                    className="mt-2 text-xs font-semibold text-purple-400 hover:text-purple-300 hover:underline"
                  >
                    + Crear rol «{searchQuery}»
                  </button>
                )}
              </div>
            ) : (
              filteredRoles.map(role => {
                const isSelected = role.id === value
                return (
                  <button
                    key={role.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectRole(role.id)}
                    className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/40 text-purple-200 border border-purple-800/40 font-semibold'
                        : 'hover:bg-zinc-900 text-zinc-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0 border border-white/20 shadow-sm"
                        style={{ backgroundColor: getRoleDotColor(role.hexColor) }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{role.name}</span>
                    </div>

                    {isSelected && (
                      <Icon icon="mdi:check" className="h-4 w-4 text-purple-400 shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Quick Create Footer */}
          {onCreateNew && (
            <div className="border-t border-zinc-800/80 pt-1.5 px-0.5">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onCreateNew(searchQuery.trim())
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-950/30 hover:text-purple-300 transition-colors"
              >
                <Icon icon="mdi:palette-swatch-outline" className="h-3.5 w-3.5" />
                <span>Crear nuevo rol en Discord</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Description below */}
      {description && !error && (
        <p className="text-[11px] text-zinc-500 font-normal leading-normal">
          {description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-red-400 pt-0.5">
          <Icon icon="mdi:alert-circle-outline" className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
