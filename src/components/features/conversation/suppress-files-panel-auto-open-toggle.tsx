import { useTranslation } from "react-i18next";
import { PanelRightClose } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import {
  mobileTopBarIconButtonClassName,
  mobileTopBarIconClassName,
} from "#/utils/mobile-top-bar-icon-button-classes";
import { useUiPreferencesStore } from "#/stores/ui-preferences-store";
import { useConversationStore } from "#/stores/conversation-store";
import { setConversationState } from "#/utils/conversation-local-storage";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";
import { ChatActionTooltip } from "../chat/chat-action-tooltip";

interface SuppressFilesPanelAutoOpenToggleProps {
  className?: string;
}

/**
 * Locks auto-opening of the Files right panel (chat scroll / agent edits).
 * Independent from {@link RightPanelToggle}: this control owns the preference;
 * the panel icon owns open/close. Turning the lock ON also closes the panel so
 * the lock takes effect immediately; turning it OFF never forces open/close.
 */
export function SuppressFilesPanelAutoOpenToggle({
  className,
}: SuppressFilesPanelAutoOpenToggleProps) {
  const { t } = useTranslation("openhands");
  const { conversationId } = useOptionalConversationId();
  const active = useUiPreferencesStore((s) => s.suppressFilesPanelAutoOpen);
  const setSuppress = useUiPreferencesStore(
    (s) => s.setSuppressFilesPanelAutoOpen,
  );
  const setIsRightPanelShown = useConversationStore(
    (s) => s.setIsRightPanelShown,
  );
  const setHasRightPanelToggled = useConversationStore(
    (s) => s.setHasRightPanelToggled,
  );

  const tooltipText = active
    ? t(I18nKey.COMMON$SUPPRESS_FILES_PANEL_AUTO_OPEN_ON)
    : t(I18nKey.COMMON$SUPPRESS_FILES_PANEL_AUTO_OPEN_OFF);

  const handleToggle = () => {
    const next = !active;
    setSuppress(next);

    // Only touch the drawer when enabling the lock — close it so scroll/edits
    // stay out of view. Disabling the lock leaves the panel as the user left
    // it with RightPanelToggle (avoids fighting that button / scroll reopen).
    if (next) {
      setHasRightPanelToggled(false);
      setIsRightPanelShown(false);
      if (conversationId) {
        setConversationState(conversationId, { rightPanelShown: false });
      }
    }
  };

  return (
    <ChatActionTooltip
      tooltip={
        <span className="block max-w-[240px] whitespace-normal text-left leading-snug">
          {tooltipText}
        </span>
      }
      ariaLabel={tooltipText}
    >
      <button
        type="button"
        role="switch"
        onClick={handleToggle}
        className={cn(
          mobileTopBarIconButtonClassName,
          "size-7 self-center",
          active &&
            "bg-[var(--oh-interactive-hover)] text-red-400 hover:bg-[var(--oh-interactive-hover)] hover:text-red-300",
          className,
        )}
        aria-label={tooltipText}
        aria-checked={active}
        data-testid="suppress-files-panel-auto-open-toggle"
      >
        <PanelRightClose
          className={mobileTopBarIconClassName}
          strokeWidth={1.75}
          aria-hidden
        />
      </button>
    </ChatActionTooltip>
  );
}
