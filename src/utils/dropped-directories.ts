/**
 * Shared directory drag-and-drop helpers.
 *
 * The chat input already detects Finder/Explorer folder drops via
 * `webkitGetAsEntry().isDirectory` + `File.path`. Create-workspace must use
 * the same detection so behavior stays identical.
 */

export interface DesktopFolderApi {
  getPathForFile: (file: File) => string | null;
  isDirectory?: (path: string) => Promise<boolean>;
  showOpenDirectory: (options?: {
    multiple?: boolean;
  }) => Promise<string[]>;
  getSshHosts?: () => Promise<{name: string, hostName: string, user: string, identityFile: string, port?: number, password?: string}[]>;
  mountSshWorkspace?: (host: {name: string, hostName: string, user: string, identityFile: string, port?: number, password?: string}, remotePath: string, targetDirName?: string, conversationId?: string) => Promise<string | null>;
  connectSsh?: (host: {name: string, hostName: string, user: string, identityFile: string, port?: number, password?: string}) => Promise<{success: boolean}>;
  disconnectSsh?: () => Promise<{success: boolean}>;
  listRemoteFiles?: (remotePath: string) => Promise<{name: string, path: string, isDirectory: boolean}[]>;
}

declare global {
  interface Window {
    desktop?: DesktopFolderApi;
  }
}

export interface DroppedDirectory {
  name: string;
  /**
   * Absolute filesystem path when Electron/Chromium exposes it.
   * May be null — the chat still attaches the folder by name in that case.
   */
  path: string | null;
}

export type FolderFile = File & {
  isFolder?: boolean;
  folderPath?: string;
};

function trimTrailingSeparators(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, "");
  if (/^[A-Za-z]:$/.test(trimmed)) {
    const separator = path.includes("/") && !path.includes("\\") ? "/" : "\\";
    return `${trimmed}${separator}`;
  }
  return trimmed;
}

export function getFolderBasename(path: string): string {
  const trimmed = trimTrailingSeparators(path);
  if (!trimmed) return "/";
  if (trimmed === "/" || /^[A-Za-z]:[\\/]?$/.test(trimmed)) return trimmed;
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return idx >= 0 ? trimmed.slice(idx + 1) || trimmed : trimmed;
}

export function isAbsoluteFsPath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path);
}

export function fileUrlOrPathToFsPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  if (trimmed.startsWith("file:")) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "file:") return null;
      let pathname = decodeURIComponent(parsed.pathname);
      if (/^\/[A-Za-z]:\//.test(pathname)) {
        pathname = pathname.slice(1);
      }
      return pathname;
    } catch {
      return null;
    }
  }

  if (isAbsoluteFsPath(trimmed)) return trimmed;
  return null;
}

function resolveAbsolutePathFromFile(file: File | undefined): string | null {
  if (!file) return null;

  // Same order as the chat: legacy Electron `File.path` first (what works in
  // the composer today), then the preload bridge.
  const legacy = (file as File & { path?: string }).path;
  if (typeof legacy === "string" && isAbsoluteFsPath(legacy)) {
    return trimTrailingSeparators(legacy) || legacy;
  }

  const fromDesktop = window.desktop?.getPathForFile?.(file);
  if (typeof fromDesktop === "string" && isAbsoluteFsPath(fromDesktop)) {
    return trimTrailingSeparators(fromDesktop) || fromDesktop;
  }

  return null;
}

export function pathsFromDataTransferText(dataTransfer: DataTransfer): string[] {
  const blobs = new Set<string>();

  for (const type of ["text/uri-list", "text/plain", "text/hfs+url"] as const) {
    try {
      const raw = dataTransfer.getData(type);
      if (raw) blobs.add(raw);
    } catch {
      // ignore
    }
  }

  const paths: string[] = [];
  const seen = new Set<string>();
  for (const blob of blobs) {
    for (const line of blob.split(/\r?\n/)) {
      const path = fileUrlOrPathToFsPath(line);
      if (!path) continue;
      const normalized = trimTrailingSeparators(path) || path;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      paths.push(normalized);
    }
  }
  return paths;
}

/**
 * Detect dropped directories exactly like {@link useFileHandling} in chat:
 * iterate `items[i]` + `files[i]`, require `webkitGetAsEntry().isDirectory`.
 */
export function collectDroppedDirectories(
  dataTransfer: DataTransfer,
): DroppedDirectory[] {
  const results: DroppedDirectory[] = [];
  const seenNames = new Set<string>();

  if (dataTransfer.items && dataTransfer.files) {
    for (let i = 0; i < dataTransfer.items.length; i += 1) {
      const item = dataTransfer.items[i];
      const originalFile = dataTransfer.files[i];
      if (item.kind !== "file") continue;

      const entry =
        typeof item.webkitGetAsEntry === "function"
          ? item.webkitGetAsEntry()
          : null;

      if (!(entry && entry.isDirectory)) continue;

      const name = entry.name || originalFile?.name || "folder";
      const path = resolveAbsolutePathFromFile(originalFile);
      results.push({ name, path });
      seenNames.add(name);
    }
  }

  // Fill absolute paths from file:// URI list when File.path was missing.
  const fromText = pathsFromDataTransferText(dataTransfer);
  for (const dir of results) {
    if (dir.path) continue;
    const match = fromText.find(
      (candidate) => getFolderBasename(candidate) === dir.name,
    );
    if (match) dir.path = match;
  }

  // If chat-style detection found nothing, still accept absolute URI paths
  // (some hosts omit directory entries but still send file:// URLs).
  if (results.length === 0) {
    for (const path of fromText) {
      const name = getFolderBasename(path);
      if (seenNames.has(name)) continue;
      seenNames.add(name);
      results.push({ name, path });
    }
  }

  return results;
}

/**
 * Build the fake `File` objects the chat store already understands
 * (`isFolder` + `folderPath`), matching prior chat behavior.
 */
export function droppedDirectoriesToFolderFiles(
  directories: DroppedDirectory[],
): FolderFile[] {
  return directories.map((dir) => {
    const fakeFile = new File([], dir.name, {
      type: "directory",
    }) as FolderFile;
    fakeFile.isFolder = true;
    fakeFile.folderPath = dir.path || dir.name;
    return fakeFile;
  });
}

export function hasDesktopFolderPicker(): boolean {
  return typeof window.desktop?.showOpenDirectory === "function";
}
