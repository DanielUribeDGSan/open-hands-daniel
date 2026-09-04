import { useEffect, useMemo, useRef } from "react";

import { highlightSourceLines } from "#/utils/highlight-source-lines";
import { getPrismLanguageForFile } from "#/utils/file-language";
import type { AgentFileFocus } from "#/stores/files-tab-store";
import { cn } from "#/utils/utils";

interface HighlightedSourceViewProps {
  path: string;
  text: string;
  mimeType?: string;
  agentFocus?: AgentFileFocus | null;
}

/**
 * Renders workspace text with Prism/refractor token colors. Uses full-file
 * highlighting (and Astro/HTML script-aware coloring) so JS keywords/strings
 * aren't left plain white.
 */
export function HighlightedSourceView({
  path,
  text,
  mimeType,
  agentFocus,
}: HighlightedSourceViewProps) {
  const language = getPrismLanguageForFile(path, mimeType);
  const containerRef = useRef<HTMLDivElement>(null);
  const lines = useMemo(
    () => highlightSourceLines(text, language),
    [text, language],
  );

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
    const plainLines = highlightSourceLines(text, null);
    return (
      <div
        data-testid="file-content-viewer-plain"
        className="oh-prism h-full w-full overflow-auto bg-[#181818] text-[#d4d4d4] custom-scrollbar-always"
      >
        <table className="w-full min-w-full border-collapse p-4 text-xs leading-5">
          <tbody>
            {plainLines.map((html, index) => (
              <tr key={index + 1}>
                <td className="select-none whitespace-nowrap px-3 py-0 text-right align-top text-[var(--oh-border)]">
                  {index + 1}
                </td>
                <td
                  className="w-full whitespace-pre-wrap px-3 py-0 align-top"
                  dangerouslySetInnerHTML={{
                    __html: html && html.length > 0 ? html : " ",
                  }}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="file-content-viewer-highlighted"
      data-language={language}
      className="oh-prism h-full w-full overflow-auto bg-[#181818] text-[#d4d4d4] custom-scrollbar-always"
    >
      <table className="w-full min-w-full border-collapse p-4 text-xs leading-5">
        <tbody>
          {lines.map((html, index) => {
            const lineNumber = index + 1;
            const focused =
              focusRange &&
              lineNumber >= focusRange.start &&
              lineNumber <= focusRange.end;
            return (
              <tr
                key={lineNumber}
                data-agent-line={lineNumber}
                className={cn(
                  focused &&
                    "border-l-2 border-l-[#60a5fa] bg-[rgba(59,130,246,0.20)]",
                )}
              >
                <td className="select-none whitespace-nowrap px-3 py-0 text-right align-top text-[var(--oh-border)]">
                  {lineNumber}
                </td>
                <td
                  className="w-full whitespace-pre-wrap px-3 py-0 align-top"
                  dangerouslySetInnerHTML={{
                    __html: html && html.length > 0 ? html : " ",
                  }}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
