import { create } from "zustand";

interface ChatScrollSyncState {
  /**
   * True while the chat is still scrolling / waiting to apply the latest
   * right-panel focus. The panel shows a code-preview skeleton instead of
   * thrashing content on every scroll tick.
   */
  isPending: boolean;
  /** Bumps when a deferred focus is applied so the panel can fade content in. */
  revealKey: string | null;
  setPending: (isPending: boolean) => void;
  setRevealKey: (revealKey: string | null) => void;
}

export const useChatScrollSyncStore = create<ChatScrollSyncState>((set) => ({
  isPending: false,
  revealKey: null,
  setPending: (isPending) => set({ isPending }),
  setRevealKey: (revealKey) => set({ revealKey }),
}));
