import React from "react";
import { useTranslation } from "react-i18next";
import { GitCommit } from "#/api/open-hands.types";
import { I18nKey } from "#/i18n/declaration";
import { CommitRow } from "./commit-row";
import { UncommittedChangesRow } from "./uncommitted-changes-row";
import type { DiffChangeListItem } from "./diff-change-list";
import type { InlineFileDiff } from "./file-diff-viewer";

const UNCOMMITTED_KEY = "uncommitted";

export interface CommitListProps {
  commits: GitCommit[];
  /** True when the server capped the page — surfaces the cap notice. */
  hasMore: boolean;
  uncommittedChanges: DiffChangeListItem[];
  autoExpandUncommitted?: boolean;
  onAutoExpandHandled?: () => void;
  initialExpandedPath?: string | null;
  /** Turn Vista previa before/after payloads keyed by path. */
  inlineDiffs?: Record<string, InlineFileDiff>;
}

/**
 * The workspace's recent commit history (newest first). Single-open
 * accordion: expanding a commit collapses the previously expanded one.
 * Empty/loading/waiting states are the host view's job
 * (see routes/commits-tab.tsx).
 */
export function CommitList({
  commits,
  hasMore,
  uncommittedChanges,
  autoExpandUncommitted = false,
  onAutoExpandHandled,
  initialExpandedPath,
  inlineDiffs,
}: CommitListProps) {
  const { t } = useTranslation("openhands");
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);
  const newestCommitSha = commits[0]?.sha ?? null;

  React.useEffect(() => {
    if (!autoExpandUncommitted) return;
    // After commit/push the working tree is clean — fall back to the newest
    // commit so Review still shows a file tree + diffs for the turn.
    if (uncommittedChanges.length > 0) {
      setExpandedKey(UNCOMMITTED_KEY);
    } else if (newestCommitSha) {
      setExpandedKey(newestCommitSha);
    } else {
      setExpandedKey(UNCOMMITTED_KEY);
    }
    // Parent must flip autoExpandUncommitted off here (e.g. clear the
    // one-shot store flag). Leaving it true re-fires this effect forever
    // (React #185 / max update depth) — especially when `commits` is a
    // freshly allocated `[]` each render in turn-preview mode.
    onAutoExpandHandled?.();
  }, [
    autoExpandUncommitted,
    onAutoExpandHandled,
    uncommittedChanges.length,
    newestCommitSha,
  ]);

  // Author is noise when every commit has the same one (the usual
  // single-agent conversation); show it only when authors differ.
  const showAuthor = new Set(commits.map((commit) => commit.author)).size > 1;

  return (
    <section data-testid="commit-list" className="w-full flex flex-col">
      <UncommittedChangesRow
        changes={uncommittedChanges}
        isExpanded={expandedKey === UNCOMMITTED_KEY}
        onToggle={() =>
          setExpandedKey((prev) =>
            prev === UNCOMMITTED_KEY ? null : UNCOMMITTED_KEY,
          )
        }
        initialExpandedPath={initialExpandedPath}
        inlineDiffs={inlineDiffs}
      />
      {commits.map((commit) => (
        <CommitRow
          key={commit.sha}
          commit={commit}
          showAuthor={showAuthor}
          isExpanded={expandedKey === commit.sha}
          onToggle={() =>
            setExpandedKey((prev) => (prev === commit.sha ? null : commit.sha))
          }
        />
      ))}

      {hasMore && (
        <div
          data-testid="commit-list-cap-notice"
          className="px-3 py-2.5 text-xs text-[var(--oh-muted)]"
        >
          {t(I18nKey.DIFF_VIEWER$COMMITS_CAP, { count: commits.length })}
        </div>
      )}
    </section>
  );
}
