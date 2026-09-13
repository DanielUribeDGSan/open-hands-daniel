/**
 * Source of truth for "is a newer Agent Canvas published?".
 *
 * The npm registry `latest` dist-tag endpoint is CORS-open and returns the
 * abbreviated packument for that version as JSON. Isolated here so the
 * release channel can change (e.g. GitHub releases) without touching the
 * query hook or the settings update card.
 */
const NPM_LATEST_VERSION_URL =
  "https://registry.npmjs.org/@openhands/agent-canvas/latest";

export const AGENT_CANVAS_RELEASE_NOTES_URL =
  "https://github.com/OpenHands/OpenHands/releases";

/** Literal shell commands — intentionally not localized. */
export const AGENT_CANVAS_UPDATE_COMMANDS = {
  npm: "npm install -g @openhands/agent-canvas@latest",
  docker: "docker pull ghcr.io/openhands/agent-canvas:latest",
} as const;

export async function fetchLatestAgentCanvasVersion(
  signal?: AbortSignal,
): Promise<string> {
  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const response = await fetch(`${supabaseUrl}/rest/v1/app_updates?app_id=eq.pair-bot&select=latest_version`, {
      signal,
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
        "Accept": "application/json"
      },
    });
    if (!response.ok) {
      throw new Error(`Supabase responded ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0 && data[0].latest_version) {
      return data[0].latest_version;
    }
  }

  // If Supabase is not configured or no record found, just return the current version
  // so no fake "update available" alert is shown from npm.
  const { AGENT_CANVAS_CLIENT_VERSION } = await import("./client-source");
  return AGENT_CANVAS_CLIENT_VERSION;
}
