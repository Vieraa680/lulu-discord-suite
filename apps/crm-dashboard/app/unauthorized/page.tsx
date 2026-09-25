import { auth, signOut } from '@/auth'
import { redirect } from 'next/navigation'
import { isDiscordIdAllowed } from '@/lib/auth-utils'
import { Icon } from '@/components/Icon'
import { CopyIdButton } from '@/components/CopyIdButton'
import Image from 'next/image'

export default async function UnauthorizedPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/login')
  }

  const discordId = (session.user as any).discordId || session.user.id
  const check = isDiscordIdAllowed(discordId)

  if (check.allowed) {
    redirect('/dashboard')
  }

  const displayName =
    (session.user as any).globalName ||
    session.user.name ||
    (session.user as any).username ||
    'Usuario'

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#09090b] text-zinc-100 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-zinc-800 bg-[#121215] p-6 sm:p-8 text-center">
          {/* User Avatar */}
          <div className="mx-auto mb-4 h-16 w-16">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={displayName}
                width={64}
                height={64}
                unoptimized
                className="h-16 w-16 rounded-full border border-zinc-700 object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-lg font-bold text-zinc-300">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h1 className="text-base font-semibold text-zinc-100">{displayName}</h1>
          <p className="mt-1 text-xs text-zinc-400">
            Tu cuenta no tiene permisos para acceder al panel.
          </p>

          {/* Discord ID display */}
          <div className="mt-5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-left">
            <span className="text-xs text-zinc-500">ID de Discord:</span>
            <div className="mt-1.5 flex items-center justify-between">
              <CopyIdButton id={discordId} />
              <span className="text-xs text-zinc-500">Copiar</span>
            </div>
          </div>

          {/* Sign out */}
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/login' })
            }}
            className="mt-6"
          >
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700/80 px-4 py-2 text-xs font-semibold text-zinc-200 transition-colors cursor-pointer"
            >
              <Icon icon="mdi:logout" className="h-4 w-4 text-zinc-400" />
              <span>Cerrar sesión</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
