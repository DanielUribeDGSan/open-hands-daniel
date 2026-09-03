import { SuggestionItem, type Suggestion } from "./suggestion-item";

interface SuggestionsProps {
  suggestions: Suggestion[];
  onSuggestionClick: (value: string) => void;
}

export function Suggestions({
  suggestions,
  onSuggestionClick,
}: SuggestionsProps) {
  return (
    <div
      data-testid="suggestions"
      className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:gap-4"
    >
      {suggestions.map((suggestion, index) => (
        <SuggestionItem
          key={index}
          suggestion={suggestion}
          onClick={onSuggestionClick}
        />
      ))}
    </div>
  );
}
