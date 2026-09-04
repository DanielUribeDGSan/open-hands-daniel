/**
 * By default, Remix will handle hydrating your app on the client for you.
 * You are free to delete this file if you'd like to, but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.client
 */

import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import {
  AgentServerUIProviders,
  DEFAULT_AGENT_SERVER_ANALYTICS,
} from "./components/providers";
import { waitForI18n } from "./i18n";
import { shouldStartMockWorker } from "./mocks/should-start-mock-worker";

async function prepareApp() {
  await waitForI18n();

  if (shouldStartMockWorker()) {
    const { worker } = await import("./mocks/browser");

    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }

  if (import.meta.env.DEV) {
    const { installPendingChatPreview } =
      await import("./dev/seed-pending-chat-preview");
    installPendingChatPreview();
  }
}

prepareApp().then(() =>
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <AgentServerUIProviders
          analytics={DEFAULT_AGENT_SERVER_ANALYTICS}
          withStyleRoot={false}
        >
          <HydratedRouter />
        </AgentServerUIProviders>
      </StrictMode>,
    );

    // Keep the Electron splash up until the shell skeleton (or real layout)
    // is in the DOM — avoids a blank black main window between splash and UI.
    const desktop = (
      window as Window & {
        desktop?: { notifyRendererReady?: () => void };
      }
    ).desktop;

    const notifyReady = () => desktop?.notifyRendererReady?.();

    const hasUi = () =>
      Boolean(
        document.querySelector('[data-testid="app-shell-skeleton"]') ||
          document.querySelector('[data-testid="root-layout"]'),
      );

    if (hasUi()) {
      requestAnimationFrame(() => requestAnimationFrame(notifyReady));
      return;
    }

    const observer = new MutationObserver(() => {
      if (hasUi()) {
        observer.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(notifyReady));
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
    window.setTimeout(() => {
      observer.disconnect();
      notifyReady();
    }, 12_000);
  }),
);
