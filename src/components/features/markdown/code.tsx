import React from "react";
import { ExtraProps } from "react-markdown";
import { cn } from "#/utils/utils";
import { CodexCodeCard } from "./codex-code-card";

// See https://github.com/remarkjs/react-markdown?tab=readme-ov-file#use-custom-components-syntax-highlight

/**
 * Component to render code blocks in markdown.
 */
export function code({
  children,
  className,
}: React.ClassAttributes<HTMLElement> &
  React.HTMLAttributes<HTMLElement> &
  ExtraProps) {
  const match = /language-(\w+)/.exec(className || ""); // get the language
  const codeString = String(children).replace(/\n$/, "");

  if (!match) {
    const isMultiline = String(children).includes("\n");

    if (!isMultiline) {
      return (
        <code
          className={cn(
            className,
            "rounded-md border border-[#3a3a3a] bg-[#2d2d2d] px-[0.4em] py-[0.15em] text-[0.9em] text-[#e8e8e8]",
          )}
        >
          {children}
        </code>
      );
    }

    return <CodexCodeCard code={codeString} wrapLongLines />;
  }

  return (
    <CodexCodeCard code={codeString} language={match[1]} wrapLongLines />
  );
}
