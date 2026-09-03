import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { CommitList } from "#/components/features/diff-viewer/commit-list";
import { DiffDrawerIcon } from "#/components/features/diff-viewer/diff-drawer-icon";
import type { DiffChangeListItem } from "#/components/features/diff-viewer/diff-change-list";
import type { InlineFileDiff } from "#/components/features/diff-viewer/file-diff-viewer";
import { useUnifiedGitCommits } from "#/hooks/query/use-unified-git-commits";
import { useUnifiedGetGitChanges } from "#/hooks/query/use-unified-get-git-changes";
import { useConversationId } from "#/hooks/use-conversation-id";
import { I18nKey } from "#/i18n/declaration";
import { RUNTIME_INACTIVE_STATES } from "#/types/agent-state";
import { useAgentState } from "#/hooks/use-agent-state";
import { RuntimeWaitingState } from "#/components/features/conversation-panel/runtime-waiting-state";
import { ConversationTabEmptyState } from "#/components/features/conversation/conversation-tab-empty-state";
import { useConversationStore } from "#/stores/conversation-store";
import type { GitChangeStatus } from "#/api/open-hands.types";

function pathMatchesFilter(changePath: string, wanted: Set<string>): boolean {
  if (wanted.has(changePath)) return true;
  for (const candidate of wanted) {
    if (
      changePath.endsWith(`/${candidate}`) ||
      candidate.endsWith(`/${changePath}`)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * The Files tab's "Commits" view: the workspace's recent commit history
 * (newest first), each commit expandable into its per-file diffs. Sits
 * behind the third segment of the Diff/Files toggle, which is only
 * offered when the agent server supports the commits API.
 */
function GitCommits() {
  const { t } = useTranslation("openhands");
  const { conversationId } = useConversationId();
  const { commits, hasMore, isUnsupported, isLoading, isSuccess } =
    useUnifiedGitCommits();
  const {
    data: uncommittedChanges,
    isSuccess: uncommittedSuccess,
    isLoading: uncommittedLoading,
  } = useUnifiedGetGitChanges();
  const commitsAutoExpandSection = useConversationStore(
    (state) => state.commitsAutoExpandSection,
  );
  const setCommitsAutoExpandSection = useConversationStore(
    (state) => state.setCommitsAutoExpandSection,
  );
  const commitsAutoExpandPath = useConversationStore(
    (state) => state.commitsAutoExpandPath,
  );
  const commitsReviewFilterPaths = useConversationStore(
    (state) => state.commitsReviewFilterPaths,
  );
  const commitsReviewTurnFiles = useConversationStore(
    (state) => state.commitsReviewTurnFiles,
  );
  const handleAutoExpandHandled = useCallback(() => {
    setCommitsAutoExpandSection(null);
  }, [setCommitsAutoExpandSection]);

  const { curAgentState } = useAgentState();
  const runtimeIsActive = !RUNTIME_INACTIVE_STATES.includes(curAgentState);

  const turnPreview = Boolean(commitsReviewTurnFiles?.length);

  const inlineDiffs = useMemo(() => {
    if (!commitsReviewTurnFiles?.length) return undefined;
    const map: Record<string, InlineFileDiff> = {};
    for (const file of commitsReviewTurnFiles) {
      map[file.path] = { original: file.before, modified: file.after };
    }
    return map;
  }, [commitsReviewTurnFiles]);

  const filteredUncommitted = useMemo((): DiffChangeListItem[] => {
    // Vista previa del turno: solo esos archivos, con árbol Codex-style.
    if (commitsReviewTurnFiles?.length) {
      return commitsReviewTurnFiles.map((file) => {
        const status: GitChangeStatus =
          file.before === "" && file.after !== "" ? "A" : "M";
        return { path: file.path, status };
      });
    }

    const all = uncommittedSuccess ? (uncommittedChanges ?? []) : [];
    if (!commitsReviewFilterPaths?.length) {
      return all.slice(0, 100);
    }
    const wanted = new Set(commitsReviewFilterPaths);
    const matched = all.filter((change) =>
      pathMatchesFilter(change.path, wanted),
    );
    // Explicit filter with no matches: keep empty (don't dump the whole repo).
    return matched.slice(0, 100);
  }, [
    commitsReviewFilterPaths,
    commitsReviewTurnFiles,
    uncommittedChanges,
    uncommittedSuccess,
  ]);

  const hasCommits =
    !turnPreview && isSuccess && !isUnsupported && commits.length > 0;
  const hasUncommitted = filteredUncommitted.length > 0;
  const showList = hasCommits || hasUncommitted;
  const isListLoading =
    !turnPreview && (isLoading || (runtimeIsActive && uncommittedLoading));

  return (
    <main className="h-full w-full flex flex-col items-stretch">
      {showList ? (
        <div className="h-full overflow-y-auto flex flex-col items-stretch custom-scrollbar-always">
          {/* Keyed by conversation so switching conversations collapses any
              expanded commit. */}
          <CommitList
            key={conversationId}
            commits={hasCommits ? commits : []}
            hasMore={hasCommits ? hasMore : false}
            uncommittedChanges={filteredUncommitted}
            inlineDiffs={inlineDiffs}
            autoExpandUncommitted={
              turnPreview || commitsAutoExpandSection === "uncommitted"
            }
            onAutoExpandHandled={handleAutoExpandHandled}
            initialExpandedPath={commitsAutoExpandPath}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          {!runtimeIsActive && (
            <RuntimeWaitingState
              testId="commits-tab-status"
              messageKey={I18nKey.DIFF_VIEWER$WAITING_FOR_RUNTIME}
            />
          )}
          {runtimeIsActive && isListLoading && (
            <RuntimeWaitingState
              testId="commits-tab-status"
              messageKey={I18nKey.DIFF_VIEWER$LOADING}
            />
          )}
          {runtimeIsActive && !isListLoading && (
            <ConversationTabEmptyState icon={<DiffDrawerIcon />}>
              {t(I18nKey.DIFF_VIEWER$NO_COMMITS)}
            </ConversationTabEmptyState>
          )}
        </div>
      )}
    </main>
  );
}

export default GitCommits;
