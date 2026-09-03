import { describe, it, expect } from "vitest";
import { buildFileTree } from "#/components/features/diff-viewer/build-file-tree";

describe("buildFileTree", () => {
  it("nests files under shared folder segments", () => {
    const tree = buildFileTree([
      { path: "src/components/Header.tsx", status: "M" },
      { path: "src/context/TodoContext.tsx", status: "A" },
      { path: "package.json", status: "M" },
    ]);

    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({ kind: "dir", name: "src" });
    expect(tree[1]).toMatchObject({
      kind: "file",
      name: "package.json",
      path: "package.json",
      status: "M",
    });

    const src = tree[0];
    if (src.kind !== "dir") {
      throw new Error("expected src dir");
    }
    expect(src.children.map((child) => child.name)).toEqual([
      "components",
      "context",
    ]);
  });

  it("sorts directories before files at the same level", () => {
    const tree = buildFileTree([
      { path: "z.ts", status: "M" },
      { path: "a/b.ts", status: "A" },
    ]);
    expect(tree.map((node) => node.name)).toEqual(["a", "z.ts"]);
  });
});
