import { describe, expect, it } from "vitest";
import type { OpenHandsEvent } from "#/types/agent-server/core";
import { collectTurnChangeSummaries } from "./turn-changes-card";

const event = (value: unknown) => value as OpenHandsEvent;

describe("collectTurnChangeSummaries", () => {
  it("keeps a live net summary and finalizes it on FinishAction", () => {
    const events = [
      event({
        id: "user-1",
        timestamp: "2026-01-01T00:00:00Z",
        source: "user",
        llm_message: { role: "user", content: [] },
        activated_skills: [],
        extended_content: [],
      }),
      event({
        id: "obs-1",
        timestamp: "2026-01-01T00:00:01Z",
        source: "environment",
        action_id: "action-1",
        observation: {
          kind: "FileEditorObservation",
          path: "/workspace/project/src/app.ts",
          old_content: "const a = 1;\n",
          new_content: "const a = 2;\nconst b = 3;\n",
          error: null,
        },
      }),
    ];

    const live = collectTurnChangeSummaries(events, "/workspace/project");
    expect(live.live).toMatchObject({
      additions: 2,
      deletions: 1,
      files: [{ path: "src/app.ts", additions: 2, deletions: 1 }],
    });

    events.push(
      event({
        id: "finish-1",
        timestamp: "2026-01-01T00:00:02Z",
        source: "agent",
        action: { kind: "FinishAction", message: "Done" },
        tool_name: "finish",
        tool_call_id: "finish-call-1",
      }),
    );
    const finished = collectTurnChangeSummaries(events, "/workspace/project");
    expect(finished.live).toBeNull();
    expect(finished.completed.get("finish-1")).toEqual(live.live);
  });

  it("uses the first before and latest after content for repeated edits", () => {
    const observations = ["two", "three"].map((after, index) =>
      event({
        id: `obs-${index}`,
        timestamp: `2026-01-01T00:00:0${index}Z`,
        source: "environment",
        action_id: `action-${index}`,
        observation: {
          kind: "StrReplaceEditorObservation",
          path: "file.txt",
          old_content: index === 0 ? "one" : "two",
          new_content: after,
          error: null,
        },
      }),
    );

    expect(collectTurnChangeSummaries(observations).live).toMatchObject({
      additions: 1,
      deletions: 1,
      files: [{ path: "file.txt" }],
    });
  });

  it("keeps edits live across assistant messages and archives on the next user turn", () => {
    const events = [
      event({
        id: "action-1",
        timestamp: "2026-01-01T00:00:00Z",
        source: "agent",
        tool_name: "str_replace_editor",
        tool_call_id: "call-1",
        action: {
          kind: "StrReplaceEditorAction",
          command: "str_replace",
          path: "/workspace/project/app.ts",
          old_str: "old line",
          new_str: "new line\nsecond line",
        },
      }),
      event({
        id: "assistant-1",
        timestamp: "2026-01-01T00:00:01Z",
        source: "agent",
        llm_message: { role: "assistant", content: [] },
        activated_skills: [],
        extended_content: [],
      }),
    ];

    // Assistant chatter must NOT wipe the live accumulator — otherwise the
    // final Codex-style card never gets a chance to render.
    const midTurn = collectTurnChangeSummaries(events, "/workspace/project");
    expect(midTurn.live).toMatchObject({
      additions: 2,
      deletions: 1,
      files: [{ path: "app.ts" }],
    });
    expect(midTurn.completed.size).toBe(0);

    events.push(
      event({
        id: "user-2",
        timestamp: "2026-01-01T00:00:02Z",
        source: "user",
        llm_message: { role: "user", content: [] },
        activated_skills: [],
        extended_content: [],
      }),
    );
    const nextTurn = collectTurnChangeSummaries(events, "/workspace/project");
    expect(nextTurn.live).toBeNull();
    expect(nextTurn.completed.get("user-2")).toMatchObject({
      additions: 2,
      deletions: 1,
      files: [{ path: "app.ts" }],
    });
  });
});
