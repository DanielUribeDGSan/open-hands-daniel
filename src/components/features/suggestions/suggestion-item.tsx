import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import TachometerFastIcon from "#/icons/tachometer-fast.svg?react";
import PrStatusIcon from "#/icons/pr-status.svg?react";
import DocumentIcon from "#/icons/document.svg?react";
import WaterIcon from "#/icons/u-water.svg?react";

export type Suggestion = { label: I18nKey | string; value: string };

interface SuggestionItemProps {
  suggestion: Suggestion;
  onClick: (value: string) => void;
}

export function SuggestionItem({ suggestion, onClick }: SuggestionItemProps) {
  const { t } = useTranslation("openhands");
  const label = t(suggestion.label);

  const itemIcon = useMemo(() => {
    switch (suggestion.label) {
      case "INCREASE_TEST_COVERAGE":
        return <TachometerFastIcon width={22} height={22} color="#fff" />;
      case "AUTO_MERGE_PRS":
        return <PrStatusIcon width={17} height={18} color="#fff" />;
      case "FIX_README":
        return <DocumentIcon width={22} height={22} color="#fff" />;
      case "CLEAN_DEPENDENCIES":
        return <WaterIcon width={22} height={22} color="#fff" />;
      default:
        return null;
    }
  }, [suggestion]);

  return (
    <button
      type="button"
      title={label}
      className="flex min-h-[48px] min-w-0 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-[15px] border border-[var(--oh-border)] px-3 py-2.5 transition-colors hover:border-[var(--oh-interactive-hover)] hover:bg-surface-raised sm:min-h-[55px] sm:gap-2.5 sm:px-4"
      onClick={() => onClick(suggestion.value)}
    >
      <span className="shrink-0" aria-hidden>
        {itemIcon}
      </span>
      <span
        data-testid="suggestion"
        className="min-w-0 flex-1 cursor-pointer text-left text-sm font-normal leading-snug text-white sm:text-center sm:text-[15px] sm:leading-5"
      >
        {label}
      </span>
    </button>
  );
}
