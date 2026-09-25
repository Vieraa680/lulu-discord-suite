'use client'

import { useState } from 'react'
import { Icon } from './Icon'

interface CopyIdButtonProps {
  id: string
}

export function CopyIdButton({ id }: CopyIdButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-2.5 py-1.5 text-xs font-mono font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
      title="Copiar Discord ID"
    >
      <span>{id}</span>
      <Icon
        icon={copied ? 'mdi:check' : 'mdi:content-copy'}
        className={`h-3.5 w-3.5 ${copied ? 'text-emerald-400' : 'text-zinc-400'}`}
      />
    </button>
  )
}
