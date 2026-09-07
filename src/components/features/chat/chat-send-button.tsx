import { ArrowUp, Square } from "lucide-react";
import { cn } from "#/utils/utils";

export interface ChatSendButtonProps {
  buttonClassName: string;
  handleSubmit: () => void;
  disabled: boolean;
  isAgentRunning?: boolean;
  onStop?: () => void;
}

export function ChatSendButton({
  buttonClassName,
  handleSubmit,
  disabled,
  isAgentRunning = false,
  onStop,
}: ChatSendButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-center rounded-full border border-white size-8",
        disabled
          ? "cursor-not-allowed border-[var(--oh-muted)]"
          : "cursor-pointer hover:bg-white/10",
        buttonClassName,
      )}
      data-name="arrow-up-circle-fill"
      data-testid="submit-button"
      onClick={isAgentRunning ? onStop : handleSubmit}
      disabled={disabled && !isAgentRunning}
    >
      {isAgentRunning ? (
        <Square
          className="w-3 h-3 text-red-500 fill-red-500"
        />
      ) : (
        <ArrowUp
          className="w-4 h-4"
          color={disabled ? "var(--oh-muted)" : "white"}
        />
      )}
    </button>
  );
}
