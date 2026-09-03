import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileDiff,
  FileMinus2,
} from "lucide-react";
import type { GitChangeStatus } from "#/api/open-hands.types";
import { cn } from "#/utils/utils";
import { ResizeHandle } from "#/components/ui/resize-handle";
import { useResizablePanels } from "#/hooks/use-resizable-panels";
import { FileDiffViewer } from "./file-diff-viewer";
import {
  buildFileTree,
  type FileTreeDirNode,
  type FileTreeNode,
} from "./build-file-tree";
import type { DiffChangeListItem } from "./diff-change-list";

const REVIEW_TREE_SIDEBAR_MIN_PX = 120;
const REVIEW_TREE_SIDEBAR_STORAGE_KEY = "review-diff-tree-left-width";

export interface DiffChangeTreeProps {
  changes: DiffChangeListItem[];
  commit?: string;
  /** Prefer selecting this path when the tree mounts / changes. */
  initialSelectedPath?: string | null;
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
        className="flex w-full cursor-pointer items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs text-[var(--oh-text-secondary)] hover:bg-[var(--oh-interactive-hover)]"
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
        "flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs hover:bg-[var(--oh-interactive-hover)]",
        selected && "bg-[var(--oh-interactive-hover)] text-white",
        !selected && "text-[var(--oh-text-secondary)]",
      )}
      style={{ paddingLeft: 6 + depth * 12 + 18 }}
    >
      <StatusIcon status={node.status} />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

/**
 * Codex-style Review layout: code/diff on the left, folder tree on the right,
 * with a draggable divider between them.
 */
export function DiffChangeTree({
  changes,
  commit,
  initialSelectedPath,
}: DiffChangeTreeProps) {
  const tree = useMemo(() => buildFileTree(changes), [changes]);
  const pathSet = useMemo(
    () => new Set(changes.map((change) => change.path)),
    [changes],
  );

  const [selectedPath, setSelectedPath] = useState<string | null>(() => {
    if (initialSelectedPath && pathSet.has(initialSelectedPath)) {
      return initialSelectedPath;
    }
    return changes[0]?.path ?? null;
  });

  const {
    leftWidth,
    isDragging,
    containerRef,
    handleMouseDown,
  } = useResizablePanels({
    defaultLeftWidth: 62,
    minLeftWidth: 35,
    maxLeftWidth: 82,
    storageKey: REVIEW_TREE_SIDEBAR_STORAGE_KEY,
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

  return (
    <div
      ref={containerRef}
      data-testid="diff-change-tree"
      className="flex min-h-[280px] h-[min(65vh,520px)] w-full border-t border-[var(--oh-border)]"
    >
      <section
        className="min-w-0 overflow-y-auto custom-scrollbar-always"
        style={{
          width: `${leftWidth}%`,
          transition: isDragging ? "none" : "width 0.15s ease-out",
        }}
      >
        {selectedChange ? (
          <FileDiffViewer
            key={`${commit ?? "wt"}:${selectedChange.path}`}
            path={selectedChange.path}
            type={selectedChange.status}
            commit={commit}
            isExpanded
            onToggle={() => undefined}
          />
        ) : null}
      </section>

      <ResizeHandle
        onMouseDown={handleMouseDown}
        isDragging={isDragging}
        testId="diff-change-tree-resize-handle"
      />

      <aside
        data-testid="diff-change-tree-sidebar"
        className="flex shrink-0 flex-col overflow-y-auto border-l border-[var(--oh-border)] bg-[var(--oh-surface)] py-1.5 custom-scrollbar-always"
        style={{
          width: `${100 - leftWidth}%`,
          minWidth: REVIEW_TREE_SIDEBAR_MIN_PX,
          transition: isDragging ? "none" : "width 0.15s ease-out",
        }}
      >
        {tree.map((node) => (
          <TreeNodeRow
            key={node.kind === "dir" ? `d:${node.name}` : node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={setSelectedPath}
            defaultOpen
          />
        ))}
      </aside>
    </div>
  );
}
