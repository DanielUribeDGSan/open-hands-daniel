import { refractor } from "refractor";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

import javascript from "refractor/javascript";
import typescript from "refractor/typescript";
import jsx from "refractor/jsx";
import tsx from "refractor/tsx";
import markup from "refractor/markup";
import css from "refractor/css";
import json from "refractor/json";
import bash from "refractor/bash";
import python from "refractor/python";
import yaml from "refractor/yaml";
import markdown from "refractor/markdown";
import diff from "refractor/diff";
import sql from "refractor/sql";
import go from "refractor/go";
import rust from "refractor/rust";
import java from "refractor/java";
import ruby from "refractor/ruby";
import php from "refractor/php";
import scss from "refractor/scss";
import toml from "refractor/toml";

type RefractorSyntax = Parameters<typeof refractor.register>[0];

const LANGUAGE_MODULES: Record<string, RefractorSyntax> = {
  javascript,
  typescript,
  jsx,
  tsx,
  markup,
  css,
  json,
  bash,
  python,
  yaml,
  markdown,
  diff,
  sql,
  go,
  rust,
  java,
  ruby,
  php,
  scss,
  toml,
};

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  ts: "typescript",
  ets: "typescript",
  etsx: "tsx",
  html: "markup",
  htm: "markup",
  xml: "markup",
  svg: "markup",
  astro: "markup",
  vue: "markup",
  svelte: "markup",
  yml: "yaml",
  sh: "bash",
  zsh: "bash",
  py: "python",
  md: "markdown",
  rs: "rust",
};

const registered = new Set<string>();

function ensureLanguage(name: string): string | null {
  const resolved = LANGUAGE_ALIASES[name] ?? name;
  if (registered.has(resolved)) return resolved;
  const mod = LANGUAGE_MODULES[resolved];
  if (!mod) return registered.has(resolved) ? resolved : null;
  try {
    refractor.register(mod);
    registered.add(resolved);
    return resolved;
  } catch {
    // Already registered by a dependency (e.g. jsx pulls javascript).
    registered.add(resolved);
    return resolved;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Lightweight coloring when Prism/refractor yields no tokens (ArkTS, etc.). */
function highlightLineHeuristic(line: string): string {
  const parts: { kind: "text" | "comment" | "string" | "keyword" | "number" | "function"; value: string }[] =
    [];
  let i = 0;
  const push = (
    kind: (typeof parts)[number]["kind"],
    value: string,
  ) => {
    if (value) parts.push({ kind, value });
  };

  while (i < line.length) {
    if (line.startsWith("//", i)) {
      push("comment", line.slice(i));
      break;
    }
    const ch = line[i];
    if (ch === "'" || ch === '"' || ch === "`") {
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      push("string", line.slice(i, j));
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch) && (i === 0 || /[^\w$]/.test(line[i - 1] ?? ""))) {
      let j = i + 1;
      while (j < line.length && /[0-9._]/.test(line[j]!)) j += 1;
      push("number", line.slice(i, j));
      i = j;
      continue;
    }
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$]/.test(line[j]!)) j += 1;
      const word = line.slice(i, j);
      const nextNonSpace = line.slice(j).match(/^\s*/)?.[0].length ?? 0;
      const after = line[j + nextNonSpace];
      const KEYWORDS =
        /^(if|else|const|let|var|function|return|this|new|class|import|export|from|async|await|true|false|null|undefined|for|while|switch|case|break|continue|typeof|instanceof|void|type|interface|extends|implements|public|private|protected|static|override|get|set|as|in|of|try|catch|finally|throw|keyof|readonly|struct|enum)$/;
      if (KEYWORDS.test(word)) {
        push("keyword", word);
      } else if (after === "(") {
        push("function", word);
      } else {
        push("text", word);
      }
      i = j;
      continue;
    }
    push("text", ch);
    i += 1;
  }

  return parts
    .map(({ kind, value }) => {
      const escaped = escapeHtml(value);
      if (kind === "text") return escaped;
      return `<span class="token ${kind}">${escaped}</span>`;
    })
    .join("");
}

function hastToHtml(node: Root | RootContent | ElementContent): string {
  if (node.type === "text") {
    return escapeHtml((node as Text).value);
  }
  if (node.type === "root") {
    return ((node as Root).children ?? []).map(hastToHtml).join("");
  }
  if (node.type === "element") {
    const el = node as Element;
    const classes = (el.properties?.className as string[] | undefined) ?? [];
    const kids = (el.children ?? []).map(hastToHtml).join("");
    if (classes.length === 0) return kids;
    return `<span class="${classes.join(" ")}">${kids}</span>`;
  }
  return "";
}

/**
 * Split highlighted HTML on newline characters that sit outside of tags,
 * so token `<span>` wrappers stay balanced per line.
 */
export function splitHighlightedHtml(html: string): string[] {
  const lines: string[] = [];
  let current = "";
  for (let i = 0; i < html.length; i += 1) {
    const ch = html[i];
    if (ch === "<") {
      const close = html.indexOf(">", i);
      if (close === -1) {
        current += html.slice(i);
        break;
      }
      current += html.slice(i, close + 1);
      i = close;
      continue;
    }
    if (ch === "\n") {
      lines.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  lines.push(current);
  return lines;
}

function highlightPlain(code: string): string[] {
  return code.split("\n").map(highlightLineHeuristic);
}

function linesHaveTokens(lines: string[]): boolean {
  return lines.some((line) => line.includes('class="token'));
}

function highlightWithGrammar(code: string, language: string): string[] {
  const resolved = ensureLanguage(language);
  if (!resolved) return highlightPlain(code);

  try {
    const tree = refractor.highlight(code, resolved);
    const lines = splitHighlightedHtml(hastToHtml(tree));
    if (linesHaveTokens(lines)) return lines;
  } catch {
    // Full-file parse can fail on ArkTS / odd syntax — try per line below.
  }

  // Per-line Prism, then heuristic if still uncolored.
  return code.split("\n").map((line) => {
    try {
      const tree = refractor.highlight(line, resolved);
      const html = hastToHtml(tree);
      if (html.includes('class="token')) return html;
    } catch {
      /* fall through */
    }
    return highlightLineHeuristic(line);
  });
}

/**
 * Astro / HTML-like files: color markup tags, and color `<script>` bodies
 * (and `---` frontmatter) as JavaScript / TypeScript so JS isn't left white.
 */
function highlightMixedMarkupLines(code: string): string[] {
  ensureLanguage("markup");
  ensureLanguage("javascript");
  ensureLanguage("typescript");

  const lines = code.split("\n");
  const out: string[] = [];
  let inScript = false;
  let inFrontmatter = false;
  let scriptIsTs = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      out.push(escapeHtml(line));
      continue;
    }

    if (!inScript && /<script\b/i.test(line)) {
      scriptIsTs = /lang\s*=\s*["']?(ts|typescript)/i.test(line);
      const closesSameLine = /<\/script>/i.test(line);
      const htmlLines = highlightWithGrammar(line, "markup");
      out.push(htmlLines[0] ?? escapeHtml(line));
      inScript = !closesSameLine;
      continue;
    }

    if (inScript) {
      if (/<\/script>/i.test(line)) {
        inScript = false;
        const htmlLines = highlightWithGrammar(line, "markup");
        out.push(htmlLines[0] ?? escapeHtml(line));
        continue;
      }
      const lang = scriptIsTs ? "typescript" : "javascript";
      const htmlLines = highlightWithGrammar(line, lang);
      out.push(htmlLines[0] ?? escapeHtml(line));
      continue;
    }

    if (inFrontmatter) {
      const htmlLines = highlightWithGrammar(line, "typescript");
      out.push(htmlLines[0] ?? escapeHtml(line));
      continue;
    }

    const htmlLines = highlightWithGrammar(line, "markup");
    out.push(htmlLines[0] ?? escapeHtml(line));
  }

  return out;
}

/**
 * Highlight an entire source string and return one HTML fragment per line
 * (token `<span class="token …">` wrappers). Prefer this over highlighting
 * each diff row in isolation — Prism needs surrounding context for JS.
 */
export function highlightSourceLines(
  code: string,
  language?: string | null,
): string[] {
  if (!language) {
    // Still color strings/keywords so unknown extensions aren't plain white.
    return highlightPlain(code);
  }
  const resolved = LANGUAGE_ALIASES[language] ?? language;
  if (resolved === "markup") {
    return highlightMixedMarkupLines(code);
  }
  return highlightWithGrammar(code, resolved);
}
