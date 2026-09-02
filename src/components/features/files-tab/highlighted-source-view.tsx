import { useEffect, useMemo, useRef } from "react";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { SyntaxHighlighter } from "#/components/features/markdown/syntax-highlighter";
import { getPrismLanguageForFile } from "#/utils/file-language";
import type { AgentFileFocus } from "#/stores/files-tab-store";

interface HighlightedSourceViewProps {
  path: string;
  text: string;
  mimeType?: string;
  agentFocus?: AgentFileFocus | null;
}

/**
 * Renders the raw bytes of a workspace text file with Prism syntax
 * highlighting. Used both in:
 *   - Rich mode for actual source files (.ts, .py, .yaml, …) — there is
 *     no "rich" rendering of source code, so highlighted source IS the
 *     rich view.
 *   - Plain mode for source code AND for the source form of markdown /
 *     HTML files (so users can inspect the markup behind a rich preview).
 *
 * When we don't have a Prism grammar for the file we fall through to a
 * plain `<pre>` so the bytes still show. The wrapper styling matches the
 * right-pane background so the highlighted block reads as part of the
 * surrounding chrome instead of a floating card.
 */
export function HighlightedSourceView({
  path,
  text,
  mimeType,
  agentFocus,
}: HighlightedSourceViewProps) {
  const language = getPrismLanguageForFile(path, mimeType);
  const containerRef = useRef<HTMLDivElement>(null);
  const focusRange = useMemo(() => {
    if (!agentFocus) return null;
    let start = agentFocus.startLine;
    let end = agentFocus.endLine;
    const focusedText = [agentFocus.oldText, agentFocus.newText].find(
      (candidate) => candidate && text.includes(candidate),
    );
    if (!start && focusedText) {
      const index = text.indexOf(focusedText);
      if (index >= 0) {
        start = text.slice(0, index).split("\n").length;
        end = start + focusedText.split("\n").length - 1;
      }
    }
    if (!start) start = 1;
    return { start, end: end ?? start };
  }, [agentFocus, text]);

  useEffect(() => {
    if (!focusRange) return;
    containerRef.current
      ?.querySelector(`[data-agent-line="${focusRange.start}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusRange]);

  if (!language) {
    return (
      <pre
        data-testid="file-content-viewer-plain"
        className="h-full w-full overflow-auto whitespace-pre-wrap break-words bg-[#181818] p-4 text-xs leading-5 text-[#f0f3f6] custom-scrollbar-always"
      >
        {text}
      </pre>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="file-content-viewer-highlighted"
      data-language={language}
      className="h-full w-full overflow-auto bg-[#181818] text-[#f0f3f6] custom-scrollbar-always"
    >
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        wrapLongLines={false}
        // Override the theme's hard-coded background so the highlighter
        // blends with the right-pane chrome instead of painting a slab
        // of a slightly-different dark color.
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "transparent",
          fontSize: "0.75rem",
          lineHeight: "1.25rem",
          minHeight: "100%",
        }}
        codeTagProps={{
          style: {
            background: "transparent",
            color: "#f0f3f6",
            fontFamily: "inherit",
          },
        }}
        lineNumberStyle={{
          color: "var(--oh-border)",
          minWidth: "2.5em",
          paddingRight: "1em",
          userSelect: "none",
        }}
        lineProps={(lineNumber: number) => ({
          "data-agent-line": lineNumber,
          style:
            focusRange &&
            lineNumber >= focusRange.start &&
            lineNumber <= focusRange.end
              ? {
                  display: "block",
                  background: "rgba(59, 130, 246, 0.20)",
                  borderLeft: "2px solid #60a5fa",
                  marginLeft: "-2px",
                }
              : { display: "block" },
        })}
      >
        {text}
      </SyntaxHighlighter>
    </div>
  );
}
