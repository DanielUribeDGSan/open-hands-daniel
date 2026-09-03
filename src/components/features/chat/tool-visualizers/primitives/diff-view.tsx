import React from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { SyntaxHighlighter } from "#/components/features/markdown/syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type DiffRow = {
  type: "add" | "del" | "ctx";
  text: string;
  oldLine?: number;
  newLine?: number;
};

/** Lines of unchanged context kept on each side of a change. */
const CONTEXT = 3;
/** Max rendered rows before the view is truncated. */
const MAX_ROWS = 300;
/** Above this `old x new` line product we skip the O(n*m) LCS and show a
 *  wholesale replacement instead, so a full-file rewrite can't blow up. */
const LCS_CELL_BUDGET = 250_000;

const lcsDiff = (a: string[], b: string[]): DiffRow[] => {
  if (a.length * b.length > LCS_CELL_BUDGET) {
    return [
      ...a.map((text): DiffRow => ({ type: "del", text })),
      ...b.map((text): DiffRow => ({ type: "add", text })),
    ];
  }
  const n = a.length;
  const m = b.length;
  const lcs: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ type: "ctx", text: a[i] });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ type: "del", text: a[i] });
      i += 1;
    } else {
      rows.push({ type: "add", text: b[j] });
      j += 1;
    }
  }
  while (i < n) {
    rows.push({ type: "del", text: a[i] });
    i += 1;
  }
  while (j < m) {
    rows.push({ type: "add", text: b[j] });
    j += 1;
  }
  return rows;
};

/**
 * Computes a unified line diff. Common leading/trailing lines are trimmed (with
 * a few kept as context) so a localized edit inside a large file stays small
 * and cheap to diff.
 */
export const computeLineDiff = (
  oldText: string,
  newText: string,
): DiffRow[] => {
  const a = oldText.split("\n");
  const b = newText.split("\n");

  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo += 1;
  let hiA = a.length;
  let hiB = b.length;
  while (hiA > lo && hiB > lo && a[hiA - 1] === b[hiB - 1]) {
    hiA -= 1;
    hiB -= 1;
  }

  const lead = a.slice(Math.max(0, lo - CONTEXT), lo);
  const trail = a.slice(hiA, Math.min(a.length, hiA + CONTEXT));

  const startLine = Math.max(0, lo - CONTEXT) + 1;
  let oldLine = startLine;
  let newLine = startLine;
  return [
    ...lead.map((text): DiffRow => ({ type: "ctx", text })),
    ...lcsDiff(a.slice(lo, hiA), b.slice(lo, hiB)),
    ...trail.map((text): DiffRow => ({ type: "ctx", text })),
  ].map((row) => {
    const numbered = {
      ...row,
      oldLine: row.type === "add" ? undefined : oldLine,
      newLine: row.type === "del" ? undefined : newLine,
    };
    if (row.type !== "add") oldLine += 1;
    if (row.type !== "del") newLine += 1;
    return numbered;
  });
};

// Background + gutter only — avoid forcing text color so Prism / VS Code
// token colors (keywords, strings, tags…) stay visible on each line.
const ROW_STYLE: Record<DiffRow["type"], string> = {
  add: "bg-[#10291f] border-l-[#2ea043]",
  del: "bg-[#2d1719] border-l-[#f85149]",
  ctx: "border-l-transparent",
};
const ROW_PREFIX: Record<DiffRow["type"], string> = {
  add: "+ ",
  del: "- ",
  ctx: "  ",
};

/**
 * Unified before/after line diff for file edits.
 */
export function DiffView({
  oldText,
  newText,
  language,
}: {
  oldText: string;
  newText: string;
  language?: string;
}) {
  const { t } = useTranslation("openhands");
  const rows = computeLineDiff(oldText, newText);
  const truncated = rows.length > MAX_ROWS;
  const shown = truncated ? rows.slice(0, MAX_ROWS) : rows;

  return (
    <div className="flex flex-col gap-1">
      <div className="overflow-auto rounded-lg border border-[#303030] bg-[#181818] font-mono text-xs shadow-inner">
        {shown.map((row, index) => (
          <div
            // Diff rows have no stable id and lines may repeat, so the index
            // within this render is the only available key.
            key={`${index}-${row.type}`}
            className={cn(
              "grid min-h-6 grid-cols-[3.25rem_3.25rem_1fr] border-l-2 leading-6",
              ROW_STYLE[row.type],
            )}
          >
            <span className="select-none border-r border-[#21262d] px-2 text-right text-[#6e7681]">
              {row.oldLine ?? ""}
            </span>
            <span className="select-none border-r border-[#30363d] px-2 text-right text-[#6e7681]">
              {row.newLine ?? ""}
            </span>
            <code className="flex min-w-0 whitespace-pre-wrap px-3 text-[12px]">
              <span className="mr-2 inline-block w-2 select-none text-[#8b949e] opacity-80">
                {ROW_PREFIX[row.type].trim()}
              </span>
              {language ? (
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  PreTag="span"
                  CodeTag="span"
                  customStyle={{
                    margin: 0,
                    padding: 0,
                    background: "transparent",
                    whiteSpace: "pre-wrap",
                    overflow: "visible",
                  }}
                  codeTagProps={{ style: { background: "transparent" } }}
                >
                  {row.text || " "}
                </SyntaxHighlighter>
              ) : (
                <span className="text-[#e6edf3]">{row.text || " "}</span>
              )}
            </code>
          </div>
        ))}
      </div>
      {truncated && (
        <span className="text-xs text-muted">
          {t(I18nKey.COMMON$TRUNCATED)}
        </span>
      )}
    </div>
  );
}
