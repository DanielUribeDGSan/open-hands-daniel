import React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FolderTree, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "#/utils/utils";
import { useClickOutsideElement } from "#/hooks/use-click-outside-element";
import { I18nKey } from "#/i18n/declaration";

interface FloatingTreeIslandProps {
  /** Accessible name for the island control. */
  label: string;
  /** Short count chip, e.g. "4". */
  count?: number | string;
  /** Panel title when expanded. */
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
  testId?: string;
  /** When set, shows a control to leave the filtered change-set tree. */
  onShowAllFiles?: () => void;
  showAllLabel?: string;
}

/**
 * Apple-style floating island: compact glass pill that expands into a file
 * tree popover so the editor can stay full-bleed.
 */
export function FloatingTreeIsland({
  label,
  count,
  title = label,
  open,
  onOpenChange,
  children,
  className,
  testId = "floating-tree-island",
  onShowAllFiles,
  showAllLabel,
}: FloatingTreeIslandProps) {
  const { t } = useTranslation("openhands");
  const reduceMotion = useReducedMotion();
  const rootRef = useClickOutsideElement<HTMLDivElement>(() => {
    if (open) onOpenChange(false);
  });
  const resolvedShowAllLabel =
    showAllLabel ?? t(I18nKey.FILES$SHOW_ALL_PROJECT);

  return (
    <div
      ref={rootRef}
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-5 z-30 flex flex-col items-center",
        className,
      )}
      data-testid={testId}
    >
      <div className="relative flex w-full max-w-[min(320px,calc(100%-2rem))] flex-col items-center">
        <AnimatePresence>
          {open ? (
            <motion.div
              key="island-panel"
              role="dialog"
              aria-label={title}
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 16, scale: 0.88, filter: "blur(8px)" }
              }
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, y: 12, scale: 0.92, filter: "blur(5px)" }
              }
              transition={{
                type: "spring",
                stiffness: 440,
                damping: 34,
                mass: 0.65,
              }}
              className={cn(
                "pointer-events-auto mb-3 flex max-h-[min(58vh,440px)] w-full flex-col overflow-hidden",
                "rounded-[26px] border border-white/[0.12]",
                "bg-[var(--oh-panel-chrome)]/95 backdrop-blur-2xl",
                "shadow-[0_22px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]",
              )}
              data-testid={`${testId}-panel`}
            >
              <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.08] px-3.5 py-2.5">
                <span className="flex size-7 items-center justify-center rounded-full bg-white/10">
                  <FolderTree
                    className="size-3.5 text-white/85"
                    aria-hidden
                    strokeWidth={2}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold tracking-tight text-white">
                    {title}
                  </div>
                </div>
                {count != null ? (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white/80">
                    {count}
                  </span>
                ) : null}
                {onShowAllFiles ? (
                  <button
                    type="button"
                    onClick={onShowAllFiles}
                    data-testid={`${testId}-show-all`}
                    className="cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {resolvedShowAllLabel}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label={t(I18nKey.FILES$HIDE_FILE_TREE)}
                  className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5 custom-scrollbar">
                {children}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Soft bloom under the pill — Dynamic Island ambient */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 h-10 w-[70%] rounded-full",
            "bg-white/10 blur-2xl transition-opacity duration-300",
            open ? "opacity-40" : "opacity-25",
          )}
        />

        <motion.button
          type="button"
          layout
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          aria-label={label}
          data-testid={`${testId}-trigger`}
          className={cn(
            "pointer-events-auto relative inline-flex h-12 cursor-pointer items-center gap-2.5",
            "rounded-full border border-white/14 px-2 pr-4",
            "bg-[var(--oh-panel-chrome)]/95 backdrop-blur-xl",
            "shadow-[0_12px_36px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)]",
            "text-white transition-[background-color,box-shadow] duration-200",
            "hover:bg-[var(--oh-panel-chrome)] hover:shadow-[0_14px_40px_rgba(0,0,0,0.5)]",
            open && "bg-[var(--oh-panel-chrome)]",
          )}
          whileHover={reduceMotion ? undefined : { scale: 1.03 }}
          whileTap={reduceMotion ? undefined : { scale: 0.96 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
        >
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              "bg-gradient-to-b from-white/18 to-white/6",
              "ring-1 ring-white/15",
            )}
          >
            <FolderTree className="size-3.5" aria-hidden strokeWidth={2.25} />
          </span>
          <span className="text-[13px] font-medium tracking-tight">
            {title}
          </span>
          {count != null ? (
            <span className="rounded-full bg-white/12 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white/85">
              {count}
            </span>
          ) : null}
          <motion.span
            aria-hidden
            className="ml-0.5 size-1.5 rounded-full bg-emerald-400/90"
            animate={
              reduceMotion
                ? undefined
                : { opacity: [0.45, 1, 0.45], scale: [0.9, 1.1, 0.9] }
            }
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.button>
      </div>
    </div>
  );
}
