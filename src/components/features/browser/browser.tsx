import { BrowserSnapshot } from "./browser-snapshot";
import { BrowserChromeBar } from "./browser-chrome-bar";
import { EmptyBrowserMessage } from "./empty-browser-message";
import { useBrowserStore } from "#/stores/browser-store";

export function BrowserPanel() {
  const { url, screenshotSrc } = useBrowserStore();
  const hasPage = Boolean(url);

  return (
    <div className="flex h-full min-h-0 w-full flex-col text-[var(--oh-muted)] relative">
      <BrowserChromeBar url={url} hasPage={hasPage} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white relative z-0">
        {hasPage ? (
          <iframe
            src={url}
            title="Interactive Browser"
            className="w-full h-full border-none absolute inset-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
            allow="camera; microphone; geolocation; display-capture"
          />
        ) : (
          <div className="flex-1 bg-[var(--oh-surface)] flex flex-col items-center justify-center">
            <EmptyBrowserMessage />
          </div>
        )}
      </div>
    </div>
  );
}
