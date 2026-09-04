import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { NoFileSelectedMessage } from "#/components/features/files-tab/no-file-selected-message";
import { I18nKey } from "#/i18n/declaration";
import { useFilesTabStore } from "#/stores/files-tab-store";
import { useWorkspaceFiles } from "#/hooks/query/use-workspace-files";
import { useWorkspaceFileContent } from "#/hooks/query/use-workspace-file-content";
import { useAutoRefreshFilesOnEdit } from "#/hooks/use-auto-refresh-files-on-edit";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";
import {
  getConversationState,
  useConversationLocalStorageState,
} from "#/utils/conversation-local-storage";
import {
  useWorkspaceMutationCounter,
  withWorkspaceCacheBuster,
} from "#/stores/use-workspace-mutation-counter";
import { FileQuickRow } from "#/components/features/files-tab/file-quick-row";
import { FileTreeView } from "#/components/features/files-tab/file-tree-view";
import { FileContentViewer } from "#/components/features/files-tab/file-content-viewer";
import { SegmentedToggle } from "#/components/features/files-tab/segmented-toggle";
import { WorkspacePath } from "#/components/features/files-tab/workspace-path";
import type { ViewMode } from "#/components/features/files-tab/view-mode";
import { FloatingTreeIsland } from "#/components/shared/floating-tree-island";
import RefreshIcon from "#/icons/u-refresh.svg?react";
import LinkExternalIcon from "#/icons/link-external.svg?react";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useAgentState } from "#/hooks/use-agent-state";
import { AgentState } from "#/types/agent-state";

/**
 * Workspace file browser. Diff/Commits live in the sibling Commits
 * conversation tab — this surface is only the file tree / content viewer.
 */
function FilesTab() {
  const { t } = useTranslation("openhands");

  // Keep the list / content caches fresh as the agent writes files.
  useAutoRefreshFilesOnEdit();

  const { data: activeConversation } = useActiveConversation();
  const { curAgentState } = useAgentState();
  const isAgentReadingOrEditing = curAgentState === AgentState.RUNNING;
  const workspacePath = activeConversation?.workspace?.working_dir;

  const { conversationId } = useOptionalConversationId();
  const {
    state: persistedState,
    setFilesTabContentViewMode,
  } = useConversationLocalStorageState(conversationId ?? "");
  const contentViewMode = persistedState.filesTabContentViewMode;
  const [treeIslandOpen, setTreeIslandOpen] = useState(false);
  // Lives above FloatingTreeIsland so expand/collapse survives remounts.
  const [expandedDirs, setExpandedDirs] = useState(
    () => new Set<string>(),
  );

  const filesQuery = useWorkspaceFiles();
  const paths = useMemo(() => filesQuery.data ?? [], [filesQuery.data]);

  const storedSelectedPath = useFilesTabStore((s) => s.selectedPath);
  const selectedConversationId = useFilesTabStore(
    (s) => s.selectedConversationId,
  );
  const openPaths = useFilesTabStore((s) => s.openPaths);
  const agentFocus = useFilesTabStore((s) => s.agentFocus);
  const clearAgentFocus = useFilesTabStore((s) => s.clearAgentFocus);
  const setSelectedPath = useFilesTabStore((s) => s.setSelectedPath);
  const closeOpenPath = useFilesTabStore((s) => s.closeOpenPath);
  const hydrateForConversation = useFilesTabStore(
    (s) => s.hydrateForConversation,
  );

  // A selection is scoped to the conversation it was made in. Ignore a path
  // that belongs to a different conversation so we never try to open a file
  // that only exists in the previous conversation's workspace (issue #1350).
  const selectedPath =
    selectedConversationId === conversationId ? storedSelectedPath : null;
  const conversationOpenPaths =
    selectedConversationId === conversationId ? openPaths : [];

  // Tag every selection with the active conversation so it can't leak into
  // the next one. Opening a path also appends it to the tab strip.
  const handleSelectFile = useCallback(
    (path: string) => {
      clearAgentFocus();
      setSelectedPath(path, conversationId);
      setTreeIslandOpen(false);
    },
    [clearAgentFocus, conversationId, setSelectedPath],
  );

  // Pre-fetch the selected file's content here too so the toolbar's
  // "open in new window" link can reach for its `staticUrl`. react-query
  // dedupes against `FileContentViewer`'s identical call, so this costs
  // nothing extra.
  const selectedFileContent = useWorkspaceFileContent(selectedPath);
  const mutationCounter = useWorkspaceMutationCounter((state) => state.count);
  const selectedFileStaticUrl = withWorkspaceCacheBuster(
    selectedFileContent.data?.staticUrl ?? null,
    mutationCounter,
  );

  // Restore open tabs / selection from conversation-scoped localStorage on
  // mount and when switching conversations (survives a full page refresh).
  // Read localStorage directly — the React hook mirror can briefly hold the
  // previous conversation's state until its sync effect runs.
  useEffect(() => {
    if (!conversationId) return;
    if (selectedConversationId === conversationId) return;
    const persisted = getConversationState(conversationId);
    hydrateForConversation(
      conversationId,
      persisted.filesTabOpenPaths ?? [],
      persisted.filesTabSelectedPath ?? null,
    );
    setExpandedDirs(new Set());
  }, [conversationId, selectedConversationId, hydrateForConversation]);

  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshFiles = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-files"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-file-content"] }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const quickRowActions = (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={refreshFiles}
        disabled={isRefreshing}
        aria-label={t(I18nKey.FILES$REFRESH)}
        title={t(I18nKey.FILES$REFRESH)}
        data-testid="files-tab-refresh"
        className="flex items-center justify-center w-[26px] py-1 rounded-[7px] hover:enabled:bg-[var(--oh-interactive-hover)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshIcon
          width={12.75}
          height={15}
          color="#ffffff"
          className={isRefreshing ? "animate-spin" : ""}
        />
      </button>
    </div>
  );

  return (
    <main
      className="relative h-full w-full flex flex-col items-stretch"
      data-testid="files-tab"
    >
      <WorkspacePath path={workspacePath} />
      {filesQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--oh-muted)]">
          {t(I18nKey.FILES$LOADING_FILES)}
        </div>
      ) : (
        <>
          <FileQuickRow
            openPaths={conversationOpenPaths}
            selectedPath={selectedPath}
            onSelectFile={handleSelectFile}
            onCloseFile={closeOpenPath}
            isTreeVisible={treeIslandOpen}
            onToggleTree={() => setTreeIslandOpen((open) => !open)}
            actions={quickRowActions}
          />
          <div className="relative flex h-full min-h-0 flex-1 flex-col">
            <section
              className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
              data-testid="files-tab-content"
            >
              {selectedPath ? (
                <>
                  <div className="oh-panel-chrome flex items-center gap-3 px-3 py-1.5 border-b border-[var(--oh-border)]">
                    <SegmentedToggle<ViewMode>
                      ariaLabel={t(I18nKey.FILES$RICH)}
                      testId="files-tab-content-mode-toggle"
                      value={contentViewMode}
                      options={[
                        { value: "rich", label: t(I18nKey.FILES$RICH) },
                        { value: "plain", label: t(I18nKey.FILES$PLAIN) },
                      ]}
                      onChange={setFilesTabContentViewMode}
                    />
                    {isAgentReadingOrEditing &&
                      agentFocus?.path === selectedPath && (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--oh-border)] bg-[var(--oh-surface)] px-2.5 py-1 text-xs text-[var(--oh-text-secondary)]"
                          data-testid="files-tab-agent-activity"
                          role="status"
                          aria-live="polite"
                        >
                          <span
                            aria-hidden="true"
                            className="size-1.5 animate-pulse rounded-full bg-[var(--oh-muted)]"
                          />
                          {/* eslint-disable-next-line i18next/no-literal-string */}
                          {agentFocus.command === "view"
                            ? "Leyendo archivo"
                            : "Modificando archivo"}
                        </span>
                      )}
                    {selectedFileStaticUrl ? (
                      <a
                        href={selectedFileStaticUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t(I18nKey.FILES$OPEN_IN_NEW_WINDOW)}
                        title={t(I18nKey.FILES$OPEN_IN_NEW_WINDOW)}
                        data-testid="files-tab-open-in-new-window"
                        className="ml-auto flex items-center justify-center w-[26px] py-1 rounded-[7px] hover:bg-[var(--oh-interactive-hover)] cursor-pointer text-white"
                      >
                        <LinkExternalIcon width={14} height={14} />
                      </a>
                    ) : null}
                  </div>
                  <FileContentViewer
                    path={selectedPath}
                    viewMode={contentViewMode}
                    agentFocus={
                      agentFocus?.path === selectedPath ? agentFocus : null
                    }
                  />
                </>
              ) : (
                <NoFileSelectedMessage />
              )}
            </section>

            <FloatingTreeIsland
              label={t(I18nKey.FILES$SHOW_FILE_TREE)}
              title={t(I18nKey.COMMON$FILES)}
              count={paths.length || undefined}
              open={treeIslandOpen}
              onOpenChange={setTreeIslandOpen}
              testId="files-tab-tree-island"
            >
              <div data-testid="files-tab-tree">
                <FileTreeView
                  paths={paths}
                  selectedPath={selectedPath}
                  onSelectFile={handleSelectFile}
                  expandedDirs={expandedDirs}
                  onExpandedDirsChange={setExpandedDirs}
                />
              </div>
            </FloatingTreeIsland>
          </div>
        </>
      )}
    </main>
  );
}

export default FilesTab;
