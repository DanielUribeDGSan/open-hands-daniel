import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { AccordionPanel } from "./accordion-panel";
import type { DiffChangeListItem } from "./diff-change-list";
import { DiffChangeTree } from "./diff-change-tree";
import type { InlineFileDiff } from "./file-diff-viewer";

const EMPTY_COMMIT_SHA_PLACEHOLDER = "-";
/** Base key for i18next pluralization (`_one` / `_other` suffixes). */
const UNCOMMITTED_FILE_COUNT_I18N_KEY = "DIFF_VIEWER$UNCOMMITTED_FILE_COUNT";

export interface UncommittedChangesRowProps {
  changes: DiffChangeListItem[];
  isExpanded: boolean;
  onToggle: () => void;
  initialExpandedPath?: string | null;
  inlineDiffs?: Record<string, InlineFileDiff>;
  /** Stretch the expanded tree + diff to the remaining panel height. */
  fillAvailable?: boolean;
}

/**
 * Top accordion row in the Commits pane for working-tree changes that
 * are not yet associated with a commit. Same single-open accordion
 * contract as CommitRow.
 */
export function UncommittedChangesRow({
  changes,
  isExpanded,
  onToggle,
  initialExpandedPath,
  inlineDiffs,
  fillAvailable = false,
}: UncommittedChangesRowProps) {
  const { t } = useTranslation("openhands");
  const fill = fillAvailable && isExpanded;

  return (
    <div
      data-testid="uncommitted-changes-row"
      className={cn("flex w-full flex-col", fill && "min-h-0 flex-1")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        data-testid="uncommitted-changes-row-toggle"
        className="flex h-10 w-full flex-shrink-0 cursor-pointer items-center gap-2 border-b border-[var(--oh-border)] px-3 text-left text-sm text-content"
      >
        <code className="w-[7ch] flex-shrink-0 text-center font-mono text-xs text-[var(--oh-muted)]">
          {EMPTY_COMMIT_SHA_PLACEHOLDER}
        </code>
        <strong className="flex-1 truncate font-medium">
          {t(I18nKey.DIFF_VIEWER$UNCOMMITTED)}
        </strong>
        {changes.length > 0 ? (
          <span
            data-testid="uncommitted-changes-count"
            className="flex-shrink-0 text-xs tabular-nums text-[var(--oh-muted)]"
          >
            {t(UNCOMMITTED_FILE_COUNT_I18N_KEY, { count: changes.length })}
          </span>
        ) : null}
        {isExpanded ? (
          <ChevronDown
            className="h-4 w-4 shrink-0 text-[var(--oh-muted)]"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="h-4 w-4 shrink-0 text-[var(--oh-muted)]"
            aria-hidden
          />
        )}
      </button>

      <AccordionPanel
        open={isExpanded}
        testId="uncommitted-changes-row-content"
        fill={fill}
        className="flex w-full flex-col"
      >
        {changes.length > 0 ? (
          <DiffChangeTree
            changes={changes}
            initialSelectedPath={initialExpandedPath}
            inlineDiffs={inlineDiffs}
          />
        ) : null}
      </AccordionPanel>
    </div>
  );
}
