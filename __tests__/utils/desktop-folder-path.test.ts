import { describe, expect, it, vi, afterEach } from "vitest";
import {
  collectDroppedDirectories,
  droppedDirectoriesToFolderFiles,
  fileUrlOrPathToFsPath,
  getFolderBasename,
} from "#/utils/dropped-directories";
import { extractDroppedFolders, workspaceFromPath } from "#/utils/desktop-folder-path";

function makeDirectoryDrop(name: string, absolutePath: string | null) {
  const file = new File([], name) as File & { path?: string };
  if (absolutePath) file.path = absolutePath;

  const entry = { isDirectory: true, name };
  const item = {
    kind: "file" as const,
    webkitGetAsEntry: () => entry,
  };

  return {
    items: {
      length: 1,
      0: item,
      [Symbol.iterator]: function* () {
        yield item;
      },
    },
    files: {
      length: 1,
      0: file,
      item: () => file,
      [Symbol.iterator]: function* () {
        yield file;
      },
    },
    types: [] as string[],
    getData: () => "",
  } as unknown as DataTransfer;
}

describe("dropped-directories (chat parity)", () => {
  afterEach(() => {
    delete (window as { desktop?: unknown }).desktop;
  });

  it("mirrors chat: directory entry + File.path", () => {
    const dt = makeDirectoryDrop(
      "3d-projects",
      "/Users/uribe/Documents/uribe-desarrollo/3d-projects",
    );

    expect(collectDroppedDirectories(dt)).toEqual([
      {
        name: "3d-projects",
        path: "/Users/uribe/Documents/uribe-desarrollo/3d-projects",
      },
    ]);
  });

  it("mirrors chat: still returns the folder when path is missing", () => {
    const dt = makeDirectoryDrop("3d-projects", null);

    expect(collectDroppedDirectories(dt)).toEqual([
      { name: "3d-projects", path: null },
    ]);

    const files = droppedDirectoriesToFolderFiles(
      collectDroppedDirectories(dt),
    );
    expect(files[0]?.isFolder).toBe(true);
    expect(files[0]?.folderPath).toBe("3d-projects");
    expect(files[0]?.name).toBe("3d-projects");
  });

  it("extractDroppedFolders requires an absolute path for workspaces", async () => {
    await expect(
      extractDroppedFolders(makeDirectoryDrop("3d-projects", null)),
    ).resolves.toEqual({ folders: [], reason: "no-path" });

    await expect(
      extractDroppedFolders(
        makeDirectoryDrop(
          "3d-projects",
          "/Users/uribe/Documents/uribe-desarrollo/3d-projects",
        ),
      ),
    ).resolves.toEqual({
      folders: [
        {
          name: "3d-projects",
          path: "/Users/uribe/Documents/uribe-desarrollo/3d-projects",
        },
      ],
    });
  });

  it("uses desktop.getPathForFile when File.path is absent", async () => {
    window.desktop = {
      getPathForFile: () =>
        "/Users/uribe/Documents/uribe-desarrollo/3d-projects",
      showOpenDirectory: vi.fn(),
    };

    await expect(
      extractDroppedFolders(makeDirectoryDrop("3d-projects", null)),
    ).resolves.toEqual({
      folders: [
        {
          name: "3d-projects",
          path: "/Users/uribe/Documents/uribe-desarrollo/3d-projects",
        },
      ],
    });
  });

  it("parses file URLs", () => {
    expect(
      fileUrlOrPathToFsPath(
        "file:///Users/uribe/Documents/uribe-desarrollo/3d-projects",
      ),
    ).toBe("/Users/uribe/Documents/uribe-desarrollo/3d-projects");
    expect(getFolderBasename("/tmp/demo")).toBe("demo");
    expect(workspaceFromPath("/tmp/demo", "X")).toEqual({
      id: "/tmp/demo",
      name: "X",
      path: "/tmp/demo",
    });
  });
});
