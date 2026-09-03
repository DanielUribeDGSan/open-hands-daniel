import { cn } from "#/utils/utils";

interface DesktopWindowDragRegionProps {
  className?: string;
}

/**
 * Empty Electron titlebar strip so the window can be dragged from the top of
 * the main content column. Conversation pages already ship their own strip;
 * Personalizar / Automate / Settings use this instead.
 */
export function DesktopWindowDragRegion({
  className,
}: DesktopWindowDragRegionProps) {
  return (
    <div
      aria-hidden
      data-testid="desktop-window-drag-region"
      className={cn(
        "hidden h-8 w-full shrink-0 md:block [-webkit-app-region:drag]",
        className,
      )}
    />
  );
}
