import React from "react";
import { Code2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import CheckmarkIcon from "#/icons/checkmark.svg?react";
import CopyIcon from "#/icons/copy.svg?react";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { SyntaxHighlighter } from "./syntax-highlighter";
import { codexPrismStyle } from "./codex-prism-style";

const LANGUAGE_LABELS: Record<string, string> = {
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Zsh",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  py: "Python",
  python: "Python",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  md: "Markdown",
  markdown: "Markdown",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  go: "Go",
  rust: "Rust",
  java: "Java",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  ruby: "Ruby",
  php: "PHP",
  text: "Text",
  plaintext: "Text",
  diff: "Diff",
};

function languageLabel(language?: string): string {
  if (!language) {
    return "Text";
  }
  const key = language.toLowerCase();
  return (
    LANGUAGE_LABELS[key] ??
    language.charAt(0).toUpperCase() + language.slice(1).toLowerCase()
  );
}

interface CodexCodeCardProps {
  /** Text shown in the body (may be truncated). */
  code: string;
  /** Clipboard payload; defaults to `code`. */
  copyText?: string;
  language?: string;
  /** Extra classes on the outer card. */
  className?: string;
  wrapLongLines?: boolean;
  showCopy?: boolean;
}

/**
 * Codex-style fenced code card: soft rounded shell, language header, copy
 * control, and warm preview-like syntax colors. Used by chat markdown and
 * tool CodeBlocks so old and new messages share one look.
 */
export function CodexCodeCard({
  code,
  copyText,
  language,
  className,
  wrapLongLines = false,
  showCopy = true,
}: CodexCodeCardProps) {
  const { t } = useTranslation("openhands");
  const [isCopied, setIsCopied] = React.useState(false);
  const label = languageLabel(language);
  const clipboardText = copyText ?? code;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(clipboardText);
    setIsCopied(true);
  };

  React.useEffect(() => {
    if (!isCopied) {
      return undefined;
    }
    const timeout = window.setTimeout(() => setIsCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [isCopied]);

  return (
    <div
      className={cn(
        "my-3 overflow-hidden rounded-2xl border border-[#3a3a3a] bg-[#2d2d2d]",
        className,
      )}
      data-testid="codex-code-card"
    >
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-white/90">
          <Code2 className="size-3.5 shrink-0 opacity-80" aria-hidden />
          <span className="truncate">{label}</span>
        </div>
        {showCopy ? (
          <button
            type="button"
            data-testid="copy-to-clipboard"
            aria-label={t(
              isCopied ? I18nKey.BUTTON$COPIED : I18nKey.BUTTON$COPY,
            )}
            disabled={isCopied || clipboardText.trim().length === 0}
            onClick={handleCopy}
            className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-60"
          >
            {isCopied ? (
              <CheckmarkIcon width={15} height={15} />
            ) : (
              <CopyIcon width={15} height={15} />
            )}
          </button>
        ) : null}
      </div>
      <div className="overflow-x-auto px-3.5 pb-3.5 custom-scrollbar">
        {language ? (
          <SyntaxHighlighter
            style={codexPrismStyle}
            language={language}
            PreTag="div"
            wrapLongLines={wrapLongLines}
            customStyle={{
              margin: 0,
              padding: 0,
              background: "transparent",
              ...(wrapLongLines ? { whiteSpace: "pre-wrap" } : null),
            }}
            codeTagProps={
              wrapLongLines
                ? { style: { whiteSpace: "pre-wrap" } }
                : undefined
            }
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <pre
            className={cn(
              "m-0 font-mono text-[13px] leading-[1.55] text-[#e8e8e8]",
              wrapLongLines
                ? "whitespace-pre-wrap break-words"
                : "whitespace-pre",
            )}
          >
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
