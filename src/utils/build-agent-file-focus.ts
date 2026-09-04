import type { OpenHandsEvent } from "#/types/agent-server/core";
import type { AgentFileFocus } from "#/stores/files-tab-store";
import { toFilesTabPath } from "#/utils/path-utils";
import ConversationService from "#/api/conversation-service/conversation-service.api";

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

type FileCommand = AgentFileFocus["command"];

type FileActionLike = {
  kind?: string;
  command?: FileCommand;
  path?: string;
  view_range?: [number, number] | null;
  insert_line?: number | null;
  old_str?: string | null;
  new_str?: string | null;
  file_text?: string | null;
};

type FileObservationLike = {
  kind?: string;
  command?: FileCommand;
  path?: string | null;
  old_content?: string | null;
  new_content?: string | null;
  error?: string | null;
};

function workingDir(): string | undefined {
  return ConversationService.getCurrentConversation()?.workspace?.working_dir;
}

function focusFromAction(action: FileActionLike): AgentFileFocus | null {
  if (!action.path || !action.command) return null;
  if (!FILE_ACTION_KINDS.has(action.kind ?? "")) return null;
  const path = toFilesTabPath(action.path, workingDir());
  if (!path) return null;

  const viewRange = action.view_range;
  const insertedLines = action.new_str?.split("\n").length ?? 1;
  const startLine =
    action.command === "insert"
      ? (action.insert_line ?? 0) + 1
      : viewRange?.[0];
  const endLine =
    action.command === "insert"
      ? (startLine ?? 1) + insertedLines - 1
      : viewRange?.[1] === -1
        ? undefined
        : viewRange?.[1];

  return {
    path,
    command: action.command,
    startLine,
    endLine,
    oldText: action.old_str ?? undefined,
    newText: action.new_str ?? undefined,
    beforeContent: action.old_str ?? "",
    afterContent:
      action.command === "create"
        ? (action.file_text ?? "")
        : (action.new_str ?? ""),
  };
}

function focusFromObservation(
  observation: FileObservationLike,
  action?: FileActionLike | null,
): AgentFileFocus | null {
  if (!observation.path || !observation.command) return null;
  if (!FILE_OBSERVATION_KINDS.has(observation.kind ?? "")) return null;
  if (observation.error) return null;

  const path = toFilesTabPath(observation.path, workingDir());
  if (!path) return null;

  const fromAction = action ? focusFromAction(action) : null;
  return {
    path,
    command: observation.command,
    startLine: fromAction?.startLine,
    endLine: fromAction?.endLine,
    oldText: fromAction?.oldText,
    newText: fromAction?.newText,
    beforeContent: observation.old_content ?? fromAction?.beforeContent ?? "",
    afterContent: observation.new_content ?? fromAction?.afterContent ?? "",
  };
}

/**
 * Build an {@link AgentFileFocus} from a file-editor action/observation pair
 * (same shape the live WS focus path uses).
 */
export function buildAgentFileFocus(options: {
  action?: FileActionLike | null;
  observation?: FileObservationLike | null;
}): AgentFileFocus | null {
  const { action, observation } = options;
  if (observation) {
    return focusFromObservation(observation, action);
  }
  if (action) {
    return focusFromAction(action);
  }
  return null;
}

/**
 * Chronological file focuses for a run of chat events (e.g. a collapsed
 * EventGroup), so scroll-scrubbing can step through each edit.
 */
export function collectAgentFileFocusesFromEvents(
  events: OpenHandsEvent[],
  allEvents: OpenHandsEvent[] = events,
): AgentFileFocus[] {
  const focuses: AgentFileFocus[] = [];
  const seenPathsAtIndex = new Set<string>();

  for (const event of events) {
    const action = (event as { action?: FileActionLike }).action;
    const observation = (event as { observation?: FileObservationLike })
      .observation;
    const actionId = (event as { action_id?: string }).action_id;
    const correspondingAction =
      observation && actionId
        ? (
            allEvents.find(
              (candidate) =>
                (candidate as { id?: string }).id === actionId &&
                (candidate as { action?: FileActionLike }).action,
            ) as { action?: FileActionLike } | undefined
          )?.action
        : action;

    const focus = buildAgentFileFocus({
      action: correspondingAction ?? action,
      observation,
    });
    if (!focus) continue;

    // Prefer the latest focus for a path within this sequence, but keep order
    // of first appearance so scrubbing still walks the timeline.
    const key = `${focus.path}::${focus.command}::${focus.startLine ?? ""}::${focus.endLine ?? ""}::${(focus.afterContent ?? "").length}`;
    if (seenPathsAtIndex.has(key)) continue;
    seenPathsAtIndex.add(key);
    focuses.push(focus);
  }

  return focuses;
}
