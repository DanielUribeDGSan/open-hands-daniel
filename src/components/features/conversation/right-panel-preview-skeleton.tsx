import { cn } from "#/utils/utils";

/**
 * Placeholder shaped like the Files / Review preview pane — shown on the
 * right while chat scroll-sync is settling so rapid scrubbing doesn't flash
 * real code on every tick.
 */
export function RightPanelPreviewSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-col bg-[var(--oh-chat-surface,#181818)]",
        className,
      )}
      data-testid="right-panel-preview-skeleton"
      aria-hidden
    >
      <div className="oh-panel-chrome flex shrink-0 items-center gap-2 border-b border-[var(--oh-border)] px-3 py-2.5">
        <div className="h-6 w-28 animate-pulse rounded-md bg-white/10" />
        <div className="h-6 w-16 animate-pulse rounded-md bg-white/[0.07]" />
        <div className="ml-auto h-6 w-20 animate-pulse rounded-md bg-white/[0.07]" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[28%] shrink-0 flex-col gap-2 border-r border-[var(--oh-border)] p-3 sm:flex">
          <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
          <div className="h-7 w-full animate-pulse rounded-md bg-white/[0.06]" />
          <div className="h-7 w-[85%] animate-pulse rounded-md bg-white/[0.05]" />
          <div className="h-7 w-[92%] animate-pulse rounded-md bg-white/[0.06]" />
          <div className="mt-2 h-3 w-14 animate-pulse rounded bg-white/10" />
          <div className="h-7 w-full animate-pulse rounded-md bg-white/[0.05]" />
          <div className="h-7 w-[70%] animate-pulse rounded-md bg-white/[0.06]" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4">
          <div className="mb-1 h-3 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3.5 w-[94%] animate-pulse rounded bg-white/[0.05]" />
          <div className="h-3.5 w-[88%] animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3.5 w-[96%] animate-pulse rounded bg-white/[0.045]" />
          <div className="mt-2 h-3.5 w-[70%] animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.05]" />
          <div className="h-3.5 w-[82%] animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-3 h-24 w-full animate-pulse rounded-xl bg-white/[0.04]" />
          <div className="h-3.5 w-[90%] animate-pulse rounded bg-white/[0.05]" />
          <div className="h-3.5 w-[76%] animate-pulse rounded bg-white/[0.06]" />
        </div>
      </div>
    </div>
  );
}
