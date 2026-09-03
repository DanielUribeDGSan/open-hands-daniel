import { useTranslation } from "react-i18next";
import { cn } from "#/utils/utils";
import { Typography } from "#/ui/typography";
import { I18nKey } from "#/i18n/declaration";
import { SettingsNavRenderedItem } from "#/hooks/use-settings-nav-items";
import { SidebarNavLink } from "#/components/features/sidebar/sidebar-nav-link";
import { AgentCanvasUpdateCard } from "#/components/features/settings/agent-canvas-update-card";
import { BackendSyncedSettingsBadge } from "#/components/features/settings/backend-synced-settings-badge";
import { CloudSettingsLink } from "#/components/features/settings/cloud-settings-link";
import { IntegrationsSettingsLink } from "#/components/features/settings/integrations-settings-link";
import { NavigationLink } from "#/components/shared/navigation-link";
import { SIDEBAR_ICON_SLOT_CLASS } from "#/components/features/sidebar/sidebar-layout";
import { useNavigation } from "#/context/navigation-context";
import { HorizontalScrollTabs } from "#/components/shared/horizontal-scroll-tabs";

interface SettingsDesktopSidebarProps {
  navigationItems: SettingsNavRenderedItem[];
}

function useSettingsNavItemRows(navigationItems: SettingsNavRenderedItem[]) {
  return navigationItems.filter(
    (item): item is Extract<SettingsNavRenderedItem, { type: "item" }> =>
      item.type === "item",
  );
}

/**
 * Desktop sidebar — sibling of the scrolling main column (same pattern as
 * {@link ExtensionsNavigation}). Visibility is owned by {@link SettingsLayout}.
 */
export function SettingsDesktopSidebar({
  navigationItems,
}: SettingsDesktopSidebarProps) {
  const { t } = useTranslation("openhands");
  const desktopNavItems = useSettingsNavItemRows(navigationItems);

  return (
    <aside
      data-testid="settings-navbar-desktop"
      className={cn(
        "flex w-[220px] shrink-0 flex-col gap-2",
        "sticky top-0 self-start pl-8",
      )}
    >
      <Typography.Text className="px-2 text-sm font-normal text-white">
        {t(I18nKey.SETTINGS$TITLE)}
      </Typography.Text>
      <div className="flex flex-col gap-0.5 pt-0.5">
        {desktopNavItems.map((renderedItem) => (
          <SidebarNavLink
            key={renderedItem.item.to}
            to={renderedItem.item.to}
            label={t(renderedItem.item.text as I18nKey)}
            end
            testId={`sidebar-settings-${renderedItem.item.to}`}
            icon={renderedItem.item.icon}
          />
        ))}
        <IntegrationsSettingsLink />
        <CloudSettingsLink />
      </div>
      <div className="flex flex-col gap-2 px-2 pt-3">
        <AgentCanvasUpdateCard />
      </div>
      <div className="px-2 pt-3">
        <BackendSyncedSettingsBadge />
      </div>
    </aside>
  );
}

function CompactSettingsNavLink({
  to,
  label,
  icon,
  end = true,
  testId,
}: {
  to: string;
  label: string;
  icon?: React.ReactElement;
  end?: boolean;
  testId?: string;
}) {
  const { currentPath } = useNavigation();
  const isActive = end
    ? currentPath === to
    : currentPath === to || currentPath.startsWith(`${to}/`);

  return (
    <NavigationLink
      to={to}
      end={end}
      data-testid={testId}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm",
        isActive
          ? "bg-[var(--oh-interactive-hover)] text-white"
          : "text-[var(--oh-text-secondary)] hover:bg-[var(--oh-interactive-hover)] hover:text-white",
      )}
    >
      {icon ? (
        <span className={cn(SIDEBAR_ICON_SLOT_CLASS, "!size-4")}>{icon}</span>
      ) : null}
      <span className="truncate">{label}</span>
    </NavigationLink>
  );
}

/** Horizontal tabs when the settings aside is collapsed (&lt; xl). */
export function SettingsCompactNav({
  navigationItems,
  className,
}: {
  navigationItems: SettingsNavRenderedItem[];
  className?: string;
}) {
  const { t } = useTranslation("openhands");
  const items = useSettingsNavItemRows(navigationItems);

  return (
    <HorizontalScrollTabs
      data-testid="settings-navbar-compact"
      className={className}
    >
      {items.map((renderedItem) => (
        <CompactSettingsNavLink
          key={renderedItem.item.to}
          to={renderedItem.item.to}
          label={t(renderedItem.item.text as I18nKey)}
          icon={renderedItem.item.icon}
          end
          testId={`sidebar-settings-${renderedItem.item.to}`}
        />
      ))}
    </HorizontalScrollTabs>
  );
}
