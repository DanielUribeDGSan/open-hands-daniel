import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { I18nKey } from "#/i18n/declaration";
import { buildFileTree } from "#/utils/file-tree";
import { TreeNode } from "./tree-node";

interface FileTreeViewProps {
  paths: string[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
  /** Controlled expanded directory paths. Prefer this when the tree remounts. */
  expandedDirs?: ReadonlySet<string>;
  onExpandedDirsChange?: (next: ReadonlySet<string>) => void;
}

export function FileTreeView({
  paths,
  selectedPath,
  onSelectFile,
  expandedDirs: controlledExpandedDirs,
  onExpandedDirsChange,
}: FileTreeViewProps) {
  const { t } = useTranslation("openhands");
  const root = useMemo(() => buildFileTree(paths), [paths]);
  const [uncontrolledExpandedDirs, setUncontrolledExpandedDirs] = useState(
    () => new Set<string>(),
  );

  const isControlled =
    controlledExpandedDirs != null && onExpandedDirsChange != null;
  const expandedDirs = isControlled
    ? controlledExpandedDirs
    : uncontrolledExpandedDirs;

  const onToggleDir = useCallback(
    (path: string) => {
      const next = new Set(expandedDirs);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      if (isControlled) onExpandedDirsChange(next);
      else setUncontrolledExpandedDirs(next);
    },
    [expandedDirs, isControlled, onExpandedDirsChange],
  );

  if (root.children.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-[var(--oh-muted)]">
        {t(I18nKey.FILES$NO_FILES)}
      </div>
    );
  }

  return (
    <ul className="py-1 custom-scrollbar-always" data-testid="file-tree-view">
      {root.children.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={0}
          selectedPath={selectedPath}
          onSelectFile={onSelectFile}
          expandedDirs={expandedDirs}
          onToggleDir={onToggleDir}
        />
      ))}
    </ul>
  );
}
