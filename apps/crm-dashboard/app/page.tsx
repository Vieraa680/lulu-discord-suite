import { Icon } from '@/components/Icon'

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex items-center gap-3">
          <Icon icon="mdi:discord" className="w-8 h-8 text-indigo-500" />
          <span className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
            Lulu Discord Suite
          </span>
        </div>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            CRM Dashboard
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Manage your Discord community with integrated tools —
            Polymorphia duels, minigames, administration, and more.
          </p>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-300 md:w-[158px]"
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon="mdi:discord" className="w-4 h-4" />
            Discord Server
          </a>
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Icon icon="mdi:github" className="w-4 h-4" />
            Source Code
          </a>
        </div>

        {/* Feature highlights using shared icon system */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full mt-12">
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Icon name="SWORDS" className="w-8 h-8 text-purple-500" />
            <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Polymorphia</span>
            <span className="text-xs text-zinc-500 text-center">Duel and transform with League-themed battles</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Icon name="CANDY" className="w-8 h-8 text-pink-500" />
            <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Economy</span>
            <span className="text-xs text-zinc-500 text-center">Earn and spend candies in the virtual shop</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <Icon name="SHIELD" className="w-8 h-8 text-blue-500" />
            <span className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Administration</span>
            <span className="text-xs text-zinc-500 text-center">Server management and moderation tools</span>
          </div>
        </div>
      </main>
    </div>
  );
}
