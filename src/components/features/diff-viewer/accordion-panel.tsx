import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "#/utils/utils";

const ACCORDION_TRANSITION = {
  duration: 0.2,
  ease: "easeInOut" as const,
};

interface AccordionPanelProps {
  open: boolean;
  children: ReactNode;
  testId?: string;
  className?: string;
  /**
   * When true, the open panel fills remaining flex height instead of sizing
   * to content (`height: auto`). Needed for Review tree + diff to stretch
   * with the right drawer / monitor height.
   */
  fill?: boolean;
}

/**
 * Height/opacity expand-collapse wrapper for Diffs / Commits accordion rows.
 * Honors prefers-reduced-motion by skipping animation.
 */
export function AccordionPanel({
  open,
  children,
  testId,
  className,
  fill = false,
}: AccordionPanelProps) {
  const reduceMotion = useReducedMotion();

  if (fill) {
    return open ? (
      <div
        data-testid={testId}
        className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      >
        {children}
      </div>
    ) : null;
  }

  if (reduceMotion) {
    return open ? (
      <div data-testid={testId} className={className}>
        {children}
      </div>
    ) : null;
  }

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          key="accordion-panel"
          data-testid={testId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={ACCORDION_TRANSITION}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
