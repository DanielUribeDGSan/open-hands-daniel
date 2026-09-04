import React from "react";
import type { AgentFileFocus } from "#/stores/files-tab-store";
import { useFilesTabStore } from "#/stores/files-tab-store";
import { useConversationStore } from "#/stores/conversation-store";
import { useChatScrollSyncStore } from "#/stores/chat-scroll-sync-store";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";

export type ChatScrollFocusTarget =
  | { kind: "file"; focus: AgentFileFocus; key: string }
  | { kind: "file-scrub"; focuses: AgentFileFocus[]; key: string }
  | { kind: "turn-review"; open: () => void; key: string };

type TargetEntry = {
  element: Element;
  target: ChatScrollFocusTarget;
};

type PendingApply =
  | { kind: "file"; focus: AgentFileFocus; key: string }
  | { kind: "turn-review"; open: () => void; key: string };

const entries = new Map<Element, ChatScrollFocusTarget>();
const subscribers = new Set<() => void>();

/** Wait after the last scroll tick before committing the latest focus. */
const SCROLL_SETTLE_MS = 180;

function notify() {
  for (const subscriber of subscribers) {
    subscriber();
  }
}

export function registerChatScrollFocusTarget(
  element: Element,
  target: ChatScrollFocusTarget,
): () => void {
  entries.set(element, target);
  notify();
  return () => {
    if (entries.get(element) === target) {
      entries.delete(element);
      notify();
    }
  };
}

function listEntries(): TargetEntry[] {
  return [...entries.entries()].map(([element, target]) => ({
    element,
    target,
  }));
}

/**
 * Register a chat DOM node as a scroll-focus target. Re-registers when the
 * target payload changes; no-ops when `target` is null.
 */
export function useChatScrollFocusTarget(
  ref: React.RefObject<Element | null>,
  target: ChatScrollFocusTarget | null,
): void {
  const targetKey = target?.key ?? null;
  const targetRef = React.useRef(target);
  targetRef.current = target;

  React.useEffect(() => {
    const element = ref.current;
    const next = targetRef.current;
    if (!element || !next) {
      return undefined;
    }
    return registerChatScrollFocusTarget(element, next);
  }, [ref, targetKey, target?.kind]);
}

/** Viewport line (0–1 from top) that "wins" when picking the active card. */
const FOCUS_LINE = 0.32;

function scoreElement(element: Element, root: Element): number | null {
  const rootRect = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.height <= 0 && rect.width <= 0) return null;

  const focusY = rootRect.top + rootRect.height * FOCUS_LINE;
  const visibleTop = Math.max(rect.top, rootRect.top);
  const visibleBottom = Math.min(rect.bottom, rootRect.bottom);
  const visible = visibleBottom - visibleTop;
  if (visible <= 0) return null;

  const center = (rect.top + rect.bottom) / 2;
  const distance = Math.abs(center - focusY);
  return distance - visible * 0.01;
}

function resolveScrubFocus(
  element: Element,
  focuses: AgentFileFocus[],
  root: Element,
): AgentFileFocus {
  if (focuses.length === 1) return focuses[0]!;
  const rootRect = root.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  const focusY = rootRect.top + rootRect.height * FOCUS_LINE;
  const ratio =
    rect.height <= 0
      ? 0
      : Math.min(1, Math.max(0, (focusY - rect.top) / rect.height));
  const index = Math.min(
    focuses.length - 1,
    Math.max(0, Math.floor(ratio * focuses.length)),
  );
  return focuses[index]!;
}

function applyFileFocus(
  focus: AgentFileFocus,
  conversationId: string | null | undefined,
) {
  useFilesTabStore.getState().focusAgentFile(focus, conversationId ?? null);
  const panel = useConversationStore.getState();
  panel.setSelectedTab("files");
  if (!panel.isRightPanelShown) {
    panel.setHasRightPanelToggled(true);
    panel.setIsRightPanelShown(true);
  }
}

function resolvePending(
  entry: TargetEntry,
  root: Element,
): PendingApply | null {
  const { target } = entry;
  if (target.kind === "turn-review") {
    return { kind: "turn-review", open: target.open, key: target.key };
  }
  const focus =
    target.kind === "file"
      ? target.focus
      : resolveScrubFocus(entry.element, target.focuses, root);
  const key =
    target.kind === "file"
      ? target.key
      : `${target.key}::${focus.path}::${focus.command}::${focus.startLine ?? ""}::${focus.endLine ?? ""}`;
  return { kind: "file", focus, key };
}

/**
 * Keeps the right Files/Review panel in sync with the chat focus line.
 * While scrolling, shows a skeleton and only commits the *latest* target
 * after the scroll settles — avoids rapid flicker on the right.
 */
export function useChatScrollFileFocus(
  scrollRef: React.RefObject<HTMLElement | null>,
): void {
  const { conversationId } = useOptionalConversationId();
  const lastAppliedKeyRef = React.useRef<string | null>(null);
  const pendingRef = React.useRef<PendingApply | null>(null);
  const settleTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const rafRef = React.useRef<number | null>(null);

  const commitPending = React.useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) {
      useChatScrollSyncStore.getState().setPending(false);
      return;
    }
    if (lastAppliedKeyRef.current === pending.key) {
      pendingRef.current = null;
      useChatScrollSyncStore.getState().setPending(false);
      return;
    }

    if (pending.kind === "turn-review") {
      pending.open();
    } else {
      applyFileFocus(pending.focus, conversationId);
    }

    lastAppliedKeyRef.current = pending.key;
    pendingRef.current = null;
    useChatScrollSyncStore.getState().setRevealKey(pending.key);
    // Let the new tab/content paint under the skeleton, then fade it in.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        useChatScrollSyncStore.getState().setPending(false);
      });
    });
  }, [conversationId]);

  const queuePending = React.useCallback(
    (next: PendingApply) => {
      pendingRef.current = next;
      useChatScrollSyncStore.getState().setPending(true);
      if (settleTimerRef.current != null) {
        window.clearTimeout(settleTimerRef.current);
      }
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        commitPending();
      }, SCROLL_SETTLE_MS);
    },
    [commitPending],
  );

  const evaluate = React.useCallback(() => {
    const root = scrollRef.current;
    if (!root) return;

    const nearBottom =
      root.scrollTop + root.clientHeight >= root.scrollHeight - 64;

    let best: { score: number; entry: TargetEntry } | null = null;
    for (const entry of listEntries()) {
      if (!root.contains(entry.element)) continue;
      let score = scoreElement(entry.element, root);
      if (score == null) continue;
      if (entry.target.kind === "turn-review" && nearBottom) {
        score = -1_000;
      }
      if (!best || score < best.score) {
        best = { score, entry };
      }
    }

    if (!best) return;

    const next = resolvePending(best.entry, root);
    if (!next) return;

    if (
      next.key === lastAppliedKeyRef.current &&
      pendingRef.current == null
    ) {
      return;
    }

    if (pendingRef.current?.key === next.key) {
      // Same pending target — just refresh the settle timer.
      queuePending(next);
      return;
    }

    queuePending(next);
  }, [queuePending, scrollRef]);

  const scheduleEvaluate = React.useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      evaluate();
    });
  }, [evaluate]);

  React.useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;

    const onScroll = () => scheduleEvaluate();
    root.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", scheduleEvaluate);

    const observer = new IntersectionObserver(() => scheduleEvaluate(), {
      root,
      threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
    });

    const observeAll = () => {
      observer.disconnect();
      for (const entry of listEntries()) {
        if (root.contains(entry.element)) {
          observer.observe(entry.element);
        }
      }
      scheduleEvaluate();
    };

    observeAll();
    const onRegistryChange = () => observeAll();
    subscribers.add(onRegistryChange);

    return () => {
      root.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", scheduleEvaluate);
      observer.disconnect();
      subscribers.delete(onRegistryChange);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (settleTimerRef.current != null) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
      useChatScrollSyncStore.getState().setPending(false);
    };
  }, [scheduleEvaluate, scrollRef]);
}
