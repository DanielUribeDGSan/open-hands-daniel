import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiffChangeTree } from "#/components/features/diff-viewer/diff-change-tree";

vi.mock("#/hooks/query/use-unified-git-diff", () => ({
  useUnifiedGitDiff: () => ({
    data: { original: "a", modified: "b" },
    isLoading: false,
    isSuccess: true,
    isRefetching: false,
  }),
}));

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: () => <div data-testid="file-diff-viewer" />,
  Editor: () => <div data-testid="file-single-viewer" />,
}));

describe("DiffChangeTree", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders code on the left, tree on the right, with a resize handle", () => {
    render(
      <DiffChangeTree
        changes={[
          { path: "src/a.ts", status: "M" },
          { path: "src/b.ts", status: "A" },
        ]}
      />,
    );

    const root = screen.getByTestId("diff-change-tree");
    const sidebar = screen.getByTestId("diff-change-tree-sidebar");
    const handle = screen.getByTestId("diff-change-tree-resize-handle");
    expect(root).toContainElement(handle);
    expect(root).toContainElement(sidebar);
    // Code pane first, then handle, then tree (Codex order).
    expect(
      root.compareDocumentPosition(sidebar) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByTestId("file-diff-viewer")).toBeInTheDocument();
  });

  it("selects initialSelectedPath when provided", async () => {
    const user = userEvent.setup();
    render(
      <DiffChangeTree
        changes={[
          { path: "src/a.ts", status: "M" },
          { path: "src/b.ts", status: "A" },
        ]}
        initialSelectedPath="src/b.ts"
      />,
    );

    const files = screen.getAllByTestId("diff-change-tree-file");
    const aFile = files.find((el) => el.getAttribute("data-path") === "src/a.ts")!;
    const bFile = files.find((el) => el.getAttribute("data-path") === "src/b.ts")!;
    expect(bFile.className).toMatch(/bg-\[var\(--oh-interactive-hover\)\]/);

    await user.click(aFile);
    expect(aFile.className).toMatch(/bg-\[var\(--oh-interactive-hover\)\]/);
  });
});
