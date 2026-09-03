/**
 * Shared layout tokens for /settings/* and extensions pages (/skills, /mcp,
 * /plugins) so content keeps horizontal inset on every width — including
 * compact mid-size layouts where the section aside collapses to tabs.
 *
 * `scrollbar-gutter: stable` keeps the gutter reserved when the page stops
 * overflowing. Without it, filtering a list short enough to fit drops the
 * scrollbar and the centered content jumps sideways into the freed space.
 */
export const settingsLikeMainScrollClassName =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] custom-scrollbar-always px-4 pt-4 pb-12 md:px-6 md:pt-5 md:pr-6";

/** Same scroll shell as {@link settingsLikeMainScrollClassName}. */
export const settingsLayoutMainScrollClassName =
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] custom-scrollbar-always px-4 pt-4 pb-12 md:px-6 md:pt-5 md:pr-6";
