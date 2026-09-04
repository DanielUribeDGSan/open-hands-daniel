import {
  useConversationStore,
  type ConversationTab,
} from "#/stores/conversation-store";
import { shouldSuppressFilesPanelAutoOpen } from "#/stores/ui-preferences-store";

/**
 * Select a conversation drawer tab and optionally reveal the right panel.
 * Auto-opens are suppressed for `files` when the user locked that behavior;
 * browser / terminal / commits / etc. still open the panel.
 */
export function revealConversationTab(
  tab: ConversationTab,
  options?: { force?: boolean },
): void {
  const store = useConversationStore.getState();
  store.setSelectedTab(tab);
  store.setIsOverviewPanelShown(false);

  const suppress =
    !options?.force &&
    tab === "files" &&
    shouldSuppressFilesPanelAutoOpen();

  if (suppress) return;

  store.setHasRightPanelToggled(true);
  store.setIsRightPanelShown(true);
}
