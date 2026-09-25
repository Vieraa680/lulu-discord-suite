export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-2 border-b border-zinc-800/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-6 w-36 rounded-md bg-zinc-800/80" />
          <div className="h-3.5 w-64 rounded-md bg-zinc-800/40" />
        </div>
        <div className="h-7 w-32 rounded-lg bg-zinc-800/50 border border-zinc-800/60" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-28 rounded bg-zinc-800/60" />
              <div className="h-4 w-4 rounded bg-zinc-800/40" />
            </div>
            <div className="h-7 w-20 rounded-md bg-zinc-700/60" />
            <div className="h-2.5 w-32 rounded bg-zinc-800/40" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 rounded bg-zinc-800/70" />
            <div className="h-3 w-20 rounded bg-zinc-800/40" />
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60">
            <div className="h-9 bg-zinc-900/70 px-4 flex items-center">
              <div className="h-3 w-48 rounded bg-zinc-800/50" />
            </div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-zinc-800/80 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-28 rounded bg-zinc-800/70" />
                    <div className="h-2.5 w-20 rounded bg-zinc-800/40" />
                  </div>
                </div>
                <div className="h-4 w-14 rounded bg-zinc-800/60" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-zinc-800/70" />
            <div className="h-3 w-16 rounded bg-zinc-800/40" />
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/60">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-zinc-800/60 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-36 rounded bg-zinc-800/60" />
                    <div className="h-2.5 w-24 rounded bg-zinc-800/40" />
                  </div>
                </div>
                <div className="h-4 w-12 rounded bg-zinc-800/50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
