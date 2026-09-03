import {
  SettingsCompactNav,
  SettingsDesktopSidebar,
} from "./settings-desktop-sidebar";
import { SettingsNavRenderedItem } from "#/hooks/use-settings-nav-items";
import { settingsLayoutMainScrollClassName } from "#/utils/settings-like-page-layout-classes";
import { DesktopWindowDragRegion } from "#/components/shared/desktop-window-drag-region";
import { useBreakpoint } from "#/hooks/use-breakpoint";
import { cn } from "#/utils/utils";

/** Matches Tailwind `xl` (1280px): aside below this width squeezes settings content. */
const SETTINGS_ASIDE_MIN_WIDTH = 1279;

interface SettingsLayoutProps {
  children: React.ReactNode;
  navigationItems: SettingsNavRenderedItem[];
}

/**
 * Mirrors the extensions / automate layout: sticky aside on wide desktops,
 * compact horizontal tabs when the window is mid-size, and a scrolling
 * content column.
 */
export function SettingsLayout({
  children,
  navigationItems,
}: SettingsLayoutProps) {
  const isCompactNav = useBreakpoint(SETTINGS_ASIDE_MIN_WIDTH);

  return (
    <div className="flex h-full flex-col">
      <DesktopWindowDragRegion />
      <div
        className={cn(
          "flex min-h-0 flex-1 gap-4 md:gap-6 md:items-start",
          isCompactNav ? "md:pl-0 lg:gap-6" : "md:pl-0 xl:gap-10",
        )}
      >
        {!isCompactNav ? (
          <SettingsDesktopSidebar navigationItems={navigationItems} />
        ) : null}
        <main className={settingsLayoutMainScrollClassName}>
          <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col gap-5 md:gap-6">
            {isCompactNav ? (
              <SettingsCompactNav navigationItems={navigationItems} />
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
