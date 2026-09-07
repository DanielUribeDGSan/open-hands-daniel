import React, { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { X, Save } from "lucide-react";
import { useRemoteSshStore } from "#/store/use-remote-ssh-store";
import { displaySuccessToast, displayErrorToast } from "#/utils/custom-toast-handlers";

export const RemoteFileEditor: React.FC = () => {
  const { editingFilePath, setEditingFilePath } = useRemoteSshStore();
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!editingFilePath) return;
    
    let isMounted = true;
    const fetchContent = async () => {
      setLoading(true);
      try {
        const data = await window.desktop?.readRemoteFile?.(editingFilePath);
        if (isMounted) {
          setContent(data || "");
        }
      } catch (err) {
        displayErrorToast("Failed to read file");
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    void fetchContent();
    
    return () => { isMounted = false; };
  }, [editingFilePath]);

  const handleSave = async (currentContent = content) => {
    if (!editingFilePath) return;
    setSaving(true);
    try {
      await window.desktop?.saveRemoteFile?.(editingFilePath, currentContent);
      displaySuccessToast("File saved successfully!");
    } catch (err) {
      displayErrorToast("Failed to save file");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Add Cmd+S / Ctrl+S shortcut to the editor
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave(editor.getValue());
    });
  };

  if (!editingFilePath) return null;

  // Determine language based on file extension
  let language = "plaintext";
  const ext = editingFilePath.split('.').pop()?.toLowerCase();
  if (ext === "js" || ext === "jsx" || ext === "cjs" || ext === "mjs") language = "javascript";
  else if (ext === "ts" || ext === "tsx") language = "typescript";
  else if (ext === "json") language = "json";
  else if (ext === "html") language = "html";
  else if (ext === "css") language = "css";
  else if (ext === "md") language = "markdown";
  else if (ext === "py") language = "python";
  else if (ext === "php") language = "php";

  return (
    <div className="flex flex-col h-full w-full bg-[var(--oh-background)] absolute inset-0 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--oh-border)] bg-[#1e1e1e]">
        <div className="text-sm text-zinc-300 truncate px-2 font-mono">
          {editingFilePath.split('/').pop()}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSave()}
            disabled={loading || saving}
            className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setEditingFilePath(null)}
            className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm">
            Loading file content...
          </div>
        ) : (
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={content}
            onChange={(val) => setContent(val || "")}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              wordWrap: "on",
              padding: { top: 16 }
            }}
          />
        )}
      </div>
    </div>
  );
};
