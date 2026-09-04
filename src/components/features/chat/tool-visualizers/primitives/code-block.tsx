import React from "react";
import { useTranslation } from "react-i18next";
import { CodexCodeCard } from "../../../markdown/codex-code-card";
import { MAX_CONTENT_LENGTH } from "#/components/conversation-events/chat/event-content-helpers/shared";
import { I18nKey } from "#/i18n/declaration";

interface CodeBlockProps {
  code: string;
  /** Prism language hint (e.g. "bash", "python"). */
  language?: string;
  /** Show a copy button. Defaults to true. */
  copy?: boolean;
  /** Text shown when code is empty. */
  placeholder?: string;
  /** Let truncated content be expanded inline. Defaults to false. */
  expandable?: boolean;
  /** Wrap long lines instead of horizontal-only scrolling. Defaults to false. */
  wrapLongLines?: boolean;
}

/**
 * Codex-styled code card for tool visualizers. Long content is truncated to
 * the same limit the markdown path uses; copy always yields the full text.
 */
export function CodeBlock({
  code,
  language,
  copy = true,
  placeholder,
  expandable = false,
  wrapLongLines = false,
}: CodeBlockProps) {
  const { t } = useTranslation("openhands");
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isTruncated = code.length > MAX_CONTENT_LENGTH;
  const display =
    isTruncated && !(expandable && isExpanded)
      ? `${code.slice(0, MAX_CONTENT_LENGTH)}…`
      : code;
  const text = display.trim() || placeholder || "";
  const toggleLabel = isExpanded
    ? t(I18nKey.BUTTON$COLLAPSE)
    : t(I18nKey.BUTTON$EXPAND);

  return (
    <div className="flex flex-col gap-1">
      <CodexCodeCard
        code={text}
        copyText={code}
        language={language}
        wrapLongLines={wrapLongLines}
        showCopy={copy}
        className="my-0"
      />
      {expandable && isTruncated && (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="self-start text-xs text-muted transition-colors hover:text-white hover:underline"
        >
          {toggleLabel}
        </button>
      )}
    </div>
  );
}
