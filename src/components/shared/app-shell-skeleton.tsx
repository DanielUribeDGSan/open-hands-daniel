/**
 * Full-app loading placeholder that mirrors the real shell (sidebar + main)
 * so startup never flashes an empty black window or the old centered mascot.
 */
export function AppShellSkeleton() {
  return (
    <div
      data-testid="app-shell-skeleton"
      className="flex h-screen w-full overflow-hidden"
      style={{ backgroundColor: "#181818" }}
    >
      {/* Sidebar rail */}
      <aside
        className="oh-vibrancy-panel hidden h-full w-[300px] shrink-0 flex-col border-r border-[var(--oh-border)] p-3 md:flex"
        style={{ backgroundColor: "var(--oh-sidebar-gray, #222222)" }}
        aria-hidden
      >
        <div className="mb-4 h-8 w-full animate-pulse rounded-md bg-white/10" />
        <div className="mb-2 h-9 w-full animate-pulse rounded-md bg-white/10" />
        <div className="mb-6 h-9 w-3/4 animate-pulse rounded-md bg-white/[0.07]" />
        <div className="mb-2 h-3 w-24 animate-pulse rounded bg-white/10" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-full animate-pulse rounded-md bg-white/[0.06]"
            />
          ))}
        </div>
        <div className="mt-auto h-10 w-full animate-pulse rounded-md bg-white/[0.07]" />
      </aside>

      {/* Main content */}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={{ backgroundColor: "#181818" }}
      >
        <div className="flex flex-1 flex-col items-center px-6 pt-[18vh]">
          <div className="mb-8 h-8 w-64 max-w-full animate-pulse rounded-md bg-white/10" />
          <div className="mb-6 h-28 w-full max-w-2xl animate-pulse rounded-2xl bg-white/[0.06]" />
          <div className="mb-10 flex gap-3">
            <div className="h-9 w-44 animate-pulse rounded-full bg-white/[0.07]" />
            <div className="h-9 w-28 animate-pulse rounded-full bg-white/[0.07]" />
          </div>
          <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl bg-white/[0.06]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
