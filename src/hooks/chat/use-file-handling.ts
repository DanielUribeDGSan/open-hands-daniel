import React, { useRef, useCallback, useState, useEffect } from "react";
import type { ChatAttachmentUploadOptions } from "#/hooks/chat/use-chat-attachment-upload";
import {
  collectDroppedDirectories,
  droppedDirectoriesToFolderFiles,
} from "#/utils/dropped-directories";
import { useRemoteSshStore } from "#/store/use-remote-ssh-store";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useParams } from "react-router";

interface UseFileHandlingReturn {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  isDragOver: boolean;
  handleFileIconClick: (isDisabled: boolean) => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragOver: (e: React.DragEvent, isDisabled: boolean) => void;
  handleDragLeave: (e: React.DragEvent, isDisabled: boolean) => void;
  handleDrop: (e: React.DragEvent, isDisabled: boolean) => void;
}

/**
 * Hook for handling file operations (upload, drag & drop)
 */
export const useFileHandling = (
  onFilesPaste?: (files: File[], options?: ChatAttachmentUploadOptions) => void,
): UseFileHandlingReturn => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { conversationId } = useParams();

  const addFiles = useCallback(
    (files: File[], options?: ChatAttachmentUploadOptions) => {
      if (onFilesPaste && files.length > 0) {
        onFilesPaste(files, options);
      }
    },
    [onFilesPaste],
  );

  useEffect(() => {
    const handlePasteFiles = (event: CustomEvent) => {
      const files = event.detail.files as File[];
      if (files && files.length > 0) {
        addFiles(files, { fromPaste: true });
      }
    };

    document.addEventListener("pasteFiles", handlePasteFiles as EventListener);

    return () => {
      document.removeEventListener(
        "pasteFiles",
        handlePasteFiles as EventListener,
      );
    };
  }, [addFiles]);

  const handleFileIconClick = useCallback((isDisabled: boolean) => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      addFiles(files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, isDisabled: boolean) => {
      if (isDisabled) {
        return;
      }
      e.preventDefault();
      setIsDragOver(true);
    },
    [],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent, isDisabled: boolean) => {
      if (
        isDisabled ||
        chatContainerRef.current?.contains(e.relatedTarget as Node)
      ) {
        return;
      }

      e.preventDefault();
      setIsDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, isDisabled: boolean) => {
      if (isDisabled) {
        return;
      }

      e.preventDefault();
      setIsDragOver(false);

      const remoteFolderData = e.dataTransfer.getData("application/x-remote-folder");
      if (remoteFolderData) {
        try {
          const node = JSON.parse(remoteFolderData);
          const { connectedHost } = useRemoteSshStore.getState();
          if (connectedHost) {
            // Trigger mutagen sync to mount in the current workspace (or tmp if on landing page)
            const targetConversationId = conversationId || undefined;
            const targetDirName = targetConversationId ? node.name : undefined;
            
            window.desktop?.mountSshWorkspace?.(connectedHost, node.path, targetDirName, targetConversationId).then((mountPath) => {
              if (mountPath) {
                const fakeFile = new File([], node.name, { type: "directory" }) as any;
                fakeFile.isFolder = true;
                fakeFile.isRemoteFolder = true;
                fakeFile.folderPath = mountPath;
                addFiles([fakeFile]);
              }
            });
            return;
          }
        } catch (err) {
          console.error("Failed to parse remote folder drop", err);
        }
      }

      const filesToUpload: File[] = [];

      // Folders — same detection as create-workspace (shared helper).
      const directories = collectDroppedDirectories(e.dataTransfer);
      filesToUpload.push(...droppedDirectoriesToFolderFiles(directories));
      const folderNames = new Set(directories.map((dir) => dir.name));

      // Regular files (skip ones already captured as directories).
      if (e.dataTransfer.items && e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.items.length; i += 1) {
          const item = e.dataTransfer.items[i];
          const originalFile = e.dataTransfer.files[i];
          if (item.kind !== "file" || !originalFile) continue;

          const entry =
            typeof item.webkitGetAsEntry === "function"
              ? item.webkitGetAsEntry()
              : null;
          if (entry?.isDirectory) continue;
          if (folderNames.has(originalFile.name)) continue;

          filesToUpload.push(originalFile);
        }
      } else if (directories.length === 0) {
        filesToUpload.push(...Array.from(e.dataTransfer.files || []));
      }

      if (filesToUpload.length > 0) {
        addFiles(filesToUpload);
      }
    },
    [addFiles],
  );

  return {
    fileInputRef,
    chatContainerRef,
    isDragOver,
    handleFileIconClick,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
};
