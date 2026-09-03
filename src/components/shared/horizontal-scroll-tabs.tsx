import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigation } from "#/context/navigation-context";
import { cn } from "#/utils/utils";

const SCROLL_EDGE_EPSILON = 2;

function updateScrollEdges(el: HTMLElement) {
  const maxScroll = el.scrollWidth - el.clientWidth;
  return {
    canScrollLeft: el.scrollLeft > SCROLL_EDGE_EPSILON,
    canScrollRight: el.scrollLeft < maxScroll - SCROLL_EDGE_EPSILON,
    isOverflowing: maxScroll > SCROLL_EDGE_EPSILON,
  };
}

/**
 * On tab change, keep the previous and next tabs peeking when possible.
 * Near the strip end, clamp to max scroll and leave it there.
 */
function scrollActiveTabIntoView(container: HTMLElement) {
  const active = container.querySelector<HTMLElement>('[aria-current="page"]');
  if (!active) return;

  const prev = active.previousElementSibling as HTMLElement | null;
  const next = active.nextElementSibling as HTMLElement | null;
  const padding = 8;
  const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
  if (maxScroll <= SCROLL_EDGE_EPSILON) return;

  const activeLeft = active.offsetLeft;
  const activeRight = activeLeft + active.offsetWidth;
  const rangeStart = Math.max(
    0,
    (prev ? prev.offsetLeft : activeLeft) - padding,
  );
  const rangeEnd =
    (next ? next.offsetLeft + next.offsetWidth : activeRight) + padding;

  let target: number;
  if (rangeEnd - rangeStart <= container.clientWidth) {
    // Fit prev + active + next: align so the previous tab is visible on the left.
    target = rangeStart;
    if (target + container.clientWidth < rangeEnd) {
      target = rangeEnd - container.clientWidth;
    }
  } else {
    // Can't fit neighbors — keep the active tab centered as much as possible.
    target = activeLeft + active.offsetWidth / 2 - container.clientWidth / 2;
  }

  target = Math.max(0, Math.min(maxScroll, target));

  if (Math.abs(target - container.scrollLeft) > SCROLL_EDGE_EPSILON) {
    container.scrollTo({ left: target, behavior: "smooth" });
  }
}

interface HorizontalScrollTabsProps {
  children: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

/**
 * Horizontal tab strip with overflow chevrons. On route change, scrolls so the
 * previous, active, and next tabs stay in view when scroll room allows.
 */
export function HorizontalScrollTabs({
  children,
  className,
  "data-testid": testId,
}: HorizontalScrollTabsProps) {
  const { currentPath } = useNavigation();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isOverflowing, setIsOverflowing] = React.useState(false);

  const refreshEdges = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const next = updateScrollEdges(el);
    setCanScrollLeft(next.canScrollLeft);
    setCanScrollRight(next.canScrollRight);
    setIsOverflowing(next.isOverflowing);
  }, []);

  React.useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    refreshEdges();

    const resizeObserver = new ResizeObserver(() => {
      refreshEdges();
    });
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(() => {
      refreshEdges();
    });
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [refreshEdges, children]);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Wait a frame so aria-current has updated on the new active link.
    const frame = requestAnimationFrame(() => {
      scrollActiveTabIntoView(el);
      refreshEdges();
    });
    return () => cancelAnimationFrame(frame);
  }, [currentPath, refreshEdges]);

  const scrollByPage = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(120, Math.floor(el.clientWidth * 0.7));
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <nav
      data-testid={testId}
      className={cn(
        "flex min-w-0 items-center gap-0.5 border-b border-[var(--oh-border)] pb-2",
        className,
      )}
    >
      {isOverflowing ? (
        <button
          type="button"
          aria-label="Anterior"
          disabled={!canScrollLeft}
          onClick={() => scrollByPage(-1)}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--oh-text-secondary)]",
            "hover:bg-[var(--oh-interactive-hover)] hover:text-white",
            "disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <ChevronLeft size={16} aria-hidden />
        </button>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={refreshEdges}
        className={cn(
          "flex min-w-0 flex-1 gap-1 overflow-x-auto",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {children}
      </div>

      {isOverflowing ? (
        <button
          type="button"
          aria-label="Siguiente"
          disabled={!canScrollRight}
          onClick={() => scrollByPage(1)}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--oh-text-secondary)]",
            "hover:bg-[var(--oh-interactive-hover)] hover:text-white",
            "disabled:pointer-events-none disabled:opacity-30",
          )}
        >
          <ChevronRight size={16} aria-hidden />
        </button>
      ) : null}
    </nav>
  );
}
