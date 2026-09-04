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

  it("renders a full-bleed editor with a floating tree island", async () => {
    const user = userEvent.setup();
    render(
      <DiffChangeTree
        changes={[
          { path: "src/a.ts", status: "M" },
          { path: "src/b.ts", status: "A" },
        ]}
      />,
    );

    const root = screen.getByTestId("diff-change-tree");
    expect(
      screen.queryByTestId("diff-change-tree-resize-handle"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("file-diff-viewer")).toBeInTheDocument();
    expect(screen.getByTestId("diff-change-tree-island-trigger")).toBeInTheDocument();
    expect(
      screen.queryByTestId("diff-change-tree-sidebar"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("diff-change-tree-island-trigger"));
    const sidebar = await screen.findByTestId("diff-change-tree-sidebar");
    expect(root).toContainElement(sidebar);
    expect(screen.getByText("src")).toBeInTheDocument();
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

    await user.click(screen.getByTestId("diff-change-tree-island-trigger"));
    const files = await screen.findAllByTestId("diff-change-tree-file");
    const aFile = files.find(
      (el) => el.getAttribute("data-path") === "src/a.ts",
    )!;
    const bFile = files.find(
      (el) => el.getAttribute("data-path") === "src/b.ts",
    )!;
    expect(bFile.className).toMatch(/bg-white\/10/);

    await user.click(aFile);
    // Selecting a file closes the island; reopen to assert selection style.
    await user.click(screen.getByTestId("diff-change-tree-island-trigger"));
    const aFileAgain = (
      await screen.findAllByTestId("diff-change-tree-file")
    ).find((el) => el.getAttribute("data-path") === "src/a.ts")!;
    expect(aFileAgain.className).toMatch(/bg-white\/10/);
  });
});
