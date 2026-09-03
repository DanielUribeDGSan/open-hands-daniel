import type { LocalWorkspace } from "#/types/workspace";
import {
  collectDroppedDirectories,
  fileUrlOrPathToFsPath,
  getFolderBasename,
  hasDesktopFolderPicker,
  isAbsoluteFsPath,
  type DroppedDirectory,
} from "#/utils/dropped-directories";

export {
  fileUrlOrPathToFsPath,
  getFolderBasename,
  hasDesktopFolderPicker,
  isAbsoluteFsPath,
} from "#/utils/dropped-directories";

export interface DroppedFolder {
  path: string;
  name: string;
}

export type ExtractDroppedFoldersResult = {
  folders: DroppedFolder[];
  reason?: "not-folder" | "no-path" | "empty";
};

export function workspaceFromPath(
  path: string,
  name?: string,
): LocalWorkspace {
  const normalized = path.replace(/[\\/]+$/, "") || path;
  return {
    id: normalized,
    name: name?.trim() || getFolderBasename(normalized),
    path: normalized,
  };
}

function toAbsoluteFolders(
  directories: DroppedDirectory[],
): DroppedFolder[] {
  return directories
    .filter((dir): dir is DroppedDirectory & { path: string } =>
      Boolean(dir.path && isAbsoluteFsPath(dir.path)),
    )
    .map((dir) => ({ path: dir.path, name: dir.name }));
}

/**
 * Resolve dropped folders for create-workspace using the same detection as
 * the chat composer. Absolute paths are required to register a workspace.
 */
export async function extractDroppedFolders(
  dataTransfer: DataTransfer,
): Promise<ExtractDroppedFoldersResult> {
  const directories = collectDroppedDirectories(dataTransfer);
  const folders = toAbsoluteFolders(directories);

  if (folders.length > 0) {
    return { folders };
  }

  const hadDropPayload =
    (dataTransfer.files?.length ?? 0) > 0 ||
    (dataTransfer.items?.length ?? 0) > 0 ||
    (dataTransfer.types?.length ?? 0) > 0;

  // Chat detected a directory but Electron didn't expose an absolute path.
  if (directories.length > 0) {
    return { folders: [], reason: "no-path" };
  }

  if (!hadDropPayload) {
    return { folders: [], reason: "empty" };
  }

  // Something was dropped (likely a file) but no directory entry matched.
  return { folders: [], reason: "not-folder" };
}
