import React, { useRef, useCallback, useState, useEffect } from "react";
import type { ChatAttachmentUploadOptions } from "#/hooks/chat/use-chat-attachment-upload";

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

  // Function to add files and notify parent
  const addFiles = useCallback(
    (files: File[], options?: ChatAttachmentUploadOptions) => {
      if (onFilesPaste && files.length > 0) {
        onFilesPaste(files, options);
      }
    },
    [onFilesPaste],
  );

  // Listen for paste events with files
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

  // File icon click handler
  const handleFileIconClick = useCallback((isDisabled: boolean) => {
    if (!isDisabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // File input change handler
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      addFiles(files);
    },
    [addFiles],
  );

  // Drag and drop event handlers
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

      const filesToUpload: File[] = [];

      if (e.dataTransfer.items && e.dataTransfer.files) {
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const item = e.dataTransfer.items[i];
          const originalFile = e.dataTransfer.files[i];
          if (item.kind === "file") {
            const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
            if (entry && entry.isDirectory) {
              // It's a directory! Create a fake file.
              const path = originalFile ? (originalFile as any).path : null;
              const folderName = entry.name || originalFile?.name || "folder";
              const fakeFile = new File([], folderName, { type: "directory" });
              (fakeFile as any).isFolder = true;
              (fakeFile as any).folderPath = path || folderName;
              filesToUpload.push(fakeFile);
            } else if (originalFile) {
              filesToUpload.push(originalFile);
            }
          }
        }
      } else {
        // Fallback
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
