/* eslint-disable i18next/no-literal-string */
import React, { useMemo, useState } from "react";
import { FileDiff, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

import type { OpenHandsEvent } from "#/types/agent-server/core";
import { computeLineDiff } from "#/components/features/chat/tool-visualizers/primitives/diff-view";
import { useConversationStore } from "#/stores/conversation-store";
import ConversationService from "#/api/conversation-service/conversation-service.api";
import { useSendMessage } from "#/hooks/use-send-message";
import { toFilesTabPath, toReviewRelativePath } from "#/utils/path-utils";
import { useChatScrollFocusTarget } from "#/hooks/use-chat-scroll-file-focus";

export interface TurnFileChange {
  path: string;
  additions: number;
  deletions: number;
  before: string;
  after: string;
}

export interface TurnChangeSummary {
  files: TurnFileChange[];
  additions: number;
  deletions: number;
}

type MutableFileChange = {
  path: string;
  before: string;
  after: string;
  authoritative: boolean;
};

const FILE_ACTION_KINDS = new Set([
  "FileEditorAction",
  "StrReplaceEditorAction",
  "PlanningFileEditorAction",
]);

const FILE_OBSERVATION_KINDS = new Set([
  "FileEditorObservation",
  "StrReplaceEditorObservation",
  "PlanningFileEditorObservation",
]);

const MUTATING_COMMANDS = new Set([
  "create",
  "str_replace",
  "insert",
  "undo_edit",
]);

function summarize(
  files: Map<string, MutableFileChange>,
): TurnChangeSummary | null {
  if (files.size === 0) return null;
  const changes = [...files.values()].map(({ path, before, after }) => {
    let additions = 0;
    let deletions = 0;
    // Path-only ACP edits (no payload) still count as a touched file.
    if (before === "" && after === "") {
      return { path, additions: 0, deletions: 0, before, after };
    }
    for (const row of computeLineDiff(before, after)) {
      if (row.type === "add") additions += 1;
      if (row.type === "del") deletions += 1;
    }
    return { path, additions, deletions, before, after };
  });
  return {
    files: changes,
    additions: changes.reduce((total, file) => total + file.additions, 0),
    deletions: changes.reduce((total, file) => total + file.deletions, 0),
  };
}

function archiveCurrentTurn(
  completed: Map<string, TurnChangeSummary>,
  files: Map<string, MutableFileChange>,
  eventId: string,
) {
  const summary = summarize(files);
  if (summary) completed.set(eventId, summary);
}

function recordFileEdit(
  files: Map<string, MutableFileChange>,
  path: string,
  before: string,
  after: string,
  authoritative: boolean,
) {
  const previous = files.get(path);
  if (previous?.authoritative && !authoritative) {
    return;
  }
  files.set(path, {
    path,
    before: previous?.authoritative
      ? previous.before
      : before || previous?.before || "",
    after: after || previous?.after || "",
    authoritative: Boolean(previous?.authoritative || authoritative),
  });
}

function extractAcpEdit(
  event: OpenHandsEvent & {
    kind?: string;
    tool_kind?: string | null;
    status?: string | null;
    is_error?: boolean;
    title?: string;
    raw_input?: unknown;
  },
  workingDir?: string,
): { path: string; before: string; after: string } | null {
  if (event.kind !== "ACPToolCallEvent") return null;
  if (event.tool_kind !== "edit") return null;
  if (event.is_error) return null;
  // Prefer terminal events; still accept in-progress so the live card updates.
  if (event.status === "failed") return null;

  const input =
    event.raw_input && typeof event.raw_input === "object"
      ? (event.raw_input as Record<string, unknown>)
      : {};
  const rawPath = [input.path, input.file_path, input.filePath, event.title]
    .find((value) => typeof value === "string" && value.trim().length > 0) as
    | string
    | undefined;
  if (!rawPath) return null;

  // Titles like "Edit src/foo.ts" — strip a leading verb if present.
  const cleanedPath = rawPath.replace(/^(Edit|Write|Update)\s+/i, "").trim();
  const path = toFilesTabPath(cleanedPath, workingDir);
  if (!path) return null;

  const before =
    (typeof input.old_string === "string" && input.old_string) ||
    (typeof input.old_str === "string" && input.old_str) ||
    (typeof input.oldText === "string" && input.oldText) ||
    "";
  const after =
    (typeof input.new_string === "string" && input.new_string) ||
    (typeof input.new_str === "string" && input.new_str) ||
    (typeof input.newText === "string" && input.newText) ||
    (typeof input.content === "string" && input.content) ||
    (typeof input.file_text === "string" && input.file_text) ||
    "";

  return { path, before, after };
}

/** Build stable summaries for completed turns plus the currently-running tail. */
export function collectTurnChangeSummaries(
  events: OpenHandsEvent[],
  workingDir?: string,
) {
  const completed = new Map<string, TurnChangeSummary>();
  let files = new Map<string, MutableFileChange>();

  for (const event of events) {
    const rawEvent = event as OpenHandsEvent & {
      action?: Record<string, unknown>;
      observation?: Record<string, unknown>;
      llm_message?: { role?: string };
      source?: string;
      kind?: string;
      tool_kind?: string | null;
      status?: string | null;
      is_error?: boolean;
      title?: string;
      raw_input?: unknown;
    };

    // Starting a new user turn: archive whatever the previous turn edited.
    // Do NOT finalize on assistant MessageEvents — those often arrive before
    // / between tool calls and were wiping the live accumulator early, which
    // is why the final Codex-style card never appeared.
    // ACP / kimi sometimes only set `source: "user"` without llm_message.role.
    const isUserTurnBoundary =
      rawEvent.llm_message?.role === "user" ||
      (rawEvent.source === "user" &&
        !rawEvent.action &&
        !rawEvent.observation &&
        rawEvent.kind !== "ACPToolCallEvent");
    if (isUserTurnBoundary) {
      archiveCurrentTurn(completed, files, String(event.id));
      files = new Map();
    }

    if (rawEvent.action) {
      const action = rawEvent.action as {
        kind?: string;
        command?: string;
        path?: string;
        file_text?: string | null;
        old_str?: string | null;
        new_str?: string | null;
      };
      if (
        FILE_ACTION_KINDS.has(action.kind ?? "") &&
        action.path &&
        MUTATING_COMMANDS.has(action.command ?? "")
      ) {
        const path = toFilesTabPath(action.path, workingDir);
        const after = action.file_text ?? action.new_str;
        if (path && after != null) {
          recordFileEdit(
            files,
            path,
            action.old_str ?? "",
            after,
            false,
          );
        }
      }
    }

    if (rawEvent.observation) {
      const observation = rawEvent.observation as {
        kind?: string;
        command?: string;
        path?: string | null;
        old_content?: string | null;
        new_content?: string | null;
        error?: string | null;
      };
      if (
        FILE_OBSERVATION_KINDS.has(observation.kind ?? "") &&
        observation.path &&
        !observation.error &&
        observation.new_content != null &&
        (!observation.command || MUTATING_COMMANDS.has(observation.command))
      ) {
        const path = toFilesTabPath(observation.path, workingDir);
        if (path) {
          recordFileEdit(
            files,
            path,
            observation.old_content ?? "",
            observation.new_content,
            true,
          );
        }
      }
    }

    // kimi / Claude Code / Codex land as ACPToolCallEvent, not FileEditor*.
    const acpEdit = extractAcpEdit(rawEvent, workingDir);
    if (acpEdit) {
      recordFileEdit(files, acpEdit.path, acpEdit.before, acpEdit.after, false);
    }

    if (rawEvent.action?.kind === "FinishAction") {
      archiveCurrentTurn(completed, files, String(event.id));
      files = new Map();
    }
  }

  // If the agent never emitted FinishAction (common with ACP / kimi), keep the
  // in-progress edits available as both live and a completed snapshot so the
  // final Codex card still has data after the run stops.
  const live = summarize(files);
  if (live && events.length > 0) {
    const lastId = String(events[events.length - 1]?.id ?? "live-tail");
    if (!completed.has(lastId)) {
      completed.set(lastId, live);
    }
  }

  return { completed, live };
}

/** Open the Review tab with only this turn's files (Codex-style tree). */
export function openTurnReview(
  summary: TurnChangeSummary,
  path?: string,
): void {
  const store = useConversationStore.getState();
  const workingDir =
    ConversationService.getCurrentConversation()?.workspace?.working_dir;
  const turnFiles = summary.files.map((file) => ({
    path: toReviewRelativePath(file.path, workingDir) || file.path,
    before: file.before,
    after: file.after,
  }));
  const targetRaw = path ?? summary.files[0]?.path ?? null;
  const targetPath = targetRaw
    ? toReviewRelativePath(targetRaw, workingDir) || targetRaw
    : (turnFiles[0]?.path ?? null);

  store.setCommitsReviewTurnFiles(turnFiles);
  store.setCommitsReviewFilterPaths(turnFiles.map((file) => file.path));
  store.setCommitsAutoExpandSection("uncommitted");
  store.setCommitsAutoExpandPath(targetPath);
  // Review is not Files — always reveal even when Files auto-open is locked.
  store.setSelectedTab("commits");
  store.setHasRightPanelToggled(true);
  store.setIsRightPanelShown(true);
}

export function TurnChangesCard({
  summary,
  live = false,
  compact = false,
}: {
  summary: TurnChangeSummary;
  live?: boolean;
  /** Slimmer card for the sticky slot above the thinking chip. */
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { send } = useSendMessage();
  const cardRef = React.useRef<HTMLElement>(null);
  const visibleFiles = expanded ? summary.files : summary.files.slice(0, 3);
  const hiddenCount = summary.files.length - 3;

  const fileList = useMemo(
    () => summary.files.map((file) => file.path).join(", "),
    [summary.files],
  );

  const reviewFocusKey = useMemo(
    () =>
      `turn-review:${summary.files.map((file) => file.path).join("|")}:${summary.additions}:${summary.deletions}`,
    [summary],
  );

  // Final (non-live) cards participate in chat scroll → Review sync.
  useChatScrollFocusTarget(
    cardRef,
    !live && summary.files.length > 0
      ? {
          kind: "turn-review",
          key: reviewFocusKey,
          open: () => openTurnReview(summary),
        }
      : null,
  );

  const displayWorkingDir =
    ConversationService.getCurrentConversation()?.workspace?.working_dir;

  const openReview = (path?: string) => {
    openTurnReview(summary, path);
  };

  const undo = () => {
    void send({
      action: "message",
      args: {
        content: `Deshaz los cambios del último turno en: ${fileList}`,
      },
    });
  };

  const fileLabel = summary.files.length === 1 ? "archivo" : "archivos";

  return (
    <section
      ref={cardRef}
      className={
        compact
          ? "overflow-hidden rounded-2xl border border-[var(--oh-border)] bg-[var(--oh-surface-raised)] text-sm shadow-lg"
          : "my-3 overflow-hidden rounded-xl border border-[var(--oh-border)] bg-[var(--oh-surface-raised)] text-sm"
      }
      data-testid={live ? "live-turn-changes-card" : "turn-changes-card"}
      data-chat-focus={live ? undefined : "turn-review"}
    >
      <header
        className={`flex items-center gap-3 ${compact ? "p-2.5" : "border-b border-[var(--oh-border)] p-3"}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--oh-surface)]">
          <FileDiff className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-white">
            {live ? "Modificando" : "Modificados"} {summary.files.length}{" "}
            {fileLabel}
          </div>
          <div className="font-mono text-xs">
            <span className="text-status-success-text">
              +{summary.additions}
            </span>{" "}
            <span className="text-status-fail-text">-{summary.deletions}</span>
          </div>
        </div>
        {!live && (
          <button
            type="button"
            onClick={undo}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white hover:bg-[var(--oh-interactive-hover)]"
          >
            Deshacer <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => openReview()}
          className="cursor-pointer rounded-full border border-[var(--oh-border)] px-3 py-1.5 text-xs text-white hover:bg-[var(--oh-interactive-hover)]"
        >
          Vista previa
        </button>
      </header>

      {!compact && (
        <>
          <div className="divide-y divide-[var(--oh-border-subtle)]">
            {visibleFiles.map((file) => (
              <button
                key={file.path}
                type="button"
                onClick={() => openReview(file.path)}
                className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--oh-interactive-hover)]"
              >
                <span className="min-w-0 flex-1 truncate text-[var(--oh-text-secondary)]">
                  {toReviewRelativePath(file.path, displayWorkingDir) ||
                    file.path}
                </span>
                <span className="shrink-0 font-mono text-xs">
                  <span className="text-status-success-text">
                    +{file.additions}
                  </span>{" "}
                  <span className="text-status-fail-text">
                    -{file.deletions}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="flex w-full cursor-pointer items-center gap-1 border-t border-[var(--oh-border)] px-3 py-2 text-left text-xs text-white hover:bg-[var(--oh-interactive-hover)]"
            >
              {expanded
                ? "Mostrar menos"
                : `Mostrar ${hiddenCount} archivos más`}
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
