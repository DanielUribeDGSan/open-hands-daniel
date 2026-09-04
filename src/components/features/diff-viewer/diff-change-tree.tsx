import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileDiff,
  FileMinus2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { GitChangeStatus } from "#/api/open-hands.types";
import { cn } from "#/utils/utils";
import { FloatingTreeIsland } from "#/components/shared/floating-tree-island";
import { I18nKey } from "#/i18n/declaration";
import { FileDiffViewer } from "./file-diff-viewer";
import type { InlineFileDiff } from "./file-diff-viewer";
import {
  buildFileTree,
  type FileTreeDirNode,
  type FileTreeNode,
} from "./build-file-tree";
import type { DiffChangeListItem } from "./diff-change-list";

export interface DiffChangeTreeProps {
  changes: DiffChangeListItem[];
  commit?: string;
  /** Prefer selecting this path when the tree mounts / changes. */
  initialSelectedPath?: string | null;
  /** Optional turn before/after payloads keyed by path. */
  inlineDiffs?: Record<string, InlineFileDiff>;
}

function StatusIcon({ status }: { status: GitChangeStatus }) {
  if (status === "A" || status === "U") {
    return (
      <FilePlus2
        className="h-3.5 w-3.5 shrink-0 text-status-success-text"
        aria-hidden
      />
    );
  }
  if (status === "D") {
    return (
      <FileMinus2
        className="h-3.5 w-3.5 shrink-0 text-status-fail-text"
        aria-hidden
      />
    );
  }
  return (
    <FileDiff className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
  );
}

function DirRow({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultOpen,
}: {
  node: FileTreeDirNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center gap-1 rounded-lg px-1.5 py-1.5 text-left text-xs text-[var(--oh-text-secondary)] hover:bg-white/[0.06]"
        style={{ paddingLeft: 6 + depth * 12 }}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {open
        ? node.children.map((child) => (
            <TreeNodeRow
              key={child.kind === "dir" ? `d:${child.name}` : child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              defaultOpen={defaultOpen}
            />
          ))
        : null}
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  selectedPath,
  onSelect,
  defaultOpen,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  defaultOpen: boolean;
}) {
  if (node.kind === "dir") {
    return (
      <DirRow
        node={node}
        depth={depth}
        selectedPath={selectedPath}
        onSelect={onSelect}
        defaultOpen={defaultOpen}
      />
    );
  }

  const selected = selectedPath === node.path;
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      data-testid="diff-change-tree-file"
      data-path={node.path}
      className={cn(
        "flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1.5 text-left text-xs hover:bg-white/[0.06]",
        selected
          ? "bg-white/10 text-white"
          : "text-[var(--oh-text-secondary)]",
      )}
      style={{ paddingLeft: 6 + depth * 12 + 18 }}
    >
      <StatusIcon status={node.status} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

/**
 * Review layout: full-bleed editor with an Apple-style floating island for
 * the file tree (no side column).
 */
export function DiffChangeTree({
  changes,
  commit,
  initialSelectedPath,
  inlineDiffs,
}: DiffChangeTreeProps) {
  const { t } = useTranslation("openhands");
  const tree = useMemo(() => buildFileTree(changes), [changes]);
  const pathSet = useMemo(
    () => new Set(changes.map((change) => change.path)),
    [changes],
  );
  const [treeOpen, setTreeOpen] = useState(false);

  const [selectedPath, setSelectedPath] = useState<string | null>(() => {
    if (initialSelectedPath && pathSet.has(initialSelectedPath)) {
      return initialSelectedPath;
    }
    return changes[0]?.path ?? null;
  });

  useEffect(() => {
    if (initialSelectedPath && pathSet.has(initialSelectedPath)) {
      setSelectedPath(initialSelectedPath);
      return;
    }
    setSelectedPath((prev) =>
      prev && pathSet.has(prev) ? prev : (changes[0]?.path ?? null),
    );
  }, [changes, initialSelectedPath, pathSet]);

  const selectedChange = changes.find((change) => change.path === selectedPath);

  if (changes.length === 0) {
    return null;
  }

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    setTreeOpen(false);
  };

  return (
    <div
      data-testid="diff-change-tree"
      className="relative flex h-full min-h-0 w-full flex-1 flex-col border-t border-[var(--oh-border)]"
    >
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {selectedChange ? (
          <FileDiffViewer
            key={`${commit ?? "wt"}:${selectedChange.path}`}
            path={selectedChange.path}
            type={selectedChange.status}
            commit={commit}
            inlineDiff={inlineDiffs?.[selectedChange.path]}
            isExpanded
            onToggle={() => undefined}
            fillHeight
          />
        ) : null}
      </section>

      <FloatingTreeIsland
        label={t(I18nKey.FILES$SHOW_FILE_TREE)}
        title={t(I18nKey.COMMON$FILES)}
        count={changes.length}
        open={treeOpen}
        onOpenChange={setTreeOpen}
        testId="diff-change-tree-island"
      >
        <div data-testid="diff-change-tree-sidebar">
          {tree.map((node) => (
            <TreeNodeRow
              key={node.kind === "dir" ? `d:${node.name}` : node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              onSelect={handleSelect}
              defaultOpen
            />
          ))}
        </div>
      </FloatingTreeIsland>
    </div>
  );
}
