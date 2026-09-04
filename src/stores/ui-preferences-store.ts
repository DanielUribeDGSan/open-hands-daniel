import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UiPreferencesState {
  /**
   * When true, auto-navigation to the Files tab (chat scroll, agent edits)
   * does not open the right panel. Browser / terminal / explicit user toggles
   * still open it.
   */
  suppressFilesPanelAutoOpen: boolean;
}

interface UiPreferencesActions {
  setSuppressFilesPanelAutoOpen: (value: boolean) => void;
  toggleSuppressFilesPanelAutoOpen: () => void;
}

type UiPreferencesStore = UiPreferencesState & UiPreferencesActions;

const STORAGE_KEY = "openhands-ui-preferences";

export const useUiPreferencesStore = create<UiPreferencesStore>()(
  persist(
    (set) => ({
      suppressFilesPanelAutoOpen: false,
      setSuppressFilesPanelAutoOpen: (suppressFilesPanelAutoOpen) =>
        set({ suppressFilesPanelAutoOpen }),
      toggleSuppressFilesPanelAutoOpen: () =>
        set((state) => ({
          suppressFilesPanelAutoOpen: !state.suppressFilesPanelAutoOpen,
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): UiPreferencesState => ({
        suppressFilesPanelAutoOpen: state.suppressFilesPanelAutoOpen,
      }),
    },
  ),
);

/** True when auto-open of the Files panel should be skipped. */
export function shouldSuppressFilesPanelAutoOpen(): boolean {
  return useUiPreferencesStore.getState().suppressFilesPanelAutoOpen;
}
