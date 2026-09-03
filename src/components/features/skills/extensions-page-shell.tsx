import type { ReactNode } from "react";
import {
  ExtensionsCompactNav,
  ExtensionsNavigation,
} from "#/components/features/skills/extensions-navigation";
import { DesktopWindowDragRegion } from "#/components/shared/desktop-window-drag-region";
import { useBreakpoint } from "#/hooks/use-breakpoint";
import { cn } from "#/utils/utils";

/** Matches Tailwind `xl` (1280px): aside below this width squeezes MCP/Skills. */
const CUSTOMIZE_ASIDE_MIN_WIDTH = 1279;

interface ExtensionsPageShellProps {
  children: ReactNode;
  /** Optional test id on the outer shell (e.g. mcp-page). */
  testId?: string;
  className?: string;
}

/**
 * Shared chrome for /mcp, /skills, /plugins, /extensions: Electron drag strip
 * + sticky customize nav (wide) or compact tabs (narrow) + content column.
 */
export function ExtensionsPageShell({
  children,
  testId,
  className,
}: ExtensionsPageShellProps) {
  const isCompactCustomizeNav = useBreakpoint(CUSTOMIZE_ASIDE_MIN_WIDTH);

  return (
    <div
      data-testid={testId}
      className={cn("flex h-full flex-col", className)}
    >
      <DesktopWindowDragRegion />
      <div
        className={cn(
          "flex min-h-0 flex-1 gap-4 md:gap-6",
          isCompactCustomizeNav ? "md:pl-0 lg:gap-6" : "md:pl-8 xl:gap-10 xl:pl-10",
        )}
      >
        {!isCompactCustomizeNav ? <ExtensionsNavigation /> : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {isCompactCustomizeNav ? (
            <div className="shrink-0 px-4 pt-4 md:px-6 md:pt-5">
              <ExtensionsCompactNav />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
