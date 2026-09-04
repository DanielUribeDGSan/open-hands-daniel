import React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { StyledTooltip } from "#/components/shared/buttons/styled-tooltip";
import { useCommandMenuStore } from "#/stores/command-menu-store";
import { cn } from "#/utils/utils";
import { SidebarCollapsedIconSlot } from "#/components/features/sidebar/sidebar-collapsed-icon-slot";
import {
  SIDEBAR_ICON_SLOT_CLASS,
  sidebarNavLabelClassName,
  sidebarNavRowClassName,
} from "#/components/features/sidebar/sidebar-layout";

interface CommandMenuTriggerProps {
  collapsed: boolean;
}

const COMMAND_MENU_TRIGGER_TEST_ID = "command-menu-trigger";
const COMMAND_MENU_TRIGGER_ICON_SIZE = 18;
const COMMAND_MENU_TRIGGER_COLLAPSED_ICON_SIZE = 24;

export function CommandMenuTrigger({ collapsed }: CommandMenuTriggerProps) {
  const { t } = useTranslation("openhands");
  const open = useCommandMenuStore((state) => state.open);
  const label = t(I18nKey.COMMAND_MENU$OPEN_LABEL);
  const iconSize = collapsed
    ? COMMAND_MENU_TRIGGER_COLLAPSED_ICON_SIZE
    : COMMAND_MENU_TRIGGER_ICON_SIZE;

  const trigger = (
    <button
      type="button"
      data-testid={COMMAND_MENU_TRIGGER_TEST_ID}
      aria-label={label}
      onClick={open}
      className={cn(
        sidebarNavRowClassName({ collapsed }),
        collapsed
          ? "cursor-pointer"
          : "group justify-between border border-[var(--oh-border-subtle)] bg-[var(--oh-surface)]/50 hover:border-[var(--oh-border)] hover:bg-[var(--oh-surface-raised)]",
      )}
    >
      {collapsed ? (
        <SidebarCollapsedIconSlot active={false}>
          <Search width={iconSize} height={iconSize} />
        </SidebarCollapsedIconSlot>
      ) : (
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              SIDEBAR_ICON_SLOT_CLASS,
              "text-[var(--oh-muted)] group-hover:text-white",
            )}
            aria-hidden="true"
          >
            <Search width={iconSize} height={iconSize} />
          </span>
          <span className={sidebarNavLabelClassName(false)}>{label}</span>
        </span>
      )}
      {collapsed ? (
        <span className={sidebarNavLabelClassName(true)}>{label}</span>
      ) : (
        <kbd className="rounded-md border border-[var(--oh-border)] bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--oh-text-dim)]">
          {t(I18nKey.COMMAND_MENU$SHORTCUT)}
        </kbd>
      )}
    </button>
  );

  if (collapsed) {
    return (
      <StyledTooltip content={label} placement="right">
        {trigger}
      </StyledTooltip>
    );
  }

  return trigger;
}
