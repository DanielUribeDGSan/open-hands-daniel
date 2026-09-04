import React from "react";
import { useTranslation } from "react-i18next";
import { FolderPlus, Server, X } from "lucide-react";
import toast from "react-hot-toast";

import { BaseModalTitle } from "#/components/shared/modals/confirmation-modals/base-modal";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalCloseButton } from "#/components/shared/modals/modal-close-button";
import {
  MODAL_MAX_WIDTH_VIEWPORT,
  modalWidthClassName,
} from "#/components/shared/modals/modal-body";
import { BrandButton } from "#/components/features/settings/brand-button";
import { FolderBrowserModal } from "#/components/features/home/workspace-dropdown/folder-browser-modal";
import { I18nKey } from "#/i18n/declaration";
import { LocalWorkspace, LocalWorkspaceParent } from "#/types/workspace";
import { cn } from "#/utils/utils";
import { modalTitleSmClassName } from "#/utils/modal-classes";
import FolderIcon from "#/icons/folder.svg?react";
import {
  searchAllSubdirectories,
  useHomeDirectory,
} from "#/hooks/query/use-search-subdirs";
import {
  collectDroppedDirectories,
  fileUrlOrPathToFsPath,
  getFolderBasename,
  hasDesktopFolderPicker,
  isAbsoluteFsPath,
} from "#/utils/dropped-directories";
import { workspaceFromPath } from "#/utils/desktop-folder-path";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (items: LocalWorkspace[]) => void;
  onAddParent?: (items: LocalWorkspaceParent[]) => void;
}

interface SelectedFolder {
  /** Stable key while path may still be resolving. */
  key: string;
  name: string;
  /** Absolute path when known; null while waiting for paste / resolve. */
  path: string | null;
  resolving?: boolean;
}

async function findChildDirectory(
  parentPath: string,
  name: string,
): Promise<string | null> {
  try {
    const listing = await searchAllSubdirectories(parentPath);
    const hit = listing.items.find((entry) => entry.name === name);
    return hit?.path ?? null;
  } catch {
    return null;
  }
}

/**
 * Best-effort resolve of a dropped folder name via the agent-server file API
 * (same filesystem the classic browser modal walks).
 */
async function resolveFolderNameToPath(
  name: string,
  home: string | undefined,
): Promise<string | null> {
  if (!home) return null;

  const directParents = [
    home,
    `${home}/Documents`,
    `${home}/Desktop`,
    `${home}/Downloads`,
  ];

  for (const parent of directParents) {
    const hit = await findChildDirectory(parent, name);
    if (hit) return hit;
  }

  // One level under Documents (e.g. Documents/uribe-desarrollo/3d-projects).
  try {
    const docs = await searchAllSubdirectories(`${home}/Documents`);
    for (const entry of docs.items) {
      const hit = await findChildDirectory(entry.path, name);
      if (hit) return hit;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Codex-style create-workspace flow: drag a folder (or pick via native /
 * in-app browser). Name defaults to the folder basename; same `onAdd` path
 * as the classic folder browser.
 */
export function CreateWorkspaceModal({
  isOpen,
  onClose,
  onAdd,
  onAddParent,
}: CreateWorkspaceModalProps) {
  const { t } = useTranslation("openhands");
  const { data: homeData } = useHomeDirectory();
  const [projectName, setProjectName] = React.useState("");
  const [folders, setFolders] = React.useState<SelectedFolder[]>([]);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [browserOpen, setBrowserOpen] = React.useState(false);
  const [pastedPath, setPastedPath] = React.useState("");
  const nameEditedRef = React.useRef(false);
  const pasteInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setProjectName("");
      setFolders([]);
      setIsDragOver(false);
      setBrowserOpen(false);
      setPastedPath("");
      nameEditedRef.current = false;
    }
  }, [isOpen]);

  const upsertFolders = React.useCallback((incoming: SelectedFolder[]) => {
    if (incoming.length === 0) return;
    setFolders((prev) => {
      const byKey = new Map(prev.map((item) => [item.key, item]));
      for (const item of incoming) {
        const existing =
          byKey.get(item.key) ||
          [...byKey.values()].find(
            (candidate) =>
              candidate.name === item.name ||
              (item.path && candidate.path === item.path),
          );
        if (existing) {
          byKey.delete(existing.key);
          byKey.set(item.key, {
            ...existing,
            ...item,
            path: item.path ?? existing.path,
            resolving: item.resolving ?? false,
          });
        } else {
          byKey.set(item.key, item);
        }
      }
      return Array.from(byKey.values());
    });
    if (!nameEditedRef.current) {
      setProjectName(incoming[0]?.name || "");
    }
  }, []);

  const addAbsoluteFolders = React.useCallback(
    (incoming: LocalWorkspace[]) => {
      upsertFolders(
        incoming.map((item) => ({
          key: item.path,
          name: item.name,
          path: item.path,
          resolving: false,
        })),
      );
    },
    [upsertFolders],
  );

  const handleBrowse = React.useCallback(async () => {
    if (hasDesktopFolderPicker()) {
      try {
        const paths = await window.desktop!.showOpenDirectory({
          multiple: true,
        });
        if (paths.length > 0) {
          addAbsoluteFolders(paths.map((path) => workspaceFromPath(path)));
        }
        return;
      } catch {
        // Fall through to in-app browser.
      }
    }
    setBrowserOpen(true);
  }, [addAbsoluteFolders]);

  const resolvePendingFolder = React.useCallback(
    async (folder: SelectedFolder) => {
      const resolved = await resolveFolderNameToPath(
        folder.name,
        homeData?.home,
      );

      if (!resolved) {
        setFolders((prev) =>
          prev.map((item) =>
            item.key === folder.key ? { ...item, resolving: false } : item,
          ),
        );
        // Stay on this modal — paste the full path or use Explorar manually.
        window.setTimeout(() => pasteInputRef.current?.focus(), 0);
        return;
      }

      setFolders((prev) => {
        const next = prev.filter(
          (item) => item.key !== folder.key && item.path !== resolved,
        );
        next.push({
          key: resolved,
          name: folder.name,
          path: resolved,
          resolving: false,
        });
        return next;
      });
    },
    [homeData?.home],
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const directories = collectDroppedDirectories(event.dataTransfer);
    if (directories.length === 0) {
      toast.error(t(I18nKey.HOME$DROP_FOLDER_ONLY));
      return;
    }

    const ready: SelectedFolder[] = [];
    const pending: SelectedFolder[] = [];

    for (const dir of directories) {
      if (dir.path && isAbsoluteFsPath(dir.path)) {
        ready.push({
          key: dir.path,
          name: dir.name,
          path: dir.path,
          resolving: false,
        });
      } else {
        pending.push({
          key: `pending:${dir.name}`,
          name: dir.name,
          path: null,
          resolving: true,
        });
      }
    }

    upsertFolders([...ready, ...pending]);

    // Resolve pending names via agent-server without leaving this modal.
    for (const folder of pending) {
      void resolvePendingFolder(folder);
    }

    if (pending.length > 0 && ready.length === 0) {
      toast(
        t(I18nKey.HOME$DROP_FOLDER_CONFIRM_PATH, {
          name: pending[0].name,
        }),
      );
    }
  };

  const handleAddPastedPath = async () => {
    const path = fileUrlOrPathToFsPath(pastedPath);
    if (!path) {
      toast.error(t(I18nKey.HOME$INVALID_FOLDER_PATH));
      return;
    }

    if (typeof window.desktop?.isDirectory === "function") {
      const isDir = await window.desktop.isDirectory(path);
      if (!isDir) {
        toast.error(t(I18nKey.HOME$DROP_FOLDER_ONLY));
        return;
      }
    }

    const name = getFolderBasename(path);
    // Replace a pending folder with the same name, if any.
    setFolders((prev) => {
      const withoutPending = prev.filter(
        (item) => !(item.path === null && item.name === name),
      );
      const next = [
        ...withoutPending.filter((item) => item.path !== path),
        { key: path, name, path, resolving: false },
      ];
      return next;
    });
    if (!nameEditedRef.current) {
      setProjectName(name);
    }
    setPastedPath("");
  };

  const canCreate =
    folders.length > 0 &&
    folders.every(
      (folder) =>
        !folder.resolving &&
        typeof folder.path === "string" &&
        isAbsoluteFsPath(folder.path),
    );

  const handleCreate = () => {
    if (!canCreate) return;
    const customName = projectName.trim();
    const items = folders.map((folder, index) =>
      workspaceFromPath(
        folder.path as string,
        folders.length === 1 && customName
          ? customName
          : index === 0 && customName
            ? customName
            : folder.name,
      ),
    );
    onAdd(items);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalBackdrop
        onClose={onClose}
        aria-label={t(I18nKey.HOME$CREATE_PROJECT_TITLE)}
      >
        <div
          data-testid="create-workspace-modal"
          className={cn(
            "relative flex flex-col gap-4 bg-[var(--oh-surface)] border border-[var(--oh-border-input)] rounded-xl p-5",
            modalWidthClassName("md"),
            MODAL_MAX_WIDTH_VIEWPORT,
          )}
        >
          <ModalCloseButton
            onClose={onClose}
            testId="create-workspace-close"
          />

          <BaseModalTitle
            className={modalTitleSmClassName}
            title={t(I18nKey.HOME$CREATE_PROJECT_TITLE)}
          />

          <label className="flex flex-col gap-1.5">
            <span className="sr-only">{t(I18nKey.HOME$PROJECT_NAME)}</span>
            <div className="flex items-center gap-2 rounded-lg border border-[var(--oh-border-input)] bg-[var(--oh-background)] px-3 py-2.5">
              <FolderIcon
                width={16}
                height={16}
                className="shrink-0 text-[var(--oh-muted)]"
                aria-hidden
              />
              <input
                type="text"
                data-testid="create-workspace-name"
                value={projectName}
                placeholder={t(I18nKey.HOME$PROJECT_NAME)}
                onChange={(event) => {
                  nameEditedRef.current = true;
                  setProjectName(event.target.value);
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[var(--oh-muted)]"
              />
            </div>
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-white">
                {t(I18nKey.HOME$SOURCE_FOLDERS)}
              </span>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  data-testid="create-workspace-browse"
                  onClick={() => void handleBrowse()}
                  className="cursor-pointer text-xs text-[var(--oh-text-secondary)] hover:text-white"
                >
                  {t(I18nKey.HOME$BROWSE_FOLDERS)}
                </button>
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              data-testid="create-workspace-dropzone"
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setIsDragOver(true);
              }}
              onDragLeave={(event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node)) {
                  return;
                }
                setIsDragOver(false);
              }}
              onDrop={handleDrop}
              onClick={() => void handleBrowse()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  void handleBrowse();
                }
              }}
              className={cn(
                "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
                isDragOver
                  ? "border-[var(--oh-accent)] bg-[var(--oh-accent)]/10"
                  : "border-[var(--oh-border-input)] bg-[var(--oh-background)] hover:border-[var(--oh-border)]",
              )}
            >
              <FolderPlus
                className="size-8 text-[var(--oh-muted)]"
                strokeWidth={1.5}
                aria-hidden
              />
              <p className="max-w-[260px] text-sm text-[var(--oh-text-secondary)]">
                {t(I18nKey.HOME$DROP_FOLDERS_HINT)}
              </p>
            </div>

            {folders.some((folder) => !folder.path) ? (
              <div className="flex gap-2">
                <input
                  ref={pasteInputRef}
                  type="text"
                  data-testid="create-workspace-paste-path"
                  value={pastedPath}
                  placeholder={t(I18nKey.HOME$PASTE_FOLDER_PATH)}
                  onChange={(event) => setPastedPath(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAddPastedPath();
                    }
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--oh-border-input)] bg-[var(--oh-background)] px-3 py-2 text-sm text-white outline-none placeholder:text-[var(--oh-muted)]"
                />
                <BrandButton
                  type="button"
                  variant="secondary"
                  onClick={() => void handleAddPastedPath()}
                  isDisabled={!pastedPath.trim()}
                  testId="create-workspace-add-path"
                >
                  {t(I18nKey.HOME$ADD_FOLDER_PATH)}
                </BrandButton>
              </div>
            ) : null}

            {folders.length > 0 ? (
              <ul
                className="flex flex-col gap-1.5"
                data-testid="create-workspace-selected-list"
              >
                {folders.map((folder) => (
                  <li
                    key={folder.key}
                    className="flex min-w-0 items-center gap-2 rounded-lg border border-[var(--oh-border-input)] bg-[var(--oh-background)] px-3 py-2"
                  >
                    <FolderIcon
                      width={14}
                      height={14}
                      className="shrink-0 text-[var(--oh-muted)]"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">
                        {folder.name}
                      </p>
                      <p className="truncate text-xs text-[var(--oh-muted)]">
                        {folder.resolving
                          ? t(I18nKey.HOME$LOADING)
                          : folder.path ||
                            t(I18nKey.HOME$PASTE_FOLDER_PATH)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={t(I18nKey.COMMON$REMOVE)}
                      className="inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--oh-muted)] hover:bg-white/10 hover:text-white"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFolders((prev) =>
                          prev.filter((item) => item.key !== folder.key),
                        );
                      }}
                    >
                      <X className="size-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <BrandButton
              type="button"
              variant="secondary"
              onClick={onClose}
              testId="create-workspace-cancel"
            >
              {t(I18nKey.HOME$CANCEL)}
            </BrandButton>
            <BrandButton
              type="button"
              variant="primary"
              onClick={handleCreate}
              isDisabled={!canCreate}
              testId="create-workspace-submit"
            >
              {t(I18nKey.HOME$CREATE_PROJECT)}
            </BrandButton>
          </div>
        </div>
      </ModalBackdrop>

      <FolderBrowserModal
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onAdd={(items) => {
          addAbsoluteFolders(items);
          setBrowserOpen(false);
        }}
        onAddParent={
          onAddParent
            ? (items) => {
                onAddParent(items);
                setBrowserOpen(false);
                onClose();
              }
            : undefined
        }
      />
    </>
  );
}
