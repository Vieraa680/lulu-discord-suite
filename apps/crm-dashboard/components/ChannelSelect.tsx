'use client'

import React, { useState, useRef, useEffect, useId } from 'react'
import { Icon } from './Icon'
import { matchesDiscordChannel } from '@/lib/discord-text'

export interface SpecialOption {
  value: string
  label: string
  icon: string
  description?: string
}

export interface ChannelItem {
  id: string
  name: string
  type: number
}

export interface ChannelSelectProps {
  channels: ChannelItem[]
  value: string
  onChange: (value: string) => void
  specialOptions?: SpecialOption[]
  label?: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
  placeholder?: string
  error?: string
  className?: string
  filterTypes?: number[]
}

function getChannelIcon(type: number): string {
  switch (type) {
    case 2:
      return 'mdi:volume-high'
    case 5:
      return 'mdi:bullhorn-outline'
    case 15:
      return 'mdi:forum-outline'
    case 0:
    default:
      return 'mdi:pound'
  }
}

export function ChannelSelect({
  channels,
  value,
  onChange,
  specialOptions,
  label,
  description,
  disabled = false,
  placeholder = 'Selecciona un canal...',
  error,
  className = '',
  filterTypes,
}: ChannelSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()

  const availableChannels = filterTypes
    ? channels.filter(c => filterTypes.includes(c.type))
    : channels

  const selectedSpecial = specialOptions?.find(opt => opt.value === value)
  const selectedChannel = channels.find(c => c.id === value)

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
  const filteredChannels = normalizedQuery
    ? availableChannels.filter(c => matchesDiscordChannel(c.name, normalizedQuery))
    : availableChannels

  const handleSelect = (nextValue: string) => {
    onChange(nextValue)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className={`space-y-1.5 relative ${className}`}>
      {/* Label */}
      {label && (
        <label
          id={`${generatedId}-label`}
          onClick={() => !disabled && setIsOpen(prev => !prev)}
          className="block text-xs font-semibold text-zinc-300 select-none cursor-pointer"
        >
          {label}
        </label>
      )}

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
            ? 'border-violet-500 ring-1 ring-violet-500/50 bg-zinc-900'
            : 'border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-900/80'
        } ${disabled ? 'opacity-40 cursor-not-allowed bg-zinc-950/40' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
          {selectedSpecial ? (
            <>
              <Icon
                icon={selectedSpecial.icon}
                className="h-4 w-4 text-violet-400 shrink-0"
              />
              <span className="font-medium text-zinc-100 truncate">
                {selectedSpecial.label}
              </span>
            </>
          ) : selectedChannel ? (
            <>
              <Icon
                icon={getChannelIcon(selectedChannel.type)}
                className="h-4 w-4 text-zinc-400 shrink-0"
              />
              <span className="font-medium text-zinc-100 truncate">
                #{selectedChannel.name}
              </span>
            </>
          ) : (
            <span className="text-zinc-500 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-zinc-400 shrink-0">
          <Icon
            icon="mdi:chevron-down"
            className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-violet-400' : ''}`}
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
          {/* Section: Special Delivery Modes */}
          {specialOptions && specialOptions.length > 0 && (
            <div className="space-y-1">
              <div className="px-1.5 pt-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Destino del aviso
              </div>
              <div className="space-y-0.5">
                {specialOptions.map(opt => {
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-violet-950/40 text-violet-200 border border-violet-800/40 font-semibold'
                          : 'hover:bg-zinc-900 text-zinc-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                        <Icon
                          icon={opt.icon}
                          className={`h-4 w-4 shrink-0 ${isSelected ? 'text-violet-300' : 'text-zinc-400'}`}
                        />
                        <span className="truncate">{opt.label}</span>
                      </div>
                      {isSelected && (
                        <Icon icon="mdi:check" className="h-4 w-4 text-violet-400 shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section: Server Channels with Search */}
          <div className="space-y-1.5 pt-1 border-t border-zinc-800/70">
            <div className="flex items-center justify-between px-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <span>Canales</span>
              <span className="font-mono lowercase text-zinc-400">
                {filteredChannels.length} de {availableChannels.length}
              </span>
            </div>

            {/* Quick Search */}
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
                placeholder="Buscar canal..."
                className="w-full rounded-lg border border-zinc-800/90 bg-zinc-900/90 py-1.5 pl-8 pr-7 text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-violet-500"
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

            {/* Channels List */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-0.5">
              {filteredChannels.length === 0 ? (
                <div className="py-4 text-center">
                  <p className="text-xs text-zinc-500">
                    No se encontraron canales para <span className="font-medium text-zinc-300">«{searchQuery}»</span>
                  </p>
                </div>
              ) : (
                filteredChannels.map(channel => {
                  const isSelected = channel.id === value
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(channel.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs text-left transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-violet-950/40 text-violet-200 border border-violet-800/40 font-semibold'
                          : 'hover:bg-zinc-900 text-zinc-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                        <Icon
                          icon={getChannelIcon(channel.type)}
                          className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-violet-300' : 'text-zinc-400'}`}
                        />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      {isSelected && (
                        <Icon icon="mdi:check" className="h-4 w-4 text-violet-400 shrink-0" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description below */}
      {description && !error && (
        <p className="text-xs text-zinc-500 font-normal leading-normal">
          {description}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-400 pt-0.5">
          <Icon icon="mdi:alert-circle-outline" className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
