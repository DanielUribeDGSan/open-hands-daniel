/**
 * Preload for the main Agent Canvas window.
 * Exposes a small desktop bridge: resolve dropped File paths and native
 * directory pickers. CommonJS on purpose (sandboxed preload cannot use ESM).
 */
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  /**
   * Absolute filesystem path for a File from a drag-drop or file input.
   * Required on Electron 32+ where `File.path` is no longer available in the
   * renderer.
   */
  getPathForFile(file) {
    if (!file) return null;
    try {
      const path = webUtils.getPathForFile(file);
      return typeof path === "string" && path.length > 0 ? path : null;
    } catch {
      return null;
    }
  },

  /** True when `path` exists and is a directory on disk. */
  isDirectory: (path) => ipcRenderer.invoke("desktop:is-directory", path),

  /** Open a native folder picker. Returns selected absolute paths (or []). */
  showOpenDirectory: (options) =>
    ipcRenderer.invoke("desktop:show-open-directory", options ?? {}),

  /**
   * Tell main the React UI has painted so the splash can close without
   * flashing an empty translucent window.
   */
  notifyRendererReady: () => {
    try {
      ipcRenderer.send("desktop:renderer-ready");
    } catch {
      /* ignore */
    }
  },
});
