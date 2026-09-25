'use client'

import { useState } from 'react'
import { Icon } from './Icon'
import { CopyIdButton } from './CopyIdButton'

interface SetupWarningBannerProps {
  discordId: string
}

export function SetupWarningBanner({ discordId }: SetupWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Icon icon="mdi:alert-circle" className="h-4 w-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-amber-300">Modo de configuración inicial:</span>
          <span className="text-zinc-300">
            <code className="text-amber-300 font-mono">ALLOWED_DISCORD_IDS</code> aún no está configurado en tu <code className="text-zinc-200">.env</code>. Tu Discord ID es:
          </span>
          <CopyIdButton id={discordId} />
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-amber-400/80 hover:bg-amber-500/20 hover:text-amber-200 transition-colors"
          title="Ocultar aviso"
        >
          <Icon icon="mdi:close" className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
