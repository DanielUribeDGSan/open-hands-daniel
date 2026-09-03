import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Suggestions } from "#/components/features/suggestions/suggestions";
import { I18nKey } from "#/i18n/declaration";
import { SUGGESTIONS } from "#/utils/suggestions";
import { useConversationStore } from "#/stores/conversation-store";

interface ChatSuggestionsProps {
  onSuggestionsClick: (value: string) => void;
}

export function ChatSuggestions({ onSuggestionsClick }: ChatSuggestionsProps) {
  const { t } = useTranslation("openhands");
  const { shouldHideSuggestions } = useConversationStore();

  return (
    <AnimatePresence>
      {!shouldHideSuggestions && (
        <motion.div
          data-testid="chat-suggestions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="pointer-events-auto absolute inset-x-3 top-0 bottom-[151px] flex min-h-0 flex-col overflow-y-auto overflow-x-hidden py-3 md:inset-x-6"
        >
          <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col items-center justify-center gap-4 sm:gap-6">
            <h2 className="w-full shrink-0 px-2 text-center text-2xl font-medium leading-tight text-white sm:text-[32px] sm:leading-[1.2]">
              {t(I18nKey.LANDING$TITLE)}
            </h2>
            <Suggestions
              suggestions={Object.entries(SUGGESTIONS.repo)
                .slice(0, 4)
                .map(([label, value]) => ({
                  label,
                  value,
                }))}
              onSuggestionClick={onSuggestionsClick}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
