import { beforeEach, describe, expect, it } from "vitest";
import { useConversationStore } from "#/stores/conversation-store";
import { useUiPreferencesStore } from "#/stores/ui-preferences-store";
import { revealConversationTab } from "#/utils/reveal-conversation-tab";

describe("revealConversationTab", () => {
  beforeEach(() => {
    useConversationStore.setState({
      selectedTab: null,
      isRightPanelShown: false,
      hasRightPanelToggled: false,
      isOverviewPanelShown: false,
    });
    useUiPreferencesStore.setState({ suppressFilesPanelAutoOpen: false });
  });

  it("opens the panel for files by default", () => {
    revealConversationTab("files");
    expect(useConversationStore.getState().selectedTab).toBe("files");
    expect(useConversationStore.getState().isRightPanelShown).toBe(true);
  });

  it("does not open the panel for files when auto-open is suppressed", () => {
    useUiPreferencesStore.setState({ suppressFilesPanelAutoOpen: true });
    revealConversationTab("files");
    expect(useConversationStore.getState().selectedTab).toBe("files");
    expect(useConversationStore.getState().isRightPanelShown).toBe(false);
  });

  it("still opens the panel for terminal when files auto-open is suppressed", () => {
    useUiPreferencesStore.setState({ suppressFilesPanelAutoOpen: true });
    revealConversationTab("terminal");
    expect(useConversationStore.getState().selectedTab).toBe("terminal");
    expect(useConversationStore.getState().isRightPanelShown).toBe(true);
  });

  it("force-opens files even when suppressed", () => {
    useUiPreferencesStore.setState({ suppressFilesPanelAutoOpen: true });
    revealConversationTab("files", { force: true });
    expect(useConversationStore.getState().isRightPanelShown).toBe(true);
  });
});
