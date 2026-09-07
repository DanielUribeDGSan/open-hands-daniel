import React from "react";
import { DragOver } from "../drag-over";
import { UploadedFiles } from "../uploaded-files";
import { ChatInputRow } from "./chat-input-row";
import { ChatInputActions } from "./chat-input-actions";
import { SlashCommandMenu } from "./slash-command-menu";
import { useConversationStore } from "#/stores/conversation-store";
import { cn } from "#/utils/utils";
import { SlashCommandItem } from "#/hooks/chat/use-slash-command";

interface ChatInputContainerProps {
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
  isDragOver: boolean;
  isProcessingFiles?: boolean;
  disabled: boolean;
  canSubmit: boolean;
  hasStartedConversation?: boolean;
  isNewConversationPending?: boolean;
  showButton: boolean;
  buttonClassName: string;
  chatInputRef: React.RefObject<HTMLTextAreaElement | null>;
  isAgentRunning?: boolean;
  onStop?: () => void;
  shouldAbortContext?: boolean;
  handleFileIconClick: (isDisabled: boolean) => void;
  handleSubmit: () => void;
  onDragOver: (e: React.DragEvent, isDisabled: boolean) => void;
  onDragLeave: (e: React.DragEvent, isDisabled: boolean) => void;
  onDrop: (e: React.DragEvent, isDisabled: boolean) => void;
  onInput: () => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isSlashMenuOpen?: boolean;
  slashItems?: SlashCommandItem[];
  slashSelectedIndex?: number;
  onSlashSelect?: (item: SlashCommandItem) => void;
}

export function ChatInputContainer({
  chatContainerRef,
  isDragOver,
  isProcessingFiles = false,
  disabled,
  canSubmit,
  hasStartedConversation,
  isNewConversationPending = false,
  showButton,
  buttonClassName,
  chatInputRef,
  isAgentRunning = false,
  onStop = () => {},
  shouldAbortContext = false,
  handleFileIconClick,
  handleSubmit,
  onDragOver,
  onDragLeave,
  onDrop,
  onInput,
  onPaste,
  onKeyDown,
  onFocus,
  onBlur,
  isSlashMenuOpen = false,
  slashItems = [],
  slashSelectedIndex = 0,
  onSlashSelect,
}: ChatInputContainerProps) {
  const conversationMode = useConversationStore(
    (state) => state.conversationMode,
  );

  return (
    <div
      ref={chatContainerRef}
      className={cn(
        "bg-[var(--oh-surface)] box-border content-stretch flex flex-col items-start justify-center p-4 relative rounded-[15px] w-full",
        conversationMode === "plan" && "border border-[#597FF4]",
      )}
      onDragOver={(e) => onDragOver(e, disabled)}
      onDragLeave={(e) => onDragLeave(e, disabled)}
      onDrop={(e) => onDrop(e, disabled)}
    >
      {/* Drag Over UI */}
      {isDragOver && !isProcessingFiles && <DragOver />}
      
      {/* Processing Loader UI */}
      {isProcessingFiles && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--oh-background)]/80 rounded-[15px] backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <span className="w-6 h-6 border-2 border-[var(--oh-accent)] border-t-transparent rounded-full animate-spin"></span>
            <span className="text-sm font-medium text-[var(--oh-accent)]">Procesando archivos...</span>
          </div>
        </div>
      )}

      <UploadedFiles />

      {/* Wrapper so the slash menu anchors just above the input row,
          not above the entire (possibly resized) container */}
      <div className="relative w-full">
        {isSlashMenuOpen && onSlashSelect && (
          <SlashCommandMenu
            items={slashItems}
            selectedIndex={slashSelectedIndex}
            onSelect={onSlashSelect}
          />
        )}

        <ChatInputRow
          chatInputRef={chatInputRef}
          isNewConversationPending={isNewConversationPending}
          onInput={onInput}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      <ChatInputActions
        disabled={disabled}
        canSubmit={canSubmit}
        hasStartedConversation={hasStartedConversation}
        onAddFileClick={() => handleFileIconClick(disabled)}
        showButton={showButton}
        buttonClassName={buttonClassName}
        handleSubmit={handleSubmit}
        isAgentRunning={isAgentRunning}
        onStop={onStop}
        shouldAbortContext={shouldAbortContext}
      />
    </div>
  );
}
