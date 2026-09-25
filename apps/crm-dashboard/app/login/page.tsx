import { auth, signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { Icon } from '@/components/Icon'
import { DiscordLoginButton } from '@/components/DiscordLoginButton'

interface LoginPageProps {
  searchParams: Promise<{
    error?: string
    callbackUrl?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth()
  if (session?.user) {
    redirect('/dashboard')
  }

  const { error } = await searchParams

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-100 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-zinc-800 bg-[#121215] p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-100 font-semibold text-sm">
              L
            </div>

            <h1 className="mt-4 text-base font-semibold tracking-tight text-zinc-100">
              Lulu Bot
            </h1>
            <p className="mt-1 text-xs text-zinc-400">
              Inicia sesión con tu cuenta de Discord.
            </p>
          </div>

          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-lg border border-rose-900/40 bg-rose-950/20 p-3 text-xs text-rose-300">
              <Icon icon="mdi:alert-circle-outline" className="h-4 w-4 shrink-0 text-rose-400" />
              <span>
                {error === 'AccessDenied'
                  ? 'No tienes permisos para acceder.'
                  : 'Error al iniciar sesión con Discord.'}
              </span>
            </div>
          )}

          <form
            action={async () => {
              'use server'
              await signIn('discord', { redirectTo: '/dashboard' })
            }}
            className="mt-6"
          >
            <DiscordLoginButton />
          </form>
        </div>
      </div>
    </div>
  )
}
