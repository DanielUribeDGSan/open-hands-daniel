/* eslint-disable i18next/no-literal-string */
import { useMemo, useState } from "react";
import { FileDiff, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

import type { OpenHandsEvent } from "#/types/agent-server/core";
import { computeLineDiff } from "#/components/features/chat/tool-visualizers/primitives/diff-view";
import { useConversationStore } from "#/stores/conversation-store";
import { useSendMessage } from "#/hooks/use-send-message";
import { toFilesTabPath } from "#/utils/path-utils";

export interface TurnFileChange {
  path: string;
  additions: number;
  deletions: number;
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
  const changes = [...files.values()].map(({ path, before, after }) => {
    let additions = 0;
    let deletions = 0;
    for (const row of computeLineDiff(before, after)) {
      if (row.type === "add") additions += 1;
      if (row.type === "del") deletions += 1;
    }
    return { path, additions, deletions };
  });
  const changed = changes.filter(
    ({ additions, deletions }) => additions > 0 || deletions > 0,
  );
  if (changed.length === 0) return null;
  return {
    files: changed,
    additions: changed.reduce((total, file) => total + file.additions, 0),
    deletions: changed.reduce((total, file) => total + file.deletions, 0),
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
    };

    // Starting a new user turn: archive whatever the previous turn edited.
    // Do NOT finalize on assistant MessageEvents — those often arrive before
    // / between tool calls and were wiping the live accumulator early, which
    // is why the final Codex-style card never appeared.
    if (rawEvent.llm_message?.role === "user") {
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
          const previous = files.get(path);
          if (!previous?.authoritative) {
            files.set(path, {
              path,
              before: previous?.before ?? action.old_str ?? "",
              after,
              authoritative: false,
            });
          }
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
          const previous = files.get(path);
          files.set(path, {
            path,
            before: previous?.authoritative
              ? previous.before
              : (observation.old_content ?? previous?.before ?? ""),
            after: observation.new_content,
            authoritative: true,
          });
        }
      }
    }

    if (rawEvent.action?.kind === "FinishAction") {
      archiveCurrentTurn(completed, files, String(event.id));
      files = new Map();
    }
  }

  return { completed, live: summarize(files) };
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
  const visibleFiles = expanded ? summary.files : summary.files.slice(0, 3);
  const hiddenCount = summary.files.length - 3;

  const fileList = useMemo(
    () => summary.files.map((file) => file.path).join(", "),
    [summary.files],
  );

  const openReview = (path?: string) => {
    const store = useConversationStore.getState();
    store.setSelectedTab("commits");
    store.setCommitsAutoExpandSection("uncommitted");
    store.setCommitsAutoExpandPath(path ?? null);
    store.setHasRightPanelToggled(true);
    store.setIsRightPanelShown(true);
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
      className={
        compact
          ? "overflow-hidden rounded-2xl border border-[var(--oh-border)] bg-[var(--oh-surface-raised)] text-sm shadow-lg"
          : "my-3 overflow-hidden rounded-xl border border-[var(--oh-border)] bg-[var(--oh-surface-raised)] text-sm"
      }
      data-testid={live ? "live-turn-changes-card" : "turn-changes-card"}
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
                  {file.path}
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
