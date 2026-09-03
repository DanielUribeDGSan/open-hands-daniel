import type { LucideIcon } from "lucide-react";
import { NavigationLink } from "#/components/shared/navigation-link";
import {
  SIDEBAR_ROW_INTERACTIVE_CLASS,
  sidebarNavRowClassName,
} from "#/components/features/sidebar/sidebar-layout";
import { DesktopWindowDragRegion } from "#/components/shared/desktop-window-drag-region";
import { HorizontalScrollTabs } from "#/components/shared/horizontal-scroll-tabs";
import { useBreakpoint } from "#/hooks/use-breakpoint";
import { settingsLikeMainScrollClassName } from "#/utils/settings-like-page-layout-classes";
import { cn } from "#/utils/utils";

/** Matches Tailwind `xl` (1280px): aside below this width squeezes the content. */
const MANIFEST_ASIDE_MIN_WIDTH = 1279;

export interface SubPageNavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  testId: string;
}

interface ManifestSubpageLayoutProps {
  /** The section heading above the desktop navigation. */
  heading: string;
  /** Prefix for the desktop/mobile nav testids. */
  navTestIdBase: string;
  items: SubPageNavItem[];
  children: React.ReactNode;
}

function SubPageNavLink({
  item,
  compact = false,
}: {
  item: SubPageNavItem;
  compact?: boolean;
}) {
  return (
    <NavigationLink
      to={item.to}
      end
      data-testid={item.testId}
      className={({ isActive }) =>
        cn(
          compact
            ? cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
                isActive
                  ? "bg-[var(--oh-interactive-hover)] text-white"
                  : "text-[var(--oh-text-secondary)] hover:bg-[var(--oh-interactive-hover)] hover:text-white",
              )
            : cn(
                sidebarNavRowClassName(),
                "truncate whitespace-nowrap",
                isActive
                  ? SIDEBAR_ROW_INTERACTIVE_CLASS.active
                  : SIDEBAR_ROW_INTERACTIVE_CLASS.idle,
              ),
        )
      }
    >
      <span className="shrink-0 flex items-center justify-center">
        <item.Icon size={16} aria-hidden />
      </span>
      <span className="truncate">{item.label}</span>
    </NavigationLink>
  );
}

/**
 * The shell of a manifest-declared sub-page: sticky aside on wide desktops,
 * compact horizontal tabs when the window is mid-size, and a scrolling
 * content column. Purely presentational.
 */
export function ManifestSubpageLayout({
  heading,
  navTestIdBase,
  items,
  children,
}: ManifestSubpageLayoutProps) {
  const isCompactNav = useBreakpoint(MANIFEST_ASIDE_MIN_WIDTH);

  return (
    <div className="flex h-full flex-col">
      <DesktopWindowDragRegion />
      <div
        className={cn(
          "flex min-h-0 flex-1 gap-4 md:gap-6",
          isCompactNav ? "md:pl-0 lg:gap-6" : "md:pl-8 xl:gap-10 xl:pl-10",
        )}
      >
        {!isCompactNav ? (
          <aside
            data-testid={`${navTestIdBase}-desktop`}
            className="flex w-[220px] shrink-0 flex-col gap-2 sticky top-0 self-start"
          >
            <span className="px-2 text-sm font-normal text-white">
              {heading}
            </span>
            <div className="flex flex-col gap-0.5 pt-0.5">
              {items.map((item) => (
                <SubPageNavLink key={item.to} item={item} />
              ))}
            </div>
          </aside>
        ) : null}

        <main className={cn(settingsLikeMainScrollClassName, "h-full")}>
          <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-5 md:gap-6">
            {isCompactNav ? (
              <HorizontalScrollTabs data-testid={`${navTestIdBase}-compact`}>
                {items.map((item) => (
                  <SubPageNavLink key={item.to} item={item} compact />
                ))}
              </HorizontalScrollTabs>
            ) : null}
            {/* Keep a mobile-only strip for very small viewports when the
                wide aside is mounted (jsdom / SSR edge cases). */}
            {!isCompactNav ? (
              <HorizontalScrollTabs
                data-testid={`${navTestIdBase}-mobile`}
                className="md:hidden"
              >
                {items.map((item) => (
                  <SubPageNavLink key={item.to} item={item} compact />
                ))}
              </HorizontalScrollTabs>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
