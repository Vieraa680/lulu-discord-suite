'use client'

import { useFormStatus } from 'react-dom'
import { Icon } from './Icon'

export function DiscordLoginButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-75 disabled:pointer-events-none px-4 py-2.5 text-xs font-semibold text-white transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 cursor-pointer"
    >
      {pending ? (
        <>
          <Icon icon="mdi:loading" className="h-4 w-4 animate-spin text-white/90" />
          <span>Conectando con Discord...</span>
        </>
      ) : (
        <>
          <Icon icon="mdi:discord" className="h-4 w-4 transition-transform group-hover:scale-105" />
          <span>Continuar con Discord</span>
        </>
      )}
    </button>
  )
}
