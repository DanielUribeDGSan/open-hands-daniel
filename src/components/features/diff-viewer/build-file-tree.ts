import type { GitChangeStatus } from "#/api/open-hands.types";
import type { DiffChangeListItem } from "./diff-change-list";

export type FileTreeFileNode = {
  kind: "file";
  name: string;
  path: string;
  status: GitChangeStatus;
};

export type FileTreeDirNode = {
  kind: "dir";
  name: string;
  children: FileTreeNode[];
};

export type FileTreeNode = FileTreeFileNode | FileTreeDirNode;

type MutableDir = {
  kind: "dir";
  name: string;
  children: Map<string, MutableDir | FileTreeFileNode>;
};

function freezeDir(dir: MutableDir): FileTreeNode[] {
  return [...dir.children.values()]
    .map((child) =>
      child.kind === "dir"
        ? { kind: "dir" as const, name: child.name, children: freezeDir(child) }
        : child,
    )
    .sort((a, b) => {
      if (a.kind !== b.kind) {
        return a.kind === "dir" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
}

/**
 * Build a nested folder tree from flat git change paths (Codex-style Review).
 */
export function buildFileTree(changes: DiffChangeListItem[]): FileTreeNode[] {
  const root: MutableDir = { kind: "dir", name: "", children: new Map() };

  for (const change of changes) {
    const parts = change.path.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let node = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]!;
      const isFile = i === parts.length - 1;
      if (isFile) {
        node.children.set(part, {
          kind: "file",
          name: part,
          path: change.path,
          status: change.status,
        });
        continue;
      }

      const existing = node.children.get(part);
      if (existing?.kind === "dir") {
        node = existing;
        continue;
      }

      const next: MutableDir = {
        kind: "dir",
        name: part,
        children: new Map(),
      };
      node.children.set(part, next);
      node = next;
    }
  }

  return freezeDir(root);
}
