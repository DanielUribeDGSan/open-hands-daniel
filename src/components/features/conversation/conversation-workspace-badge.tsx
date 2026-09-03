import { Folder } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useResolvedWorkspaces } from "#/hooks/query/use-resolved-workspaces";
import { getStoredConversationMetadata } from "#/api/conversation-metadata-store";
import { getFolderBasename } from "#/utils/dropped-directories";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

function normalizePath(path: string): string {
  return path.replace(/\/+$/, "") || path;
}

/**
 * Chip in the chat header showing which workspace folder this conversation
 * belongs to (basename + full path on hover).
 */
export function ConversationWorkspaceBadge({
  className,
}: {
  className?: string;
}) {
  const { t } = useTranslation("openhands");
  const { data: conversation } = useActiveConversation();
  const { workspaces } = useResolvedWorkspaces();

  const stored = conversation?.id
    ? getStoredConversationMetadata(conversation.id)
    : null;

  const path =
    stored?.selected_workspace?.trim() ||
    conversation?.selected_workspace?.trim() ||
    conversation?.workspace?.working_dir?.trim() ||
    null;

  if (!path) return null;

  const normalized = normalizePath(path);
  const known = workspaces.find((workspace) => {
    const workspacePath = normalizePath(workspace.path);
    return (
      normalized === workspacePath ||
      normalized.startsWith(`${workspacePath}/`) ||
      normalized.startsWith(`${workspacePath}\\`)
    );
  });

  const label = known?.name || getFolderBasename(normalized);

  return (
    <div
      data-testid="conversation-workspace-badge"
      title={normalized}
      aria-label={t(I18nKey.HOME$WORKSPACE_OF_CONVERSATION, {
        name: label,
      })}
      className={cn(
        "inline-flex max-w-[160px] shrink-0 items-center gap-1 rounded-md border border-[var(--oh-border)] bg-[var(--oh-surface-raised)] px-2 py-0.5",
        "text-[11px] font-medium text-[var(--oh-text-secondary)]",
        className,
      )}
    >
      <Folder className="size-3 shrink-0" aria-hidden strokeWidth={2} />
      <span className="truncate">{label}</span>
    </div>
  );
}
